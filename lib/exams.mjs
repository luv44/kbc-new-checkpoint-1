import path from 'node:path';
import { readJson } from './util.mjs';

export function loadExams(root) {
  const data = readJson(path.join(root, 'data/exams.json'), { exams: [] });
  return (data.exams || []).map((exam) => ({ ...exam, subjects: exam.subjects }));
}

export function examById(exams, id) {
  return exams.find((exam) => exam.id === id) || exams[0];
}

export function examIncludesSubject(exam, subjectId) {
  return !exam || exam.subjects === 'all' || (Array.isArray(exam.subjects) && exam.subjects.includes(subjectId));
}
