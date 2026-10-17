export type Language = 'en' | 'hi' | 'hinglish';
export type Localized = { en: string; hi: string; hinglish?: string };
export type ConceptState = 'NEW' | 'LEARNING' | 'WEAK' | 'REPEATEDLY_WRONG' | 'STABLE' | 'STRONG' | 'MASTERED' | 'REVIEW_DUE';
export interface Question {
  id: string; subjectId: string; chapterId: string; topicId: string; conceptIds: string[];
  question: Localized; options: Localized[]; correctIndex: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'; angle: string;
  explanation: Localized; detailedExplanation: Localized; wrongReasons: Localized[];
  memoryCue: Localized; factCardIds: string[]; sourceIds: string[];
  fingerprint: string; lifecycle: string; qualityScore: number;
  dynamic: boolean; validUntil: string | null; validFrom?: string | null; verifiedAt?: string; kind: string;
}
export interface FactCard {
  id: string; topicId: string; canonicalStatement: string; canonicalStatementHindi: string;
  conceptIds: string[]; sourceIds: string[]; evidence: { sourceId: string; quote: string; locator: string }[];
  verifiedAt: string; lifecycle: string; validUntil: string | null;
}
export interface Source { id: string; title: string; url: string; publisher: string; retrievedAt: string; license: string }
export interface Topic {
  id: string; title: string; titleHindi?: string; subjectId: string; chapterId: string;
  concepts: { id: string; title: string }[]; questionCount: number; factCardIds: string[];
  videoLessonId: string; videoStatus: string; visualType: string;
}
export interface Chapter { id: string; title: string; titleHindi?: string; topics: Topic[] }
export interface Subject { id: string; title: string; shortTitle: string; titleHindi: string; color: string; chapters: Chapter[]; questionCount: number }
export interface PackMeta { id: string; title: string; subjectId: string; chapterId?: string; url: string; sha256: string; size: number; questionCount: number; version: string }
export interface Pack { id: string; questions: Question[]; factCards: FactCard[]; sources: Source[] }
export interface Catalog { version: string; subjects: Subject[]; packs: PackMeta[]; counts: { questions: number; factCards: number; topics: number; videos: number }; builtAt: string }
export interface ConceptProgress { attempts: number; correct: number; consecutiveCorrect: number; consecutiveWrong: number; errors: number; lastSeen: number; due: number; intervalDays: number; confidence: number; state: ConceptState }
export interface Attempt { id: string; questionId: string; topicId: string; subjectId: string; correct: boolean; selected: number; at: number; elapsedMs: number; confidence: number; mode: string }
export interface SessionResult { id: string; mode: string; at: number; questionIds: string[]; answers: Record<string, number>; correct: number; total: number; score: number; elapsedMs: number; negativeMark: number }
export interface Profile { name: string; interests: string[]; exam: string; language: Language; onboarded: boolean; dailyGoal: number }
export interface LearningState { profile: Profile; attempts: Attempt[]; progress: Record<string, ConceptProgress>; bookmarks: string[]; wrongIds: string[]; results: SessionResult[]; videoEvents: { videoId: string; milestone: string; at: number }[] }
export interface Lesson {
  videoId: string; topicId: string; status: string; targetDurationSec: number;
  narrationHindi: string; factCardIds: string[]; learningObjectives: string[];
  scenes: { startSec: number; endSec: number; factCardIds: string[]; narration: string }[];
  media?: { url: string; sha256: string; size: number; poster: string; subtitlePath: string; transcriptPath: string };
  validUntil: string | null;
}
