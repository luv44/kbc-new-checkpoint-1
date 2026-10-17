import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { isSIQuestion } from '../lib/si.mjs';
import { readJson } from '../lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readJson(path.join(ROOT, 'public/data', name));

test('catalogue keeps 26 subjects, 82 chapters and 345 topics', () => {
  const catalog = read('catalog.json');
  assert.equal(catalog.subjects.length, 26);
  assert.equal(catalog.subjects.reduce((sum, subject) => sum + subject.chapters.length, 0), 82);
  assert.equal(catalog.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics)).length, 345);
});

test('every topic carries exactly 40 active questions', () => {
  const catalog = read('catalog.json');
  const starter = read('starter.json');
  const perTopic = new Map();
  for (const question of starter.questions) perTopic.set(question.topicId, (perTopic.get(question.topicId) || 0) + 1);
  for (const subject of catalog.subjects) for (const chapter of subject.chapters) for (const topic of chapter.topics) {
    assert.equal(perTopic.get(topic.id), 40, topic.id);
  }
});

test('preserved bank has no SI question and every row is a four-option MCQ', () => {
  const preserved = read('preserved-bank.json');
  assert.equal(preserved.policy, 'SI_UNITS_EXCLUDED');
  assert.equal(preserved.questions.filter(isSIQuestion).length, 0);
  for (const question of preserved.questions) {
    assert.equal(question.options.length, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
  }
});

test('every SI question is converted to a left/right MCQ', () => {
  const starter = read('starter.json');
  const si = read('si-unit-mcqs.json');
  const converted = new Set(si.questions.map((q) => q.originalId));
  const targets = starter.questions.filter(isSIQuestion);
  assert.ok(targets.length >= 400);
  assert.equal(targets.filter((q) => !converted.has(q.id)).length, 0);
  for (const question of si.questions) assert.equal(question.layout, 'left-question-right-options');
});

test('syllabus index covers all ten exam profiles', () => {
  const index = read('syllabus-index.json');
  assert.equal(index.exams.length, 10);
  for (const exam of index.exams) assert.equal(exam.totals.questions, exam.totals.target);
});

test('no question stem is a bare external link', () => {
  for (const name of ['starter.json', 'preserved-bank.json', 'si-unit-mcqs.json']) {
    for (const question of read(name).questions) {
      assert.doesNotMatch(question.question.en.trim(), /^(https?:\/\/|www\.)/i, `${name}:${question.id}`);
    }
  }
});
