#!/usr/bin/env node
/** Acceptance checks; exits non-zero when any check fails. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSIQuestion } from '../lib/si.mjs';
import { readJson } from '../lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public/data');
const TARGET = 40;
const checks = [];
const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail });

const catalog = readJson(path.join(PUBLIC, 'catalog.json'));
const starter = readJson(path.join(PUBLIC, 'starter.json'), { questions: [] });
const preserved = readJson(path.join(PUBLIC, 'preserved-bank.json'), { questions: [] });
const si = readJson(path.join(PUBLIC, 'si-unit-mcqs.json'), { questions: [] });
const syllabus = readJson(path.join(PUBLIC, 'syllabus-index.json'), { exams: [] });

const topics = catalog.subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.topics));
const questions = starter.questions || [];
const archived = preserved.questions || [];
const siQuestions = si.questions || [];

const perTopic = new Map();
for (const question of questions) perTopic.set(question.topicId, (perTopic.get(question.topicId) || 0) + 1);
const off = topics.filter((topic) => perTopic.get(topic.id) !== TARGET);
add('40 active questions per topic', topics.length === 345 && off.length === 0, `${topics.length} topics, ${off.length} off target`);

const bad = questions.filter((q) => !Array.isArray(q.options) || q.options.length !== 4 || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3 || !q.question?.en || !q.question?.hi);
add('four options + answer key + bilingual stems', bad.length === 0, `${bad.length} malformed of ${questions.length}`);
add('no duplicate question ids', new Set(questions.map((q) => q.id)).size === questions.length, `${questions.length - new Set(questions.map((q) => q.id)).size} duplicates`);

const links = [...questions, ...archived, ...siQuestions].filter((q) => /^\s*(https?:\/\/|www\.)/i.test(q.question?.en || ''));
add('no link-only stems', links.length === 0, `${links.length} found`);

const preservedSI = archived.filter(isSIQuestion);
add('zero SI-unit questions in the preserved bank', preservedSI.length === 0, `${archived.length} records, ${preservedSI.length} SI remain`);

const targets = questions.filter(isSIQuestion);
const converted = new Set(siQuestions.map((q) => q.originalId));
const uncovered = targets.filter((q) => !converted.has(q.id));
const badLayout = siQuestions.filter((q) => q.layout !== 'left-question-right-options' || q.options.length !== 4);
add('every SI-unit question has a left/right MCQ', uncovered.length === 0 && badLayout.length === 0, `${targets.length} SI questions, ${siQuestions.length} MCQs, ${uncovered.length} uncovered`);

const examFolders = fs.existsSync(path.join(ROOT, 'deliverables/Ollama_40'))
  ? fs.readdirSync(path.join(ROOT, 'deliverables/Ollama_40')).filter((name) => fs.statSync(path.join(ROOT, 'deliverables/Ollama_40', name)).isDirectory())
  : [];
add('per-exam chapter exports exist', examFolders.length === 10, `${examFolders.length} exam folders`);

let exportIssues = 0;
for (const exam of examFolders) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json')) {
        const data = readJson(full, {});
        for (const topic of data.topics || []) {
          const count = Array.isArray(topic.questionIds) ? topic.questionIds.length : (topic.questions || []).length;
          if (count !== TARGET) exportIssues += 1;
        }
      }
    }
  };
  walk(path.join(ROOT, 'deliverables/Ollama_40', exam));
}
add('every exported topic carries 40 questions', exportIssues === 0, `${exportIssues} problems`);
add('syllabus index covers every exam', (syllabus.exams || []).length === 10, `${(syllabus.exams || []).length} profiles`);

const summary = {
  builtAt: new Date().toISOString(),
  counts: { active: questions.length, topics: topics.length, preserved: archived.length, removedSI: preserved.counts?.removedSI ?? 0, siMcqs: siQuestions.length, exams: syllabus.exams?.length ?? 0 },
  checks,
  passed: checks.every((check) => check.ok),
};
fs.mkdirSync(path.join(ROOT, 'data/reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/reports/validation.json'), `${JSON.stringify(summary, null, 2)}\n`);
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name} — ${check.detail}`);
console.log(`\n${summary.passed ? 'ALL CHECKS PASSED' : 'CHECKS FAILED'}`);
process.exit(summary.passed ? 0 : 1);
