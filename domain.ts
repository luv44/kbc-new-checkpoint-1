import type { ConceptProgress, LearningState, Question, SessionResult } from './types.ts';

export const DAY = 86_400_000;
export const initialState = (): LearningState => ({
  profile: { name: 'Learner', interests: [], exam: 'General knowledge', language: 'hi', onboarded: false, dailyGoal: 10 },
  attempts: [], progress: {}, bookmarks: [], wrongIds: [], results: [], videoEvents: [],
});

export function updateConcept(old: ConceptProgress | undefined, correct: boolean, confidence = 3, now = Date.now()): ConceptProgress {
  const p = old ?? { attempts: 0, correct: 0, consecutiveCorrect: 0, consecutiveWrong: 0, errors: 0, lastSeen: 0, due: 0, intervalDays: 0, confidence: 3, state: 'NEW' };
  const streak = correct ? p.consecutiveCorrect + 1 : 0;
  const wrong = correct ? 0 : p.consecutiveWrong + 1;
  // Low-confidence recall earns a short interval, even when the answer is right.
  const intervalDays = correct ? confidence < 3 ? 1 : Math.min(60, [1, 3, 7, 14, 30, 60][Math.min(streak - 1, 5)]) : 0;
  const state = !correct ? wrong >= 3 ? 'REPEATEDLY_WRONG' : 'WEAK' : streak >= 6 ? 'MASTERED' : streak >= 4 ? 'STRONG' : streak >= 2 ? 'STABLE' : 'LEARNING';
  return { attempts: p.attempts + 1, correct: p.correct + Number(correct), consecutiveCorrect: streak, consecutiveWrong: wrong, errors: p.errors + Number(!correct), lastSeen: now, due: now + (correct ? intervalDays * DAY : 10 * 60_000), intervalDays, confidence, state };
}

export function recordAnswer(state: LearningState, question: Question, selected: number, elapsedMs: number, confidence: number, mode: string, now = Date.now()): LearningState {
  if (!Number.isInteger(selected) || selected < 0 || selected > 3) throw new Error('Choose one of four options.');
  const correct = selected === question.correctIndex;
  const progress = { ...state.progress };
  for (const id of question.conceptIds) progress[id] = updateConcept(progress[id], correct, confidence, now);
  const wrongIds = correct ? state.wrongIds.filter(id => id !== question.id) : [...new Set([...state.wrongIds, question.id])];
  return { ...state, progress, wrongIds, attempts: [...state.attempts, { id: `${question.id}:${now}:${state.attempts.length}`, questionId: question.id, subjectId: question.subjectId, topicId: question.topicId, selected, correct, at: now, elapsedMs: Math.max(0, elapsedMs), confidence, mode }] };
}

export function eligible(q: Question, now = Date.now()) {
  return q.lifecycle === 'VERIFIED'
    && (!q.validUntil || Date.parse(q.validUntil) > now)
    && (!q.validFrom || Date.parse(q.validFrom) <= now)
    && (!q.verifiedAt || Date.parse(q.verifiedAt) <= now)
    && (!q.dynamic || (!!q.validUntil && !!q.verifiedAt));
}

export function revisionQuestions(questions: Question[], state: LearningState, now = Date.now()) {
  const lastAnswered = new Map(state.attempts.map(a => [a.questionId, a.at]));
  return questions.filter(q => eligible(q, now) && q.conceptIds.some(id => state.progress[id]?.due <= now))
    .sort((a, b) => (lastAnswered.get(a.id) ?? 0) - (lastAnswered.get(b.id) ?? 0));
}

export function scoreSession(questions: Question[], answers: Record<string, number>, negativeMark: number) {
  const correct = questions.filter(q => answers[q.id] === q.correctIndex).length;
  const wrong = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correctIndex).length;
  return { correct, wrong, unanswered: questions.length - correct - wrong, score: correct - wrong * Math.max(0, negativeMark), accuracy: correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0 };
}

export function toggleBookmark(state: LearningState, id: string): LearningState {
  return { ...state, bookmarks: state.bookmarks.includes(id) ? state.bookmarks.filter(x => x !== id) : [...state.bookmarks, id] };
}

export function validateBackup(value: unknown): value is LearningState {
  if (!value || typeof value !== 'object') return false;
  const s = value as LearningState;
  return !!s.profile && typeof s.profile.onboarded === 'boolean' && typeof s.profile.name === 'string' && s.profile.name.length <= 80
    && ['en', 'hi', 'hinglish'].includes(s.profile.language) && Array.isArray(s.profile.interests)
    && s.profile.interests.every(x => typeof x === 'string') && typeof s.profile.exam === 'string'
    && Number.isInteger(s.profile.dailyGoal) && s.profile.dailyGoal > 0 && s.profile.dailyGoal <= 100
    && Array.isArray(s.attempts) && s.attempts.every(a => a && typeof a.id === 'string' && typeof a.questionId === 'string' && typeof a.topicId === 'string' && typeof a.subjectId === 'string' && typeof a.mode === 'string' && typeof a.correct === 'boolean' && Number.isFinite(a.at) && Number.isFinite(a.elapsedMs) && a.elapsedMs >= 0 && Number.isInteger(a.selected) && a.selected >= 0 && a.selected < 4 && [1, 2, 3, 4, 5].includes(a.confidence))
    && Array.isArray(s.bookmarks) && s.bookmarks.every(x => typeof x === 'string')
    && Array.isArray(s.wrongIds) && s.wrongIds.every(x => typeof x === 'string')
    && !!s.progress && !Array.isArray(s.progress) && typeof s.progress === 'object' && Object.values(s.progress).every(p => p && ['NEW', 'LEARNING', 'WEAK', 'REPEATEDLY_WRONG', 'STABLE', 'STRONG', 'MASTERED', 'REVIEW_DUE'].includes(p.state) && [p.due, p.correct, p.attempts, p.lastSeen, p.errors, p.consecutiveCorrect, p.consecutiveWrong, p.intervalDays].every(n => Number.isFinite(n) && n >= 0) && p.attempts >= p.correct && [1, 2, 3, 4, 5].includes(p.confidence))
    && Array.isArray(s.results) && s.results.every((r: SessionResult) => r && typeof r.id === 'string' && typeof r.mode === 'string' && Array.isArray(r.questionIds) && r.questionIds.every(id => typeof id === 'string') && Number.isFinite(r.score) && Number.isFinite(r.at) && Number.isFinite(r.elapsedMs) && Number.isFinite(r.negativeMark) && r.negativeMark >= 0 && r.total === r.questionIds.length && Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= r.total && !!r.answers && !Array.isArray(r.answers) && Object.entries(r.answers).every(([id, answer]) => r.questionIds.includes(id) && Number.isInteger(answer) && answer >= 0 && answer < 4))
    && Array.isArray(s.videoEvents) && s.videoEvents.every(e => e && typeof e.videoId === 'string' && typeof e.milestone === 'string' && Number.isFinite(e.at));
}

// Targeted retries and topic checks must not restore an unrelated unfinished run.
export function sessionKey(mode: string, query: string) {
  const params = new URLSearchParams(query);
  params.sort();
  return `cr-session-${mode}${params.size ? `:${params.toString()}` : ''}`;
}

export function searchMatch(query: string, ...values: (string | undefined)[]) {
  const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const haystack = normalize(values.filter((v): v is string => Boolean(v)).join(' '));
  return normalize(query).trim().split(/\s+/).every(word => haystack.includes(word));
}
