import { exams, examCatalog, examQuestion } from './exams';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bookmark, Check, CheckCircle2, Clock, Flag, Lightbulb, RotateCcw, ShieldCheck, Trophy, X } from './icons';
import { useStore } from './context';
import { DownloadLink, Empty, PageHeading, useText, Bilingual } from './components';
import { recordAnswer, revisionQuestions, scoreSession, toggleBookmark, sessionKey } from './domain';
import type { Question, SessionResult } from './types';

type Mode = 'practice' | 'mock' | 'challenge';
interface Run { id: string; ids: string[]; index: number; answers: Record<string, number>; started: number; deadline: number | null; mode: Mode; negative: number; finished: boolean; hintUsed: boolean; eliminateUsed: boolean; eliminated: number[]; hintFor: string | null }
const rank = { EASY: 0, MEDIUM: 1, HARD: 2, EXPERT: 3 };

export default function Practice({ mode = 'practice' }: { mode?: Mode }) {
  const { questions, state, catalog, update, toast } = useStore();
  const [params] = useSearchParams();
  const text = useText();
  const isHi = state.profile.language === 'hi';
  const exam = exams.some(e => e.id === state.profile.exam) ? state.profile.exam : 'all';
  const examSubjects = examCatalog(catalog, exam);
  const [subject, setSubject] = useState(params.get('subject') || 'all');
  const [chapter, setChapter] = useState('all');
  const [topic, setTopic] = useState(params.get('topic') || 'all');
  const [kind, setKind] = useState('all');
  const [count, setCount] = useState(Number(params.get('count')) || (mode === 'challenge' ? 15 : 10));
  const [minutes, setMinutes] = useState(mode === 'mock' ? 10 : 0);
  const [negative, setNegative] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [run, setRun] = useState<Run | null>(null);
  const [remaining, setRemaining] = useState(0);
  const questionStart = useRef(Date.now());
  const finishing = useRef(false);
  const locked = useRef(false);
  const persistedKey = sessionKey(mode, params.toString());

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(persistedKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Run;
        if (Array.isArray(parsed.ids) && parsed.ids.length && parsed.ids.every(id => questions.some(q => q.id === id)) && parsed.mode === mode && !parsed.finished) {
          setRun(parsed);
        }
      }
    } catch {
      toast(isHi ? 'पिछला सत्र पुनर्स्थापित नहीं हो सका। नया सत्र प्रारंभ करें।' : 'A previous session could not be restored. Start a fresh session.');
    }
  }, [persistedKey, mode, questions.length, isHi]);

  useEffect(() => {
    if (run) {
      try { sessionStorage.setItem(persistedKey, JSON.stringify(run)); }
      catch { toast(isHi ? 'सत्र सहेजना अनुपलब्ध है। प्रगति स्थानीय रूप से सहेजी जा रही है।' : 'Session resume is unavailable in this browser. Progress is still saved locally.'); }
    }
  }, [run, persistedKey, isHi]);

  useEffect(() => { locked.current = false; questionStart.current = Date.now(); setConfidence(3); }, [run?.index]);

  const resolvedTopic = topic?.toLowerCase() === 'prehistory' ? 'S03-Cf57dd5c3-T80b6a594' : topic;
  const pool = questions.filter(q => examQuestion(q, exam) && (subject === 'all' || q.subjectId === subject) && (chapter === 'all' || q.chapterId === chapter) && (resolvedTopic === 'all' || q.topicId === resolvedTopic) && (kind === 'all' || q.kind === kind));
  const filter = params.get('filter');
  const candidates = filter === 'wrong' ? pool.filter(q => state.wrongIds.includes(q.id)) : filter === 'saved' ? pool.filter(q => state.bookmarks.includes(q.id)) : filter === 'due' ? revisionQuestions(pool, state) : filter === 'high-yield' ? pool.filter(q => q.difficulty !== 'EXPERT') : params.get('question') ? pool.filter(q => q.id === params.get('question')) : pool;
  const runQuestions = run ? run.ids.map(id => questions.find(q => q.id === id)!).filter(Boolean) : [];
  const q = runQuestions[run?.index || 0];

  const finish = (active: Run) => {
    if (finishing.current || active.finished) return;
    finishing.current = true;
    const selectedQuestions = active.ids.map(id => questions.find(q => q.id === id)!).filter(Boolean);
    const result = scoreSession(selectedQuestions, active.answers, active.negative);
    const entry: SessionResult = { id: active.id, mode: active.mode, at: Date.now(), questionIds: active.ids, answers: active.answers, correct: result.correct, total: active.ids.length, score: result.score, negativeMark: active.negative, elapsedMs: Date.now() - active.started };
    update(s => s.results.some(r => r.id === entry.id) ? s : { ...s, results: [...s.results, entry] });
    setRun({ ...active, finished: true });
  };

  useEffect(() => {
    if (!run?.deadline || run.finished) return;
    const tick = () => { const seconds = Math.max(0, Math.ceil((run.deadline! - Date.now()) / 1000)); setRemaining(seconds); if (!seconds) finish(run); };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [run]);

  function start() {
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    if (mode === 'challenge') shuffled.sort((a, b) => rank[a.difficulty] - rank[b.difficulty]);
    const maxCount = mode === 'challenge' ? 15 : count;
    const ids = shuffled.slice(0, maxCount).map(q => q.id);
    if (!ids.length) return;
    finishing.current = false; locked.current = false; questionStart.current = Date.now();
    const now = Date.now();
    setRun({ id: crypto.randomUUID(), ids, index: 0, answers: {}, started: now, deadline: minutes ? now + minutes * 60_000 : null, mode, negative, finished: false, hintUsed: false, eliminateUsed: false, eliminated: [], hintFor: null });
  }

  function answer(index: number) {
    if (!run || !q || locked.current || run.answers[q.id] !== undefined || run.finished) return;
    if (run.deadline && Date.now() >= run.deadline) { finish(run); return; }
    locked.current = true;
    const answers = { ...run.answers, [q.id]: index };
    update(s => recordAnswer(s, q, index, Date.now() - questionStart.current, confidence, mode));
    const next = { ...run, answers }; setRun(next);
    if (mode === 'challenge' && index !== q.correctIndex) finish(next);
  }

  const reset = () => { sessionStorage.removeItem(persistedKey); setRun(null); finishing.current = false; };
  const title = mode === 'challenge' ? 'Crorepati Challenge / करोड़पति चुनौती' : mode === 'mock' ? 'Mock Test / मॉक परीक्षा' : 'Question Practice / प्रश्न अभ्यास';

  if (!run) return <>
    <PageHeading
      eyebrow={mode === 'challenge' ? (isHi ? 'मूल ज्ञान चुनौती · केवल आभासी अंक' : 'ORIGINAL KNOWLEDGE CHALLENGE · VIRTUAL POINTS ONLY') : (isHi ? 'पुनः प्राप्त करें · समझें · याद रखें' : 'RETRIEVE. UNDERSTAND. REMEMBER.')}
      title={title}
    >
      {mode === 'challenge' ? (isHi ? '15 अद्वितीय प्रश्न, बढ़ती चुनौती, और आगे बढ़ने के दो विचारशील तरीके।' : '15 unique questions, a rising challenge, and two thoughtful ways to get unstuck.') : (isHi ? 'इस उपकरण पर उपलब्ध प्रश्नों का अभ्यास करें। प्रत्येक व्याख्या अपने साक्ष्य से जुड़ी है।' : 'Practice the questions available on this device. Every explanation links back to its evidence.')}
    </PageHeading>
    <div className="practice-setup">
      <section className="card setup-card">
        {mode === 'challenge' ? <>
          <Trophy className="large-trophy" size={48} />
          <h2>{isHi ? 'जिज्ञासा आपको कहाँ ले जाएगी?' : 'How far will curiosity take you?'}</h2>
          <p>{isHi ? 'आगे बढ़ने के लिए सही उत्तर दें। एक गलत उत्तर चुनौती समाप्त करता है। प्रत्येक सही उत्तर पर अपने चरण का 100 गुना आभासी अंक प्राप्त करें।' : 'Answer correctly to advance. One incorrect answer ends the run. Earn 100 × your stage in virtual points for each correct answer.'}</p>
          <ul>
            <li><strong>{isHi ? 'स्मरण संकेत:' : 'Recall cue:'}</strong> {isHi ? 'एक बार मेमोरी क्यू देखें।' : 'reveal a memory cue once.'}</li>
            <li><strong>{isHi ? 'विकल्प घटाएं:' : 'Narrow the field:'}</strong> {isHi ? 'एक बार एक गलत विकल्प हटाएं।' : 'remove one incorrect option once.'}</li>
            <li>{isHi ? 'कठिनाई उपलब्ध सत्यापित बैंक के अनुसार बढ़ती है।' : 'Difficulty follows the available verified bank.'}</li>
          </ul>
        </> : <h2>{isHi ? 'अपना अभ्यास सत्र बनाएं' : 'Build your session'}</h2>}
        <div className="form-grid">
          <label>Exam / परीक्षा<select aria-label="Practice exam" value={exam} onChange={e=>{update(s=>({...s,profile:{...s.profile,exam:e.target.value}}));setSubject('all');setChapter('all');setTopic('all');}}>{exams.map(e=><option key={e.id} value={e.id}>{e.en} / {e.hi}</option>)}</select></label>
          <label>Subject / विषय
            <select value={subject} onChange={e => { setSubject(e.target.value); setChapter('all'); setTopic('all'); }}
            >
              <option value="all">{isHi ? 'सभी उपलब्ध विषय' : 'All available subjects'}</option>
              {examSubjects.map(s => <option value={s.id} key={s.id}>{s.shortTitle} / {s.titleHindi}</option>)}
            </select>
          </label>
          <label>Chapter / अध्याय
            <select value={chapter} onChange={e => { setChapter(e.target.value); setTopic('all'); }}
            >
              <option value="all">{isHi ? 'सभी अध्याय' : 'All chapters'}</option>
              {examSubjects.filter(s => subject === 'all' || s.id === subject).flatMap(s => s.chapters).map(c => <option key={c.id} value={c.id}>{c.title} / {c.titleHindi}</option>)}
            </select>
          </label>
          <label>Topic / टॉपिक
            <select value={topic} onChange={e => setTopic(e.target.value)}
            >
              <option value="all">{isHi ? 'सभी शीर्षक' : 'All topics'}</option>
              {examSubjects.filter(s => subject === 'all' || s.id === subject).flatMap(s => s.chapters.filter(c => chapter === 'all' || c.id === chapter).flatMap(c => c.topics)).filter(t => t.questionCount).map(t => <option key={t.id} value={t.id}>{t.title} / {t.titleHindi}</option>)}
            </select>
          </label>
          {mode !== 'challenge' && <>
            <label>{isHi ? 'प्रश्नों की संख्या' : 'Number of questions'}
              <select value={count} onChange={e => setCount(Number(e.target.value))}>
                {[1, 5, 10, 15, 20, 25, 50, 100].map(n => <option key={n} value={n}>{n} {isHi ? 'प्रश्न' : 'questions'}</option>)}
              </select>
            </label>
            <label>{isHi ? 'समय' : 'Timer'}
              <select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>
                <option value={0}>{isHi ? 'असीमित' : 'Untimed'}</option>
                {[5, 10, 20, 30, 60].map(n => <option key={n} value={n}>{n} {isHi ? 'मिनट' : 'minutes'}</option>)}
              </select>
            </label>
            <label>{isHi ? 'नकारात्मक अंक' : 'Wrong-answer penalty'}
              <select value={negative} onChange={e => setNegative(Number(e.target.value))}>
                <option value={0}>{isHi ? 'कोई नहीं' : 'None'}</option>
                <option value={0.25}>{isHi ? '−0.25 अंक' : '−0.25 points'}</option>
                <option value={0.5}>{isHi ? '−0.5 अंक' : '−0.5 points'}</option>
                <option value={1}>{isHi ? '−1 अंक' : '−1 point'}</option>
              </select>
            </label>
            <label>{isHi ? 'प्रश्न प्रकार' : 'Question type'}
              <select value={kind} onChange={e => setKind(e.target.value)}>
                <option value="all">{isHi ? 'सभी सत्यापित अभ्यास प्रश्न' : 'All verified practice'}</option>
                <option value="ACTUAL_PYQ">{isHi ? 'केवल वास्तविक परीक्षा प्रश्न (PYQ)' : 'Actual PYQ only'}</option>
              </select>
            </label>
          </>}
        </div>
        <p className="availability">
          {candidates.length} {isHi ? 'सत्यापित प्रश्न उपलब्ध' : 'matching questions available'} · {mode === 'challenge' ? (isHi ? '15 आवश्यक' : '15 required') : (isHi ? `${Math.min(count, candidates.length)} का उपयोग होगा` : `${Math.min(count, candidates.length)} will be used`)}
        </p>
        <button className="button full" disabled={!candidates.length || (mode === 'challenge' && candidates.length < 15)} onClick={start}>
          {mode === 'challenge' ? (isHi ? 'चुनौती शुरू करें' : 'Begin challenge') : (isHi ? 'सत्र शुरू करें' : 'Start session')}<ArrowRight size={18} />
        </button>
        {!candidates.length && <p>{isHi ? 'इस चयन से मेल खाने वाले कोई सत्यापित प्रश्न नहीं हैं। दूसरा फ़िल्टर चुनें।' : 'No verified questions match this selection. Try a different filter or download a subject pack.'}</p>}
        <DownloadLink />
      </section>
      <aside className="card setup-aside">
        <ShieldCheck size={30} />
        <h2>{isHi ? <>उत्तर को समझें।<br />केवल स्कोर नहीं।</> : <>Understand the answer.<br />Not just the score.</>}</h2>
        <p>{isHi ? 'व्याख्याओं की समीक्षा करें, समझें कि अन्य विकल्प क्यों सही नहीं हैं, और अपनी रिविज़न दिनचर्या बनाएं।' : 'Review explanations, see why other options don’t fit, and build your own revision rhythm.'}</p>
        <div className="shortcut-list">
          <Link to="/notebook">{isHi ? 'गलत उत्तर नोटबुक →' : 'Wrong answer notebook →'}</Link>
          <Link to="/revision">{isHi ? 'स्मार्ट रिविज़न →' : 'Smart revision →'}</Link>
          <Link to="/practice?filter=high-yield">{isHi ? 'उच्च-प्राथमिकता अभ्यास →' : 'High-yield practice →'}</Link>
          <Link to="/mocks">{isHi ? 'समयबद्ध मॉक टेस्ट →' : 'Timed mock tests →'}</Link>
        </div>
        <p className="small muted">{isHi ? 'उच्च-प्राथमिकता सुलभ आधारभूत प्रश्नों को प्राथमिकता देती है।' : 'High-yield prioritizes accessible foundational questions; no unsupported exam-frequency claim is made.'}</p>
      </aside>
    </div>
  </>;

  if (run.finished) {
    const results = scoreSession(runQuestions, run.answers, run.negative);
    const points = runQuestions.reduce((n, q, i) => n + (run.answers[q.id] === q.correctIndex ? 100 * (i + 1) : 0), 0);
    return <>
      <PageHeading eyebrow={isHi ? 'प्रत्येक प्रयास आपको आगे बढ़ाता है' : 'EVERY ATTEMPT MOVES YOU FORWARD'} title={mode === 'challenge' ? (isHi ? 'आपकी चुनौती का परिणाम' : 'Your challenge, reflected.') : (isHi ? 'यहाँ आपने क्या सीखा:' : 'Here’s what you learned.')} />
      <section className="result-summary card">
        <Trophy size={42} />
        <h2>{mode === 'challenge' ? `${points.toLocaleString()} ${isHi ? 'आभासी अंक' : 'virtual points'}` : `${results.score} / ${run.ids.length} ${isHi ? 'अंक' : 'points'}`}</h2>
        <div className="result-stats">
          <span><strong>{results.correct}</strong>{isHi ? 'सही' : 'correct'}</span>
          <span><strong>{results.wrong}</strong>{isHi ? 'पुनरावलोकन' : 'to revisit'}</span>
          <span><strong>{results.unanswered}</strong>{isHi ? 'अनुत्तरित' : 'unanswered'}</span>
          <span><strong>{results.accuracy}%</strong>{isHi ? 'सटीकता' : 'accuracy'}</span>
        </div>
        <div className="actions">
          <button onClick={reset}><RotateCcw size={17} />{isHi ? 'नया सत्र' : 'New session'}</button>
          <Link to="/notebook" className="secondary">{isHi ? 'गलतियों की समीक्षा करें' : 'Review mistakes'}</Link>
        </div>
      </section>
      <h2>{isHi ? 'प्रश्नवार समीक्षा' : 'Question-by-question review'}</h2>
      {runQuestions.filter(q => run.answers[q.id] !== undefined).map(q => (
        <article className="card review-card" key={q.id}>
          <h3><Bilingual value={q.question}/></h3>
          <p className={run.answers[q.id] === q.correctIndex ? 'correct-text' : 'wrong-text'}>
            {run.answers[q.id] === q.correctIndex ? (isHi ? 'सही उत्तर' : 'Correct') : (isHi ? 'पुनरावलोकन करें' : 'Revisit')} · {isHi ? 'आपका उत्तर: ' : 'Your answer: '}{text(q.options[run.answers[q.id]])}
          </p>
          <Explanation question={q} />
          <Link to={`/topic/${q.topicId}`} className="text-link">{isHi ? 'अवधारणा की समीक्षा करें' : 'Review the concept'}<ArrowRight size={16} /></Link>
        </article>
      ))}
    </>;
  }

  if (!q) return <Empty title={isHi ? 'सत्र सामग्री अनुपलब्ध है' : 'Session content is unavailable'} link="/downloads">{isHi ? 'आवश्यक पैक डाउनलोड करें और नया सत्र शुरू करें।' : 'Download the required pack and start a new session.'}</Empty>;

  const answered = run.answers[q.id] !== undefined;

  return <>
    <div className="session-header">
      <Link to="/">{isHi ? '← होम' : '← Home'}</Link>
      <span className="chip">{mode.toUpperCase()}</span>
      {run.deadline && <span className="timer" role="timer"><Clock size={17} />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}
      <button className="secondary" onClick={() => finish(run)}><Flag size={16} />{isHi ? 'सत्र समाप्त करें' : 'Finish session'}</button>
    </div>
    <div className="session-progress"><span style={{ width: `${run.index / run.ids.length * 100}%` }} /></div>
    <section className="question-card card">
      <div className="question-meta">
        <span>{isHi ? `प्रश्न ${run.index + 1} / ${run.ids.length}` : `QUESTION ${run.index + 1} OF ${run.ids.length}`}</span>
        <span className="chip neutral">{q.difficulty.toLowerCase()}</span>
        <button className="icon-button bookmark" aria-label={state.bookmarks.includes(q.id) ? 'Remove bookmark' : 'Bookmark question'} aria-pressed={state.bookmarks.includes(q.id)} onClick={() => update(s => toggleBookmark(s, q.id))}>
          <Bookmark fill={state.bookmarks.includes(q.id) ? 'currentColor' : 'none'} size={21} />
        </button>
      </div>
      <h1 className="question-title" lang={state.profile.language === 'hi' ? 'hi' : 'en'}><Bilingual value={q.question}/></h1>
      <div className="options" role="group" aria-label="Answer options">
        {q.options.map((option, index) => (
          <button
            key={index}
            disabled={answered || run.eliminated.includes(index)}
            className={`answer-option ${answered && mode !== 'mock' && index === q.correctIndex ? 'correct' : ''} ${answered && run.answers[q.id] === index ? mode !== 'mock' && index !== q.correctIndex ? 'incorrect' : 'chosen' : ''}`}
            onClick={() => answer(index)}
          >
            <span className="option-letter">{String.fromCharCode(65 + index)}</span>
            <span><Bilingual value={option}/></span>
            {answered && mode !== 'mock' && index === q.correctIndex && <Check size={20} />}
            {answered && mode !== 'mock' && run.answers[q.id] === index && index !== q.correctIndex && <X size={20} />}
          </button>
        ))}
      </div>
      {!answered && (
        <label className="confidence">{isHi ? 'आपका आत्मविश्वास कितना है?' : 'How confident are you?'}{' '}
          <select value={confidence} onChange={e => setConfidence(Number(e.target.value))}>
            <option value={1}>{isHi ? 'केवल अनुमान' : 'Taking a guess'}</option>
            <option value={3}>{isHi ? 'मध्यम विश्वास' : 'Fairly sure'}</option>
            <option value={5}>{isHi ? 'पूर्ण विश्वास' : 'Very sure'}</option>
          </select>
        </label>
      )}
      {!answered && !run.finished && (
        <div className="actions">
          {run.index + 1 < run.ids.length
            ? <button className="secondary" onClick={() => setRun({ ...run, index: run.index + 1, eliminated: [], hintFor: null })}>{isHi ? 'यह छोड़ें' : 'Skip this one'}<ArrowRight size={17} /></button>
            : <button className="secondary" onClick={() => finish(run)}>{isHi ? 'परिणाम देखें' : 'See results'}<ArrowRight size={17} /></button>}
        </div>
      )}
      {mode === 'challenge' && !answered && (
        <div className="actions">
          <button className="secondary" disabled={run.hintUsed} onClick={() => setRun({ ...run, hintUsed: true, hintFor: q.id })}>
            <Lightbulb size={17} />{isHi ? 'स्मरण संकेत' : 'Recall cue'}
          </button>
          <button className="secondary" disabled={run.eliminateUsed} onClick={() => setRun({ ...run, eliminateUsed: true, eliminated: [q.options.findIndex((_, i) => i !== q.correctIndex)] })}>
            {isHi ? 'विकल्प घटाएं' : 'Narrow the field'}
          </button>
        </div>
      )}
      {run.hintFor === q.id && <p className="memory-cue"><Bilingual value={q.memoryCue}/></p>}
      {answered && (
        <div aria-live="polite" className="answer-feedback">
          {mode !== 'mock' ? <>
            <h2 className={run.answers[q.id] === q.correctIndex ? 'correct-text' : 'wrong-text'}>
              {run.answers[q.id] === q.correctIndex ? (isHi ? 'शानदार स्मरण!' : 'Nicely recalled.') : (isHi ? 'अवधारणा को पुनः समझें:' : 'A good moment to make a connection.')}
            </h2>
            <Explanation question={q} />
          </> : <p><CheckCircle2 size={17} /> {isHi ? 'उत्तर सहेजा गया। व्याख्या सत्र समाप्त होने के बाद दिखाई देगी।' : 'Answer saved. Explanations appear after you finish.'}</p>}
          <button className="button" onClick={() => { if (run.index + 1 === run.ids.length) finish(run); else setRun({ ...run, index: run.index + 1, eliminated: [], hintFor: null }); }}>
            {run.index + 1 === run.ids.length ? (isHi ? 'परिणाम देखें' : 'See results') : (isHi ? 'अगला प्रश्न' : 'Next question')}<ArrowRight size={18} />
          </button>
        </div>
      )}
    </section>
  </>;
}

export function Explanation({ question: q }: { question: Question }) {
  const { facts, sources, state } = useStore();
  const isHi = state.profile.language === 'hi';

  return <div className="explanation">
    <p><strong>Answer / सही उत्तर: <Bilingual value={q.options[q.correctIndex]}/></strong></p>
    <p><Bilingual value={q.explanation}/></p>
    <details>
      <summary>Explanation / विस्तृत व्याख्या</summary>
      <p><Bilingual value={q.detailedExplanation}/></p>
      <ul>{q.options.map((o, i) => i !== q.correctIndex && <li key={i}><strong><Bilingual value={o}/>:</strong> <Bilingual value={q.wrongReasons[i]}/></li>)}</ul>
    </details>
    <div className="memory-cue"><Lightbulb size={18} /><span><Bilingual value={q.memoryCue}/></span></div>
    <details>
      <summary>{isHi ? 'साक्ष्य एवं आधिकारिक स्रोत' : 'Evidence & sources'}</summary>
      {facts.filter(f => q.factCardIds.includes(f.id)).flatMap(f => f.evidence.map((e, i) => <blockquote key={`${f.id}-${i}`}>{e.quote}<cite>{e.locator}</cite></blockquote>))}
      {sources.filter(s => q.sourceIds.includes(s.id)).map(s => <a className="source-link" key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.publisher} · {s.title} ↗</a>)}
    </details>
  </div>;
}
