import examData from '../data/exams.json';
import type { Catalog, Question, Subject } from './types';

/** Exam study outlines. Data lives in data/exams.json so the Node pipeline reads the same slices. */
export interface Exam {
  id: string;
  en: string;
  hi: string;
  label: string;
  subjects: 'all' | string[];
  note: { en: string; hi: string };
  sourceUrl: string;
}

export const exams: Exam[] = examData.exams as Exam[];
const examById = new Map(exams.map((exam) => [exam.id, exam]));

export function getExam(examId: string): Exam {
  return examById.get(examId) ?? examById.get('all')!;
}

export function examIncludesSubject(examId: string, subjectId: string): boolean {
  const exam = getExam(examId);
  return exam.subjects === 'all' || exam.subjects.includes(subjectId);
}

export function examCatalog(catalog: Catalog, examId: string): Subject[] {
  const exam = getExam(examId);
  if (exam.subjects === 'all') return catalog.subjects;
  const allowed = new Set(exam.subjects);
  return catalog.subjects
    .filter((subject) => allowed.has(subject.id))
    .map((subject) => ({ ...subject, chapters: subject.chapters.map((chapter) => ({ ...chapter, topics: [...chapter.topics] })) }));
}

export function examQuestion(question: Pick<Question, 'subjectId'>, examId: string): boolean {
  return examIncludesSubject(examId, question.subjectId);
}

export function examTopicIds(catalog: Catalog, examId: string): string[] {
  return examCatalog(catalog, examId).flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.topics.map((topic) => topic.id)));
}
