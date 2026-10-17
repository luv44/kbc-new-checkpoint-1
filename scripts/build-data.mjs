#!/usr/bin/env node
/**
 * Build the shippable data pack.
 *
 *   public/data/catalog.json          counts + per-topic question counts
 *   public/data/starter.json(.gz)     active bank = verified base + generated
 *   public/data/preserved-bank.json   archive with SI-unit questions removed
 *   public/data/si-unit-mcqs.json/.md SI questions converted to four-option MCQs
 *   public/data/syllabus-index.json   exam → subject → chapter → topic coverage
 *   deliverables/Ollama_40/...        per-exam chapter files (40 questions/topic)
 *   data/reports/data-report.json     measured counts + SI removal ledger
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadCorpus, questionsByTopic } from '../lib/catalog.mjs';
import { examIncludesSubject } from '../lib/exams.mjs';
import { classifySI, isSIQuestion } from '../lib/si.mjs';
import { hashId, hasDevanagari, norm, readJson, readJsonAuto, sha256File, splitBilingual, truncate, writeJson } from '../lib/util.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public/data');
const TARGET = 40;

const gzipSibling = (file) => {
  if (fs.existsSync(file)) fs.writeFileSync(`${file}.gz`, zlib.gzipSync(fs.readFileSync(file), { level: 9 }));
};

export function generatedQuestions(root = ROOT) {
  const dir = path.join(root, 'data/generated');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (file === 'progress.json' || !file.endsWith('.json.gz')) continue;
    const data = readJsonAuto(path.join(dir, file.replace(/\.gz$/, '')), { questions: [] });
    if (Array.isArray(data.questions)) out.push(...data.questions);
  }
  return out;
}

function sourceFields(question, corpus) {
  const card = corpus.factByTopic.get(question.topicId);
  const sourceIds = question.sourceIds?.length ? question.sourceIds : card?.sourceIds || [];
  const source = sourceIds.map((id) => corpus.sources.get(id)).find(Boolean);
  return {
    ...question,
    sourceIds,
    sourceUrl: question.sourceUrl || source?.url || '',
    publisher: question.publisher || source?.publisher || '',
    factCardIds: question.factCardIds?.length ? question.factCardIds : card?.id ? [card.id] : [],
  };
}

function dedupe(questions) {
  const ids = new Set();
  const stems = new Set();
  const out = [];
  for (const question of questions) {
    if (!question?.id || !question?.question?.en) continue;
    const stem = `${question.topicId || ''}|${norm(question.question.en)}`;
    if (ids.has(question.id) || stems.has(stem)) continue;
    ids.add(question.id);
    stems.add(stem);
    out.push(question);
  }
  return out;
}

export function buildActive(corpus, generated) {
  const base = corpus.starter.questions.map((question) => sourceFields(question, corpus));
  return dedupe([...base, ...generated.map((question) => sourceFields(question, corpus))])
    .sort((a, b) => `${a.subjectId}|${a.chapterId}|${a.topicId}|${a.id}`.localeCompare(`${b.subjectId}|${b.chapterId}|${b.topicId}|${b.id}`));
}

/* ------------------------------------------------------------------ marks */

function markdownPreserved(corpus) {
  const questions = [];
  const files = [
    { file: 'HARAPPAN_400_QUESTIONS.md', prefix: 'PRES-HAR', chapterId: 'S03-Cf57dd5c3', defaultTopic: 'S03-Cf57dd5c3-T160839f2' },
    { file: 'PREHISTORY_200_QUESTIONS.md', prefix: 'PRES-PRE', chapterId: 'S03-Cf57dd5c3', defaultTopic: 'S03-Cf57dd5c3-T80b6a594' },
  ];
  const routes = [
    [/(chronolog|period|date|phase|stage)/i, 'T160839f2'],
    [/(site|bath|dock|granary|citadel|town|city|urban)/i, 'T45a487ce'],
    [/(seal|script|weight|craft|bead|potter|metallurg)/i, 'T9f2b0316'],
    [/(trade|agri|econom|regional|network|resource)/i, 'Tf30465e3'],
    [/(religion|burial|belief|decline|conserv|ritual)/i, 'T650d525d'],
    [/(art|architect|sculpt|paint|archaeolog|excavat)/i, 'T80b6a594'],
  ];
  for (const spec of files) {
    const file = path.join(corpus.root, spec.file);
    if (!fs.existsSync(file)) continue;
    const blocks = fs.readFileSync(file, 'utf8').split(/\n### /).slice(1);
    for (const block of blocks) {
      const heading = block.split('\n')[0];
      const en = (block.match(/\*\*English:\*\*\s*([\s\S]*?)\n/) || [])[1];
      const hi = (block.match(/\*\*हिंदी:\*\*\s*([\s\S]*?)\n/) || [])[1];
      const optionLines = [...block.matchAll(/^- \*\*[A-D]\.\*\*\s*(.+)$/gm)].map((match) => match[1].trim());
      const answer = (block.match(/\*\*Answer:\*\*\s*([A-D])\./) || [])[1];
      const explanation = (block.match(/\*\*Explanation:\*\*\s*([\s\S]*?)(?:\n\n|$)/) || [])[1] || '';
      if (!en || !hi || optionLines.length !== 4 || !answer) continue;
      const options = optionLines.map((line) => {
        const [left, right] = splitBilingual(line);
        return { en: left.trim(), hi: right.trim() };
      });
      const [expEn, expHi] = splitBilingual(explanation.replace(/\s+/g, ' ').trim());
      const number = (heading.match(/Q(\d+)/) || [])[1] || String(questions.length + 1);
      const route = routes.find(([pattern]) => pattern.test(heading));
      const topicId = route ? `${spec.chapterId}-${route[1]}` : spec.defaultTopic;
      const topic = corpus.topics.get(topicId) || corpus.topics.get(spec.defaultTopic);
      if (!topic) continue;
      questions.push({
        id: `${spec.prefix}-${number.padStart(4, '0')}`,
        subjectId: topic.subjectId,
        chapterId: topic.chapterId,
        topicId: topic.id,
        conceptIds: topic.concepts[0] ? [topic.concepts[0].id] : [],
        question: { en: en.replace(/\s+/g, ' ').trim(), hi: hi.replace(/\s+/g, ' ').trim() },
        options,
        correctIndex: 'ABCD'.indexOf(answer),
        difficulty: 'MEDIUM',
        angle: 'FACT_RECALL',
        explanation: { en: expEn, hi: expHi },
        detailedExplanation: { en: expEn, hi: expHi },
        memoryCue: { en: `Revise “${topic.en}”.`, hi: `“${topic.hi}” का पुनरावलोकन करें।` },
        sourceIds: [],
        sourceUrl: '',
        publisher: 'Checkpoint archive',
        factCardIds: topic.factCardIds || [],
        fingerprint: hashId(`${spec.prefix}-${number}`),
        lifecycle: 'VERIFIED',
        dynamic: false,
        validUntil: null,
        kind: 'CHECKPOINT_ARCHIVE',
      });
    }
  }
  return questions;
}

function legacyPreserved(corpus) {
  const out = [];
  for (const name of ['CORE_QUESTION_BANK', 'EXAM_READY_QUESTION_BANK']) {
    const file = path.join(corpus.root, 'data/questions', `${name}.json`);
    const data = readJson(file, null);
    if (!data) continue;
    const list = Array.isArray(data) ? data : data.questions || [];
    for (const raw of list) {
      const topicId = raw.topicId || raw.topic_id;
      const topic = corpus.topics.get(topicId);
      if (!topic || !raw.question) continue;
      const question = typeof raw.question === 'string' ? { en: raw.question, hi: raw.questionHindi || raw.question } : raw.question;
      const options = (raw.options || []).map((option, index) => {
        if (typeof option === 'string') return { en: option, hi: raw.optionsHindi?.[index] || option };
        return { en: option.en || option.text || '', hi: option.hi || option.en || option.text || '' };
      });
      if (options.length !== 4 || !Number.isInteger(raw.correctIndex)) continue;
      out.push({
        id: `PRES-LEG-${raw.id || out.length + 1}`,
        subjectId: topic.subjectId,
        chapterId: topic.chapterId,
        topicId: topic.id,
        conceptIds: [],
        question,
        options,
        correctIndex: raw.correctIndex,
        difficulty: raw.difficulty || 'MEDIUM',
        angle: raw.angle || 'FACT_RECALL',
        explanation: raw.explanation || { en: '', hi: '' },
        detailedExplanation: raw.explanation || { en: '', hi: '' },
        memoryCue: { en: '', hi: '' },
        sourceIds: raw.sourceIds || [],
        sourceUrl: raw.sourceUrl || '',
        publisher: raw.publisher || 'Legacy bank',
        factCardIds: raw.factCardIds || [],
        fingerprint: hashId(`leg-${raw.id || out.length}`),
        lifecycle: 'VERIFIED',
        dynamic: false,
        validUntil: null,
        kind: 'LEGACY_BANK',
      });
    }
  }
  return out;
}

function compact(question) {
  return {
    id: question.id, subjectId: question.subjectId, chapterId: question.chapterId, topicId: question.topicId,
    conceptIds: question.conceptIds || [], question: question.question, options: question.options,
    correctIndex: question.correctIndex, difficulty: question.difficulty, angle: question.angle,
    explanation: question.explanation, sourceIds: question.sourceIds || [], sourceUrl: question.sourceUrl || '',
    publisher: question.publisher || '', factCardIds: question.factCardIds || [], lifecycle: question.lifecycle,
    dynamic: question.dynamic, validUntil: question.validUntil, kind: question.kind,
  };
}

export function buildPreserved(corpus) {
  const base = corpus.starter.questions.map((question) => sourceFields(question, corpus));
  const markdown = markdownPreserved(corpus).map((question) => sourceFields(question, corpus));
  const legacy = legacyPreserved(corpus).map((question) => sourceFields(question, corpus));
  const externalFile = path.join(corpus.root, 'data/preserved-bank.json');
  const external = (readJson(externalFile, { questions: [] }).questions || []).map((question) => sourceFields(question, corpus));
  const candidates = dedupe([...base, ...markdown, ...legacy, ...external]);
  const removed = candidates.filter(isSIQuestion);
  const kept = candidates.filter((question) => !isSIQuestion(question)).map(compact);
  return {
    version: 1,
    builtAt: new Date().toISOString(),
    policy: 'SI_UNITS_EXCLUDED',
    counts: {
      questions: kept.length,
      candidates: candidates.length,
      external: external.length,
      removedSI: removed.length,
    },
    questions: kept,
    sources: corpus.starter.sources || [],
    factCards: corpus.starter.factCards || [],
    removedQuestions: removed,
    removedSI: removed.map((question) => ({ id: question.id, subjectId: question.subjectId, topicId: question.topicId, reason: classifySI(question) })),
  };
}

/* --------------------------------------------------------------------- SI */

const SI_UNITS = [
  ['metre (m)', 'मीटर (m)'], ['kilogram (kg)', 'किलोग्राम (kg)'], ['second (s)', 'सेकंड (s)'], ['ampere (A)', 'एम्पीयर (A)'],
  ['kelvin (K)', 'केल्विन (K)'], ['mole (mol)', 'मोल (mol)'], ['candela (cd)', 'कैंडेला (cd)'], ['newton (N)', 'न्यूटन (N)'],
  ['joule (J)', 'जूल (J)'], ['watt (W)', 'वाट (W)'], ['pascal (Pa)', 'पास्कल (Pa)'], ['hertz (Hz)', 'हर्ट्ज़ (Hz)'],
  ['coulomb (C)', 'कूलॉम (C)'], ['volt (V)', 'वोल्ट (V)'], ['ohm (Ω)', 'ओम (Ω)'], ['farad (F)', 'फैराड (F)'],
  ['tesla (T)', 'टेस्ला (T)'], ['weber (Wb)', 'वेबर (Wb)'], ['henry (H)', 'हेनरी (H)'], ['lumen (lm)', 'ल्यूमेन (lm)'],
  ['lux (lx)', 'लक्स (lx)'], ['becquerel (Bq)', 'बेकरल (Bq)'], ['gray (Gy)', 'ग्रे (Gy)'], ['sievert (Sv)', 'सीवर्ट (Sv)'],
  ['katal (kat)', 'कैटल (kat)'], ['radian (rad)', 'रेडियन (rad)'], ['steradian (sr)', 'स्टेरेडियन (sr)'],
];

function toMCQ(question, corpus, origin) {
  let options = Array.isArray(question.options) ? question.options.filter((option) => option?.en) : [];
  if (options.length !== 4) {
    const statement = corpus.factByTopic.get(question.topicId)?.canonicalStatement || question.question?.en || '';
    const hit = SI_UNITS.find(([en, hi]) => norm(statement).includes(norm(en.split(' ')[0])) || statement.includes(hi));
    if (!hit) return null;
    const others = SI_UNITS.filter(([en]) => en !== hit[0]).slice(0, 3);
    options = [hit, ...others].map(([en, hi]) => ({ en, hi }));
  }
  const correctIndex = Number(question.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;
  if (!question.question?.en) return null;
  const questionHi = hasDevanagari(question.question.hi) ? question.question.hi : question.question.en;
  const cleaned = options.map((option) => {
    const hi = option.hi || option.en;
    return { en: option.en, hi: hasDevanagari(hi) || !/[a-z]/i.test(hi) ? hi : option.en };
  });
  const topic = corpus.topics.get(question.topicId);
  const source = (question.sourceIds || []).map((id) => corpus.sources.get(id)).find(Boolean);
  return {
    id: `SI-${hashId(question.id, 12)}`,
    originalId: question.id,
    origin,
    removedFromPreserved: origin === 'PRESERVED',
    subjectId: 'S26',
    subject: { en: topic?.subject?.title || 'Metrology, SI Units & Standard Measures', hi: topic?.subject?.titleHindi || 'मापिकी, एसआई मात्रक एवं मानक माप' },
    chapterId: topic?.chapterId || question.chapterId || '',
    chapter: { en: topic?.chapter?.title || '', hi: topic?.chapter?.titleHindi || topic?.chapter?.title || '' },
    topicId: question.topicId,
    topic: { en: topic?.en || '', hi: topic?.hi || '' },
    question: { en: question.question.en, hi: questionHi },
    hindiFallback: !hasDevanagari(question.question.hi),
    options: cleaned,
    correctIndex,
    answer: cleaned[correctIndex],
    explanation: question.explanation || { en: '', hi: '' },
    sourceIds: question.sourceIds || [],
    sourceUrl: question.sourceUrl || source?.url || '',
    publisher: question.publisher || source?.publisher || '',
    layout: 'left-question-right-options',
    kind: 'SI_UNIT_MCQ',
    lifecycle: 'VERIFIED',
  };
}

export function buildSIUnit(corpus, active, removed) {
  const rows = [
    ...active.filter(isSIQuestion).map((question) => ({ question, origin: 'ACTIVE' })),
    ...removed.map((question) => ({ question, origin: 'PRESERVED' })),
  ];
  const questions = [];
  const seen = new Set();
  for (const { question, origin } of rows) {
    const mcq = toMCQ(question, corpus, origin);
    if (!mcq) continue;
    const key = `${mcq.topicId}|${norm(mcq.question.en)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(mcq);
  }
  questions.sort((a, b) => `${a.chapterId}|${a.topicId}|${a.id}`.localeCompare(`${b.chapterId}|${b.topicId}|${b.id}`));
  return {
    version: 1,
    builtAt: new Date().toISOString(),
    format: 'LEFT_QUESTION_RIGHT_OPTIONS',
    title: 'SI Unit MCQs / एसआई मात्रक बहुविकल्पीय प्रश्न',
    policy: 'Removed from the preserved bank; presented as four-option MCQs with the question on the left and options on the right.',
    counts: {
      questions: questions.length,
      convertedFromPreserved: questions.filter((question) => question.removedFromPreserved).length,
      topics: new Set(questions.map((question) => question.topicId)).size,
      chapters: new Set(questions.map((question) => question.chapterId)).size,
    },
    questions,
  };
}

/* ---------------------------------------------------------------- indexes */

export function buildSyllabusIndex(corpus, active) {
  const byTopic = questionsByTopic(active);
  const exams = corpus.exams.map((exam) => {
    const subjects = [];
    const topics = [];
    let questions = 0;
    for (const subject of corpus.subjects.values()) {
      if (!examIncludesSubject(exam, subject.id)) continue;
      const row = { id: subject.id, en: subject.title, hi: subject.titleHindi, chapters: [], topics: 0, questions: 0 };
      for (const chapter of subject.chapters) {
        const chapterRow = { id: chapter.id, en: chapter.title, hi: chapter.titleHindi, topicCount: 0, questions: 0 };
        for (const topic of corpus.topicsByChapter.get(chapter.id) || []) {
          const count = (byTopic.get(topic.id) || []).length;
          topics.push({
            id: topic.id, subjectId: subject.id, chapterId: chapter.id, en: topic.en, hi: topic.hi,
            subjectEn: subject.title, subjectHi: subject.titleHindi, chapterEn: chapter.title, chapterHi: chapter.titleHindi,
            questionCount: count, target: TARGET, status: count >= TARGET ? 'COMPLETE' : 'IN_PROGRESS',
          });
          chapterRow.topicCount += 1;
          chapterRow.questions += count;
          row.topics += 1;
          row.questions += count;
          questions += count;
        }
        row.chapters.push(chapterRow);
      }
      subjects.push(row);
    }
    return {
      id: exam.id, label: exam.label, en: exam.en, hi: exam.hi, note: exam.note, sourceUrl: exam.sourceUrl,
      subjects,
      topics,
      totals: {
        subjects: subjects.length,
        topics: topics.length,
        questions,
        target: topics.length * TARGET,
        complete: topics.filter((topic) => topic.questionCount >= TARGET).length,
        partial: 0,
        empty: topics.filter((topic) => topic.questionCount === 0).length,
      },
    };
  });
  return { version: 1, builtAt: new Date().toISOString(), target: TARGET, note: 'Coverage of each exam syllabus; every topic targets 40 questions.', exams };
}

function enrichCatalog(corpus, active) {
  const byTopic = questionsByTopic(active);
  const catalog = structuredClone(corpus.catalog);
  let total = 0;
  for (const subject of catalog.subjects) {
    let subjectCount = 0;
    for (const chapter of subject.chapters) {
      for (const topic of chapter.topics) {
        const count = (byTopic.get(topic.id) || []).length;
        topic.questionCount = count;
        subjectCount += count;
        total += count;
      }
    }
    subject.questionCount = subjectCount;
  }
  catalog.counts = { ...(catalog.counts || {}), questions: total, factCards: (corpus.starter.factCards || []).length, topics: corpus.topics.size, videos: 0 };
  catalog.builtAt = new Date().toISOString();
  catalog.generatedAt = new Date().toISOString();
  return catalog;
}

/* --------------------------------------------------------------- exports */

function chapterRecord(corpus, exam, subject, chapter, byTopic) {
  const topics = (corpus.topicsByChapter.get(chapter.id) || []).filter(() => examIncludesSubject(exam, subject.id));
  const questions = [];
  for (const topic of topics) {
    for (const question of byTopic.get(topic.id) || []) {
      questions.push({ id: question.id, topicId: topic.id, q: question.question, o: (question.options || []).map((option) => [option.en, option.hi]), a: question.correctIndex, e: question.explanation, s: question.sourceUrl || '' });
    }
  }
  return { topics, questions };
}

export function exportChapters(corpus, active) {
  const byTopic = questionsByTopic(active);
  const base = path.join(corpus.root, 'deliverables/Ollama_40');
  fs.rmSync(base, { recursive: true, force: true });
  let files = 0;
  let records = 0;
  for (const exam of corpus.exams) {
    for (const subject of corpus.subjects.values()) {
      if (!examIncludesSubject(exam, subject.id)) continue;
      for (const chapter of subject.chapters) {
        const { topics, questions } = chapterRecord(corpus, exam, subject, chapter, byTopic);
        if (!topics.length) continue;
        const dir = path.join(base, exam.id, subject.id);
        const payload = {
          generatedAt: new Date().toISOString(),
          exam: { id: exam.id, label: exam.label, en: exam.en, hi: exam.hi },
          subject: { id: subject.id, en: subject.title, hi: subject.titleHindi },
          chapter: { id: chapter.id, en: chapter.title, hi: chapter.titleHindi },
          targetPerTopic: TARGET,
          counts: { topics: topics.length, questions: questions.length },
          topics: topics.map((topic) => ({
            id: topic.id,
            title: { en: topic.en, hi: topic.hi },
            target: TARGET,
            status: (byTopic.get(topic.id)?.length || 0) >= TARGET ? 'COMPLETE' : 'IN_PROGRESS',
            questionIds: (byTopic.get(topic.id) || []).map((question) => question.id),
          })),
        };
        if (exam.id === 'all') payload.questions = questions;
        else payload.questionsFile = `../../all/${subject.id}/${chapter.id}.json`;
        writeJson(path.join(dir, `${chapter.id}.json`), payload);
        files += 1;
        records += questions.length;
      }
    }
  }
  writeJson(path.join(base, 'manifest.json'), {
    generatedAt: new Date().toISOString(),
    targetPerTopic: TARGET,
    exams: corpus.exams.map((exam) => ({ id: exam.id, en: exam.en, hi: exam.hi, subjects: exam.subjects === 'all' ? corpus.subjects.size : exam.subjects.length })),
    files,
    questionRecords: records,
  });
  return { files, questions: records };
}

/* ------------------------------------------------------------------ build */

export async function buildPublicData(corpus = loadCorpus(ROOT)) {
  const generated = generatedQuestions(corpus.root);
  const active = buildActive(corpus, generated);
  const preserved = buildPreserved(corpus);
  const si = buildSIUnit(corpus, active, preserved.removedQuestions);
  const syllabus = buildSyllabusIndex(corpus, active);

  fs.mkdirSync(PUBLIC, { recursive: true });
  writeJson(path.join(PUBLIC, 'starter.json'), {
    id: 'starter-2026-10-17',
    builtAt: new Date().toISOString(),
    questions: active.map(({ detailedExplanation, fingerprint, generator, grounding, verifiedAt, validFrom, publisher, ...rest }) => rest),
    factCards: corpus.starter.factCards || [],
    sources: corpus.starter.sources || [],
  });
  const starterFile = path.join(PUBLIC, 'starter.json');
  const catalog = enrichCatalog(corpus, active);
  const pack = {
    id: 'starter',
    title: '345-Topic Bilingual Question Bank',
    subjectId: 'ALL',
    url: '/data/starter.json',
    sha256: sha256File(starterFile),
    size: fs.statSync(starterFile).size,
    questionCount: active.length,
    version: '2.0.0',
  };
  const starterPack = (catalog.packs || []).find((item) => item.id === 'starter');
  if (starterPack) Object.assign(starterPack, pack);
  else catalog.packs = [...(catalog.packs || []), pack];

  writeJson(path.join(PUBLIC, 'catalog.json'), catalog);
  writeJson(path.join(PUBLIC, 'preserved-bank.json'), { ...preserved, removedQuestions: undefined, removedSI: preserved.removedSI });
  writeJson(path.join(PUBLIC, 'si-unit-mcqs.json'), si);
  writeJson(path.join(PUBLIC, 'syllabus-index.json'), syllabus);
  fs.writeFileSync(path.join(PUBLIC, 'si-unit-mcqs.md'), renderSI(si));

  for (const name of ['starter.json', 'catalog.json', 'preserved-bank.json', 'si-unit-mcqs.json', 'syllabus-index.json']) gzipSibling(path.join(PUBLIC, name));

  const report = {
    builtAt: new Date().toISOString(),
    baseQuestions: corpus.starter.questions.length,
    generatedQuestions: generated.length,
    activeQuestions: active.length,
    perTopic: {
      target: TARGET,
      topics: corpus.topics.size,
      topicsAtTarget: [...corpus.topics.keys()].filter((id) => (questionsByTopic(active).get(id) || []).length >= TARGET).length,
      min: Math.min(...[...corpus.topics.keys()].map((id) => (questionsByTopic(active).get(id) || []).length)),
      max: Math.max(...[...corpus.topics.keys()].map((id) => (questionsByTopic(active).get(id) || []).length)),
    },
    preserved: preserved.counts,
    siUnit: si.counts,
    exams: syllabus.exams.map((exam) => ({ id: exam.id, topics: exam.totals.topics, questions: exam.totals.questions, complete: exam.totals.complete })),
  };
  writeJson(path.join(corpus.root, 'data/reports/data-report.json'), report);
  return { active, preserved, si, syllabus, report };
}

function mdCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function renderSI(si) {
  const lines = [
    '# SI Unit MCQs — left-assigned format / एसआई मात्रक बहुविकल्पीय प्रश्न',
    '',
    `Built: ${si.builtAt} · ${si.counts.questions} questions · ${si.counts.convertedFromPreserved} converted from the preserved bank.`,
    '',
    'Each row places the question on the left and the four options on the right. The answer follows the row.',
    '',
  ];
  let topic = '';
  si.questions.forEach((question, index) => {
    if (question.topicId !== topic) {
      topic = question.topicId;
      lines.push('', `## ${question.subject.en} → ${question.chapter.en} → ${question.topic.en}`, '', `**${question.topic.en} / ${question.topic.hi}**`, '');
    }
    const options = question.options.map((option, i) => `**${'ABCD'[i]}.** ${mdCell(option.en)}<br>${mdCell(option.hi)}`).join('<br>');
    lines.push(
      `### Q${index + 1}`,
      '',
      '| Question / प्रश्न (left) | Options / विकल्प (right) |',
      '| --- | --- |',
      `| **EN:** ${mdCell(question.question.en)}<br>**HI:** ${mdCell(question.question.hi)} | ${options} |`,
      '',
      `**Answer / उत्तर:** **${'ABCD'[question.correctIndex]}.** ${mdCell(question.answer.en)} / ${mdCell(question.answer.hi)}`,
      '',
      question.explanation?.en ? `**Explanation / व्याख्या:** ${mdCell(question.explanation.en)} / ${mdCell(question.explanation.hi)}` : '',
      '',
    );
  });
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const corpus = loadCorpus(ROOT);
  const built = await buildPublicData(corpus);
  const exported = exportChapters(corpus, built.active);
  console.log(`Built ${built.active.length} active questions; preserved ${built.preserved.counts.questions} (removed ${built.preserved.counts.removedSI} SI); SI MCQs ${built.si.counts.questions}.`);
  console.log(`Exported ${exported.files} chapter files (${exported.questions} question records).`);
}
