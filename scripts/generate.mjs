#!/usr/bin/env node
/**
 * Resumable 40-questions-per-topic generator.
 *
 *   node scripts/generate.mjs --engine offline --target 40
 *   node scripts/generate.mjs --engine ollama --model gemma3:4b --target 40
 *   node scripts/generate.mjs --engine auto  --target 40
 *
 * Progress is checkpointed per topic in data/generated/<topicId>.json.gz and
 * summarised in data/generated/progress.json, so an interrupted run resumes
 * exactly where it stopped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorpus, questionsByTopic } from '../lib/catalog.mjs';
import { examIncludesSubject } from '../lib/exams.mjs';
import { generateTopicQuestions } from '../lib/gen.mjs';
import { readJsonAuto, writeJson, writeJsonGz } from '../lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = path.join(ROOT, 'data/generated');
const PROGRESS = path.join(GENERATED, 'progress.json');
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

function parseArgs(argv) {
  const args = { engine: 'auto', model: 'gemma3:4b', target: 40, build: true };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = () => argv[++i];
    switch (key) {
      case '--engine': args.engine = value(); break;
      case '--model': args.model = value(); break;
      case '--target': args.target = Number(value()); break;
      case '--subject': args.subject = value(); break;
      case '--chapter': args.chapter = value(); break;
      case '--topic': args.topic = value(); break;
      case '--exam': args.exam = value(); break;
      case '--limit': args.limit = Number(value()); break;
      case '--force': args.force = true; break;
      case '--no-build': args.build = false; break;
      default: break;
    }
  }
  return args;
}

const topicFile = (id) => path.join(GENERATED, `${id}.json.gz`);
const loadGenerated = (id) => readJsonAuto(path.join(GENERATED, `${id}.json`), { topicId: id, questions: [] }).questions || [];

function poolsFor(corpus, topic) {
  const chapterTopics = (corpus.topicsByChapter.get(topic.chapterId) || []).filter((item) => item.id !== topic.id);
  const subjectTopics = [...corpus.topics.values()].filter((item) => item.subjectId === topic.subjectId && item.id !== topic.id);
  const chapterSiblings = chapterTopics.map((item) => item.id);
  const subjectChapters = [...corpus.chapters.values()].filter((item) => item.subjectId === topic.subjectId && item.id !== topic.chapterId).map((item) => item.id);
  const otherSubjects = [...corpus.subjects.values()].filter((item) => item.id !== topic.subjectId);
  const numericPool = new Set();
  for (const item of [topic, ...chapterTopics, ...subjectTopics]) {
    for (const concept of item.concepts) {
      for (const match of concept.en.matchAll(/\b\d[\d,]*(?:\.\d+)?\s?%?/g)) {
        const token = match[0].replace(/[,\s]+$/, '');
        if (token.length >= 2) numericPool.add(token);
      }
    }
  }
  return { topics: corpus.topics, chapterTopics, subjectTopics, chapterSiblings, subjectChapters, otherSubjects, numericPool: [...numericPool].slice(0, 120) };
}

async function ollamaReachable() {
  try {
    const response = await fetch(`${OLLAMA.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ollamaTopic(groups, { topic, model, want }) {
  const questions = [];
  for (let round = 0; round < 12 && questions.length < want; round += 1) {
    const conceptLines = topic.concepts.map((concept) => `- ${concept.en} || ${concept.hi}`).join('\n');
    const prompt = `You write bilingual (English + Hindi) multiple-choice questions for Indian competitive exams.
Topic: ${topic.en}
Topic in Hindi: ${topic.hi}
Key concepts (English || Hindi):
${conceptLines}

Write ${Math.min(4, want - questions.length)} NEW questions. Rules:
- exactly 4 options, exactly one correct (correctIndex 0-3), bilingual question and options
- vary the correct answer position
- use only the facts in the concept list above; never invent numbers
- options must be distinct and plausible
Return JSON {"questions":[{"question":{"en":"","hi":""},"options":[{"en":"","hi":""}],"correctIndex":0,"difficulty":"EASY|MEDIUM|HARD","explanation":{"en":"","hi":""}}]}`;
    try {
      const response = await fetch(`${OLLAMA.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(180000),
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          options: { temperature: 0.6 },
          messages: [
            { role: 'system', content: 'You output only valid JSON. Never mention the syllabus or the prompt.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`ollama HTTP ${response.status}`);
      const payload = await response.json();
      const text = payload?.message?.content || '{}';
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      for (const raw of parsed.questions || []) {
        if (!raw?.question?.en || !raw?.question?.hi || !Array.isArray(raw.options) || raw.options.length !== 4) continue;
        if (!Number.isInteger(raw.correctIndex) || raw.correctIndex < 0 || raw.correctIndex > 3) continue;
        const optionText = raw.options.map((option) => `${option.en} ${option.hi}`).join(' ');
        if (!topic.concepts.some((concept) => optionText.includes(concept.en.slice(0, 24)))) continue; // grounding
        questions.push(raw);
      }
    } catch (error) {
      console.warn(`  ollama round failed for ${topic.id}: ${error.message}`);
      break;
    }
  }
  return questions.map((raw, index) => ({
    id: `O_${topic.id}_${String(index + 1).padStart(3, '0')}`,
    subjectId: topic.subjectId,
    chapterId: topic.chapterId,
    topicId: topic.id,
    conceptIds: [],
    question: raw.question,
    options: raw.options,
    correctIndex: raw.correctIndex,
    difficulty: raw.difficulty || 'MEDIUM',
    angle: 'FACT_RECALL',
    explanation: raw.explanation || { en: '', hi: '' },
    detailedExplanation: raw.explanation || { en: '', hi: '' },
    memoryCue: { en: `Revise “${topic.en}”.`, hi: `“${topic.hi}” का पुनरावलोकन करें।` },
    factCardIds: [],
    sourceIds: [],
    sourceUrl: '',
    lifecycle: 'VERIFIED',
    kind: 'OLLAMA',
    generator: `ollama:${model}`,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const corpus = loadCorpus(ROOT);
  let topics = [...corpus.topics.values()];
  if (args.topic) topics = topics.filter((topic) => topic.id === args.topic);
  if (args.subject) topics = topics.filter((topic) => topic.subjectId === args.subject);
  if (args.chapter) topics = topics.filter((topic) => topic.chapterId === args.chapter);
  if (args.exam) {
    const exam = corpus.exams.find((item) => item.id === args.exam);
    if (exam) topics = topics.filter((topic) => examIncludesSubject(exam, topic.subjectId));
  }
  if (args.limit) topics = topics.slice(0, args.limit);

  let engine = args.engine;
  if (engine === 'auto') engine = (await ollamaReachable()) ? 'ollama' : 'offline';
  if (engine === 'ollama' && !(await ollamaReachable())) {
    console.error(`Ollama is not reachable at ${OLLAMA}. Install it and run "ollama pull ${args.model}", or use --engine offline.`);
    process.exit(1);
  }
  console.log(`Engine: ${engine}; target ${args.target} per topic; ${topics.length} topic(s).`);

  fs.mkdirSync(GENERATED, { recursive: true });
  const started = Date.now();
  let added = 0;
  let done = 0;

  for (const topic of topics) {
    const existing = args.force ? [] : loadGenerated(topic.id);
    const base = corpus.starter.questions.filter((question) => question.topicId === topic.id).length;
    const want = Math.max(0, args.target - base - existing.length);
    let produced = [];
    if (want > 0) {
      if (engine === 'ollama') {
        produced = await ollamaTopic(null, { topic, model: args.model, want });
      } else {
        produced = generateTopicQuestions({
          topic,
          fact: corpus.factByTopic.get(topic.id),
          sourceUrl: '',
          pools: poolsFor(corpus, topic),
          existing,
          count: want,
          startIndex: existing.length,
        });
      }
    }
    const questions = [...existing, ...produced];
    writeJsonGz(topicFile(topic.id), {
      topicId: topic.id,
      subjectId: topic.subjectId,
      chapterId: topic.chapterId,
      title: { en: topic.en, hi: topic.hi },
      engine,
      generator: engine === 'ollama' ? `ollama:${args.model}` : 'offline-fact-v2',
      updatedAt: new Date().toISOString(),
      questions,
    });
    added += produced.length;
    done += 1;
    if (base + questions.length >= args.target) process.stdout.write(`\r[${done}/${topics.length}] ${topic.id} ${base + questions.length}/${args.target} (+${produced.length})   `);
    else process.stdout.write(`\r[${done}/${topics.length}] ${topic.id} ${base + questions.length}/${args.target} (+${produced.length})   `);
  }
  process.stdout.write('\n');

  const atTarget = topics.filter((topic) => {
    const base = corpus.starter.questions.filter((question) => question.topicId === topic.id).length;
    return base + loadGenerated(topic.id).length >= args.target;
  }).length;

  writeJson(PROGRESS, {
    updatedAt: new Date().toISOString(),
    engine,
    model: engine === 'ollama' ? args.model : null,
    target: args.target,
    topics: topics.length,
    complete: atTarget,
    addedThisRun: added,
    elapsedSeconds: Math.round((Date.now() - started) / 1000),
    totals: {
      starter: corpus.starter.questions.length,
      generated: { questions: [...corpus.topics.keys()].reduce((sum, id) => sum + loadGenerated(id).length, 0), topics: [...corpus.topics.keys()].filter((id) => loadGenerated(id).length).length },
    },
  });
  console.log(`Done: +${added} questions; ${atTarget}/${topics.length} topics at target.`);

  if (args.build) {
    const { buildPublicData, exportChapters } = await import('./build-data.mjs');
    const built = await buildPublicData(corpus);
    const exported = exportChapters(corpus, built.active);
    console.log(`Public data rebuilt: ${built.active.questions.length} active questions, ${built.preserved.counts.questions} preserved, ${built.si.questions.length} SI MCQs.`);
    console.log(`Chapter exports: ${exported.files} files, ${exported.questions} question records.`);
  }
}

main().catch((error) => {
  console.error(`\nGeneration stopped: ${error.message}`);
  process.exitCode = 1;
});
