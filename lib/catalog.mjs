import path from 'node:path';
import { loadExams } from './exams.mjs';
import { cleanConcept, hasDevanagari, readJson, readJsonAuto } from './util.mjs';

/**
 * Load the catalogue, the verified starter bank and every lookup the pipeline
 * needs. Hindi is taken from `titleHindi` when it is real Devanagari text and
 * otherwise falls back to English so a question is never blank.
 */
export function loadCorpus(root) {
  const catalog = readJson(path.join(root, 'data/base/catalog.base.json'));
  const starter = readJsonAuto(path.join(root, 'data/base/starter.base.json'), { questions: [], factCards: [], sources: [] });
  const exams = loadExams(root);

  const subjects = new Map();
  const chapters = new Map();
  const topics = new Map();
  const topicsByChapter = new Map();

  for (const subject of catalog.subjects) {
    subjects.set(subject.id, subject);
    for (const chapter of subject.chapters) {
      chapters.set(chapter.id, { ...chapter, subjectId: subject.id, subject });
      const bucket = [];
      for (const topic of chapter.topics) {
        const concepts = (topic.concepts || []).map((concept, index) => {
          const en = cleanConcept(concept.title || concept.summary || '');
          const hiRaw = concept.titleHindi || concept.summaryHindi || '';
          const hi = hasDevanagari(hiRaw) && hiRaw.trim() !== en ? hiRaw.trim() : en;
          return { id: concept.id || `c_${topic.id}_${index}`, en, hi };
        }).filter((concept) => concept.en.length > 2);
        const view = {
          id: topic.id,
          subjectId: subject.id,
          chapterId: chapter.id,
          en: topic.title,
          hi: hasDevanagari(topic.titleHindi) && topic.titleHindi !== topic.title ? topic.titleHindi : topic.title,
          concepts,
          factCardIds: topic.factCardIds || [],
          questionCount: topic.questionCount || 0,
          subject,
          chapter: chapters.get(chapter.id),
          visualType: topic.visualType,
        };
        topics.set(topic.id, view);
        bucket.push(view);
      }
      topicsByChapter.set(chapter.id, bucket);
    }
  }

  const factCards = new Map((starter.factCards || []).map((card) => [card.id, card]));
  const factByTopic = new Map();
  for (const card of starter.factCards || []) if (card.topicId) factByTopic.set(card.topicId, card);
  const sources = new Map((starter.sources || []).map((source) => [source.id, source]));

  return {
    root,
    catalog,
    starter,
    exams,
    subjects,
    chapters,
    topics,
    topicsByChapter,
    factCards,
    factByTopic,
    sources,
    counts: {
      subjects: subjects.size,
      chapters: chapters.size,
      topics: topics.size,
      starterQuestions: (starter.questions || []).length,
    },
  };
}

export function questionsByTopic(questions) {
  const map = new Map();
  for (const question of questions) {
    if (!map.has(question.topicId)) map.set(question.topicId, []);
    map.get(question.topicId).push(question);
  }
  return map;
}
