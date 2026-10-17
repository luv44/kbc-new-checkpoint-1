import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, CalendarDays, CheckCircle2, Search, Sparkles, Target } from './icons';
import { useStore } from './context';
import { DownloadLink, Empty, PageHeading, useText } from './components';
import { revisionQuestions, searchMatch, toggleBookmark } from './domain';

export default function Library({ page }: { page: string }) {
  const { state, questions, facts, catalog, update } = useStore();
  const text = useText();
  const isHi = state.profile.language === 'hi';
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const topics = catalog.subjects.flatMap(s => s.chapters.flatMap(c => c.topics));

  if (page === 'current-affairs' || page === 'pyq') {
    return <>
      <PageHeading eyebrow={isHi ? 'प्रकाशन से पूर्व साक्ष्य' : 'EVIDENCE BEFORE PUBLICATION'} title={page === 'pyq' ? (isHi ? 'विगत वर्ष के प्रश्न (PYQ)' : 'Previous year questions') : (isHi ? 'समसामयिकी' : 'Current affairs')}>
        {page === 'pyq' ? (isHi ? 'वास्तविक परीक्षा प्रश्नपत्र, आधिकारिक उत्तर कुंजी और स्पष्ट स्रोत।' : 'Actual exam papers, official answer keys, and clear provenance.') : (isHi ? 'ताज़ा घटनाक्रम, आधिकारिक स्रोत और सत्यापन तिथियाँ।' : 'Fresh events, official sources, and visible verification dates.')}
      </PageHeading>
      <Empty title={page === 'pyq' ? (isHi ? 'आधिकारिक प्रश्नपत्र सत्यापन प्रक्रिया में हैं।' : 'Official papers are awaiting ingestion.') : (isHi ? 'कोई नया समसामयिकी पैक प्रकाशित नहीं है।' : 'No fresh current-affairs pack is published.')} link="/practice" label={isHi ? 'सत्यापित अभ्यास देखें' : 'Explore verified practice'}>
        {page === 'pyq' ? (isHi ? 'इस चेकपॉइंट में केवल सत्यापित अभ्यास प्रश्न उपलब्ध हैं। वास्तविक परीक्षा प्रश्नों के लिए आधिकारिक स्रोत सत्यापन आवश्यक है।' : 'This checkpoint contains verified practice questions. Exam, stage, year, paper, shift and official answer provenance are required before publication.') : (isHi ? 'प्रत्येक घटना के लिए स्रोत, तिथि और सत्यापन आवश्यक है। असत्यापित तथ्य अभ्यास से बाहर रखे जाते हैं।' : 'Every event needs a source, event date, verification time and expiry. Unverified or expired news is excluded from practice.')}
      </Empty>
      <section className="card topic-section">
        <h2>{page === 'pyq' ? (isHi ? 'सत्यापन कैसे किया जाता है' : 'How provenance is checked') : (isHi ? 'नवीनता कैसे बनाए रखी जाती है' : 'How freshness is maintained')}</h2>
        <p>{page === 'pyq' ? (isHi ? 'आधिकारिक पेपर → प्रश्न संख्या → आधिकारिक उत्तर कुंजी → साक्ष्य समीक्षा → सत्यापित प्रश्न।' : 'Official paper → question number → official answer key → evidence review → verified question. Missing or ambiguous records remain unavailable.') : (isHi ? 'आधिकारिक रिपोर्ट → घटना रिकॉर्ड → सत्यापन → सत्यापित तथ्य कार्ड → प्रश्न बैंक।' : 'Official report → event record → deduplication → verified FactCard → question pack. Expired claims are removed from eligible questions until reverified.')}</p>
      </section>
    </>;
  }

  if (page === 'performance') {
    const correct = state.attempts.filter(a => a.correct).length;
    const accuracy = state.attempts.length ? Math.round(correct / state.attempts.length * 100) : 0;
    const avg = state.attempts.length ? Math.round(state.attempts.reduce((n, a) => n + a.elapsedMs, 0) / state.attempts.length / 1000) : 0;
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return { label: d.toLocaleDateString(isHi ? 'hi-IN' : 'en', { weekday: 'short' }), count: state.attempts.filter(a => new Date(a.at).toDateString() === d.toDateString()).length }; });
    const max = Math.max(1, ...last7.map(x => x.count));
    return <>
      <PageHeading eyebrow={isHi ? 'छोटे कदम बड़ी सफलता' : 'SMALL STEPS ADD UP'} title={isHi ? 'आपकी सीखने की प्रगति' : 'Your learning, in perspective.'}>
        {isHi ? 'इस उपकरण पर आपके अभ्यास का विश्लेषण। किसी तुलना की आवश्यकता नहीं।' : 'A reflection of practice on this device. No comparison needed.'}
      </PageHeading>
      <div className="metric-grid">
        {[[state.attempts.length, isHi ? 'हल किए गए प्रश्न' : 'Questions attempted'], [`${accuracy}%`, isHi ? 'सटीकता दर' : 'Answer accuracy'], [`${avg}s`, isHi ? 'औसत उत्तर समय' : 'Average answer time'], [Object.values(state.progress).filter(p => p.state === 'MASTERED').length, isHi ? 'कंठस्थ अवधारणाएं' : 'Concepts mastered']].map(([n, label]) => <div className="card metric" key={String(label)}><strong>{n}</strong><span>{label}</span></div>)}
      </div>
      <div className="two-column">
        <section className="card topic-section">
          <h2>{isHi ? 'इस सप्ताह का अभ्यास' : 'A week of curiosity'}</h2>
          <div className="bar-chart" aria-label="Practice activity over the last seven days">
            {last7.map((x, i) => <div key={i}><span>{x.count}</span><div className="bar-track"><div style={{ height: `${x.count / max * 100}%` }} /></div><span>{x.label}</span></div>)}
          </div>
        </section>
        <section className="card topic-section">
          <h2>{isHi ? 'विषयवार प्रदर्शन' : 'Find your next focus'}</h2>
          {catalog.subjects.map(s => ({ s, attempts: state.attempts.filter(a => a.subjectId === s.id) })).filter(x => x.attempts.length).map(({ s, attempts }) => (
            <div className="subject-performance" key={s.id}>
              <span>{isHi && s.titleHindi ? s.titleHindi : s.shortTitle}</span>
              <strong>{Math.round(attempts.filter(a => a.correct).length / attempts.length * 100)}%</strong>
            </div>
          ))}
          {!state.attempts.length && <p>{isHi ? 'आपकी ताकत और पुनरावलोकन योग्य क्षेत्र पहले अभ्यास सत्र के बाद दिखाई देंगे।' : 'Your strengths and areas to revisit will appear after your first practice session.'}</p>}
          <Link className="text-link" to="/notebook">{isHi ? 'कमजोर अवधारणाओं की समीक्षा करें' : 'Review weak concepts'}<ArrowRight size={16} /></Link>
        </section>
      </div>
      <h2>{isHi ? 'सत्र इतिहास' : 'Session history'}</h2>
      {state.results.length ? [...state.results].reverse().map(r => (
        <details className="card history-row" key={r.id}>
          <summary>{r.mode.toUpperCase()} · {r.correct}/{r.total} {isHi ? 'सही' : 'correct'} · {r.score} {isHi ? 'अंक' : 'points'} · {new Date(r.at).toLocaleString(isHi ? 'hi-IN' : 'en')}</summary>
          <p>{Math.round(r.elapsedMs / 1000)} {isHi ? 'सेकंड' : 'seconds'} · {isHi ? 'नकारात्मक अंक:' : 'penalty'} {r.negativeMark} {isHi ? 'प्रति गलत उत्तर' : 'per wrong answer'}</p>
          {r.questionIds.map(id => {
            const q = questions.find(q => q.id === id);
            return <p key={id}>{q ? text(q.question) : `Question ${id}`} — {r.answers[id] === undefined ? (isHi ? 'अनुत्तरित' : 'Unanswered') : q ? text(q.options[r.answers[id]]) : `Option ${r.answers[id] + 1}`}</p>;
          })}
        </details>
      )) : <Empty title={isHi ? 'आपकी यात्रा एक प्रश्न से शुरू होती है।' : 'Your story starts with one question.'} link="/practice" label={isHi ? 'अभ्यास प्रारंभ करें' : 'Start practicing'}>{isHi ? 'पूर्ण किए गए अभ्यास सत्र, मॉक और चुनौतियाँ यहाँ दिखाई देंगी।' : 'Completed practice sessions, mocks and challenges will appear here.'}</Empty>}
    </>;
  }

  if (page === 'search') {
    const subjectMatches = query.trim() ? catalog.subjects.filter(s => searchMatch(query, s.title, s.titleHindi)) : [];
    const chapterMatches = query.trim() ? catalog.subjects.flatMap(s => s.chapters.map(c => ({ ...c, subjectId: s.id }))).filter(c => searchMatch(query, c.title, c.titleHindi)) : [];
    const topicMatches = query.trim() ? topics.filter(t => searchMatch(query, t.title, t.titleHindi, ...t.concepts.map(c => c.title))) : [];
    const questionMatches = query.trim() ? questions.filter(q => searchMatch(query, q.question.en, q.question.hi, q.explanation.en, q.explanation.hi)) : [];
    const factMatches = query.trim() ? facts.filter(f => searchMatch(query, f.canonicalStatement, f.canonicalStatementHindi)) : [];
    return <>
      <PageHeading eyebrow={isHi ? 'ज्ञान की खोज' : 'FOLLOW A THREAD'} title={isHi ? 'आप क्या खोजना चाहते हैं?' : 'What are you curious about?'}>
        {isHi ? 'विषय, अध्याय, शीर्षक, अवधारणाएं, प्रश्न और सत्यापित तथ्य खोजें।' : 'Search subjects, chapters, topics, concepts, downloaded questions and source-grounded facts.'}
      </PageHeading>
      <label className="search-field">
        <Search size={20} />
        <span className="sr-only">{isHi ? 'खोजें' : 'Search knowledge'}</span>
        <input autoFocus value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }} placeholder={isHi ? 'ग्रह, हड़प्पा, मात्रक, संविधान, संयुक्त राष्ट्र…' : 'Try planets, Harappan, units, संयुक्त राष्ट्र…'} />
      </label>
      {query.trim() ? <>
        <p className="muted">{subjectMatches.length + chapterMatches.length + topicMatches.length + questionMatches.length + factMatches.length} {isHi ? 'परिणाम मिले' : 'results · Questions and facts are searched locally.'}</p>
        {subjectMatches.map(s => <Link className="card search-result" key={s.id} to={`/learn/${s.id}`}><span className="eyebrow">{isHi ? 'विषय' : 'SUBJECT'}</span><h3>{isHi && s.titleHindi ? s.titleHindi : s.title}</h3><ArrowRight size={18} /></Link>)}
        {chapterMatches.slice(0, limit).map(c => <Link className="card search-result" key={c.id} to={`/learn/${c.subjectId}`}><span className="eyebrow">{isHi ? 'अध्याय' : 'CHAPTER'}</span><h3>{isHi && c.titleHindi ? c.titleHindi : c.title}</h3></Link>)}
        {topicMatches.slice(0, limit).map(t => <Link className="card search-result" key={t.id} to={`/topic/${t.id}`}><span className="eyebrow">{isHi ? 'शीर्षक' : 'TOPIC'}</span><h3>{isHi && t.titleHindi ? t.titleHindi : t.title}</h3><p>{t.questionCount} {isHi ? 'सत्यापित प्रश्न' : 'verified questions'}</p></Link>)}
        {questionMatches.slice(0, limit).map(q => <Link className="card search-result" key={q.id} to={`/practice?question=${q.id}`}><span className="eyebrow">{isHi ? 'प्रश्न' : 'QUESTION'}</span><h3>{text(q.question)}</h3></Link>)}
        {factMatches.slice(0, limit).map(f => <Link className="card search-result" key={f.id} to={`/topic/${f.topicId}`}><span className="eyebrow">{isHi ? 'सत्यापित तथ्य' : 'VERIFIED FACT'}</span><p>{isHi && f.canonicalStatementHindi ? f.canonicalStatementHindi : f.canonicalStatement}</p></Link>)}
        {Math.max(chapterMatches.length, topicMatches.length, questionMatches.length, factMatches.length) > limit && <button onClick={() => setLimit(n => n + 30)}>{isHi ? 'और परिणाम देखें' : 'Show more results'}</button>}
      </> : <Empty title={isHi ? 'प्रत्येक खोज एक प्रश्न से शुरू होती है।' : 'Every discovery begins with a question.'}>{isHi ? 'व्यक्तियों, स्थानों, पुस्तकों और घटनाओं को उनके विषयों के माध्यम से खोजा जा सकता है।' : 'People, places, books and events can be found through their mapped topics. Hindi scripts are represented through the verified facts they teach.'}</Empty>}
    </>;
  }

  const due = revisionQuestions(questions, state);
  const list = page === 'notebook' ? questions.filter(q => state.wrongIds.includes(q.id)) : page === 'bookmarks' ? questions.filter(q => state.bookmarks.includes(q.id)) : due;
  const title = page === 'notebook' ? (isHi ? 'गलतियों से सीखें और आगे बढ़ें।' : 'Make a friend of your mistakes.') : page === 'bookmarks' ? (isHi ? 'महत्वपूर्ण प्रश्न बाद के लिए सुरक्षित रखें।' : 'Keep a little curiosity for later.') : (isHi ? 'महत्वपूर्ण अवधारणाओं को याद रखें।' : 'Remember what matters.');
  const savedTopics = page === 'bookmarks' ? topics.filter(t => state.bookmarks.includes(t.id)) : [];
  const nextDue = Object.values(state.progress).map(p => p.due).filter(t => t > Date.now()).sort((a, b) => a - b)[0];

  return <>
    <PageHeading
      eyebrow={page === 'notebook' ? (isHi ? 'गलत उत्तर नोटबुक' : 'WRONG ANSWER NOTEBOOK') : page === 'bookmarks' ? (isHi ? 'आपके बुकमार्क' : 'YOUR BOOKMARKS') : (isHi ? 'स्मार्ट रिविज़न' : 'SMART REVISION')}
      title={title}
    >
      {page === 'revision' ? (isHi ? 'सटीकता, आत्मविश्वास और अंतराल पुनरावृत्ति पर आधारित वैज्ञानिक अभ्यास।' : 'Spaced recall, guided by accuracy, confidence and recency. Previously unseen angles come first.') : page === 'notebook' ? (isHi ? 'गलत उत्तर सीखने का पहला कदम है। समझें कि क्या गलत हुआ, फिर पुनः प्रयास करें।' : 'An incorrect answer is a starting point. Understand why, then give it another try.') : (isHi ? 'वे प्रश्न और विषय जिन्हें आप दोबारा देखना चाहते हैं।' : 'Questions and topics you want to return to.')}
    </PageHeading>
    {page === 'revision' && (
      <div className="revision-banner">
        <Sparkles size={30} />
        <div>
          <h2>{due.length ? (isHi ? `${due.length} प्रश्न रिविज़न के लिए तैयार हैं।` : `${due.length} questions are ready for recall.`) : (isHi ? 'फिलहाल सभी प्रश्न दोहराए जा चुके हैं।' : 'You’re all caught up for now.')}</h2>
          <p>{nextDue ? `${isHi ? 'अगला निर्धारित रिविज़न:' : 'Next scheduled review:'} ${new Date(nextDue).toLocaleString(isHi ? 'hi-IN' : 'en')}` : (isHi ? 'पहला अभ्यास सत्र आपका व्यक्तिगत रिविज़न शेड्यूल शुरू करता है।' : 'Your first practice session starts a personal revision schedule.')}</p>
        </div>
        {!!due.length && <Link to="/practice?filter=due" className="button">{isHi ? 'रिविज़न शुरू करें' : 'Begin revision'}<ArrowRight size={17} /></Link>}
      </div>
    )}
    {!!list.length && <Link to={`/practice?filter=${page === 'notebook' ? 'wrong' : page === 'bookmarks' ? 'saved' : 'due'}`} className="button">{isHi ? 'इन प्रश्नों का अभ्यास करें' : 'Practice these questions'}<ArrowRight size={17} /></Link>}
    {savedTopics.map(t => <Link to={`/topic/${t.id}`} className="card search-result" key={t.id}><span className="eyebrow">{isHi ? 'सुरक्षित शीर्षक' : 'SAVED TOPIC'}</span><h3>{isHi && t.titleHindi ? t.titleHindi : t.title}</h3></Link>)}
    {list.slice(0, limit).map(q => (
      <article className="card notebook-card" key={q.id}>
        <div>
          <span className="chip neutral">{q.difficulty.toLowerCase()}</span>
          <button className="icon-button" aria-label={isHi ? 'बुकमार्क बदलें' : 'Toggle bookmark'} aria-pressed={state.bookmarks.includes(q.id)} onClick={() => update(s => toggleBookmark(s, q.id))}>
            <Bookmark size={19} />
          </button>
        </div>
        <h2>{text(q.question)}</h2>
        <p>{text(q.memoryCue)}</p>
        <div className="actions">
          <Link className="text-link" to={`/practice?question=${q.id}`}><Target size={16} />{isHi ? 'पुनः प्रयास करें' : 'Try again'}</Link>
          <Link className="text-link" to={`/topic/${q.topicId}`}>{isHi ? 'अवधारणा की समीक्षा करें' : 'Review the concept'}<ArrowRight size={16} /></Link>
        </div>
      </article>
    ))}
    {list.length > limit && <button onClick={() => setLimit(n => n + 30)}>{isHi ? 'और दिखाएं' : 'Show more'}</button>}
    {!list.length && !savedTopics.length && (
      <Empty
        title={page === 'notebook' ? (isHi ? 'सीखने के लिए एक नया पृष्ठ।' : 'A fresh page for your learning.') : page === 'bookmarks' ? (isHi ? 'कुछ महत्वपूर्ण सुरक्षित करना चाहते हैं?' : 'Something worth remembering?') : (isHi ? 'अपनी स्मरण गति बनाएं।' : 'Build your recall rhythm.')}
        link="/practice"
        label={isHi ? 'अभ्यास प्रारंभ करें' : 'Start practice'}
      >
        {page === 'notebook' ? (isHi ? 'गलत हुए प्रश्न यहाँ अपने आप सुरक्षित हो जाते हैं।' : 'Questions you get wrong are saved here automatically. A correct retry resolves the entry while keeping your answer history.') : page === 'bookmarks' ? (isHi ? 'किसी प्रश्न या विषय पर बुकमार्क बटन का उपयोग करके उसे यहाँ सुरक्षित करें।' : 'Use the bookmark button on a question or topic to save it here.') : (isHi ? 'सही उत्तर 1, 3, 7, 14, 30 और 60 दिनों के अंतराल पर दोहराए जाते हैं।' : 'Correct recall spaces reviews at 1, 3, 7, 14, 30 and 60 days. A mistake returns in 10 minutes.')}
      </Empty>
    )}
    {page === 'revision' && (
      <div className="revision-legend">
        <span><CalendarDays size={17} />{isHi ? 'स्मरण से निर्धारित' : 'Scheduled from recall'}</span>
        <span><CheckCircle2 size={17} />{isHi ? 'आत्मविश्वास-जागरूक' : 'Confidence-aware'}</span>
        <span><Sparkles size={17} />{isHi ? 'नए दृष्टिकोण पहले' : 'Alternative angles first'}</span>
      </div>
    )}
    <DownloadLink />
  </>;
}
