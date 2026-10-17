import { examCatalog } from './exams';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Bookmark, CheckCircle2, ChevronRight, Clock, Download, Film, Search, ShieldCheck } from './icons';
import { useStore } from './context';
import { DownloadLink, Empty, PageHeading, SubjectCard, useText } from './components';
import { searchMatch, toggleBookmark } from './domain';
import { saveVideo } from './storage';
import type { Lesson } from './types';

export default function Learn() {
  const { subjectId } = useParams();
  const { catalog, state } = useStore();
  const [query, setQuery] = useState('');
  const isHi = state.profile.language === 'hi';
  const subject = catalog.subjects.find(s => s.id === subjectId);
  const subjectTitle = subject ? `${subject.title} / ${subject.titleHindi}` : 'Subjects & Topics / विषय एवं टॉपिक';
  const subjectDesc = subject
    ? (isHi ? `${subject.chapters.length} अध्याय, एक स्पष्ट अध्ययन पथ। किसी विषय की अवधारणाओं और उपलब्ध प्रश्नों को देखने के लिए उसे खोलें।` : `${subject.chapters.length} chapters, one clear learning path. Open a topic to explore its concepts and available questions.`)
    : (isHi ? '26 विषय। अपनी जिज्ञासा का अनुसरण करें, या अपनी आगामी परीक्षा पर ध्यान केंद्रित करें।' : '26 subjects. Follow your curiosity, or focus on your next exam.');

  if (subjectId && !subject) return <Empty title={isHi ? 'विषय नहीं मिला' : 'Subject not found'} link="/learn">{isHi ? 'पाठ्यक्रम से एक विषय चुनें।' : 'Choose a subject from the catalogue.'}</Empty>;

  return <>
    <PageHeading eyebrow={isHi ? 'संबंध जोड़ें · समझ विकसित करें' : 'MAKE CONNECTIONS. BUILD UNDERSTANDING.'} title={subjectTitle}>{subjectDesc}</PageHeading>
    {subject && <Link to="/learn" className="text-link">{isHi ? '← सभी विषय' : '← All subjects'}</Link>}
    <Link to="/syllabus" className="button">Select exam, subject & topic / परीक्षा, विषय व टॉपिक चुनें</Link>
    <label className="search-field">
      <Search size={20} />
      <span className="sr-only">{isHi ? 'विषय या अध्याय खोजें' : 'Find a subject or topic'}</span>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder={subject ? (isHi ? 'अध्याय या विषय खोजें…' : 'Find a chapter or topic…') : (isHi ? 'विषय खोजें…' : 'Find a subject…')} />
    </label>
    {!subject ? (
      <div className="subject-grid all-subjects">
        {examCatalog(catalog, state.profile.exam).filter(s => searchMatch(query, s.title, s.titleHindi)).map(s => <SubjectCard subject={s} key={s.id} />)}
      </div>
    ) : (
      <div className="chapter-list">
        {subject.chapters.filter(c => searchMatch(query, c.title, c.titleHindi) || c.topics.some(t => searchMatch(query, t.title, t.titleHindi))).map((c, i) => (
          <section className="card chapter" key={c.id}>
            <div className="chapter-heading">
              <span className="chapter-number">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="eyebrow">{isHi ? 'अध्याय' : 'CHAPTER'}</p>
                <h2>{c.title} / {c.titleHindi}</h2>
              </div>
              <span className="chip neutral">{c.topics.length} {isHi ? 'विषय' : 'topics'}</span>
            </div>
            {c.topics.filter(t => searchMatch(query, t.title, t.titleHindi, c.title, c.titleHindi)).map(t => (
              <Link to={`/topic/${t.id}`} key={t.id} className="topic-row">
                <div>
                  <h3>{t.title} / {t.titleHindi}</h3>
                  <p>{t.concepts.length} {isHi ? 'अवधारणाएं' : 'concepts'} · {t.questionCount ? `${t.questionCount} ${isHi ? 'सत्यापित प्रश्न' : 'verified questions'}` : (isHi ? 'प्रमाण संकलन लंबित' : 'Evidence collection pending')}</p>
                </div>
                <span className={`chip ${t.questionCount ? '' : 'neutral'}`}>{t.questionCount ? (isHi ? 'अभ्यास उपलब्ध' : 'Practice available') : (isHi ? 'तैयारी में' : 'In preparation')}</span>
                <ChevronRight size={19} />
              </Link>
            ))}
          </section>
        ))}
      </div>
    )}
    <p className="muted small">{isHi ? 'पाठ्यक्रम नियोजित अध्ययन को दर्शाता है। उपलब्ध प्रश्न संख्या और स्थिति वास्तव में सत्यापित सामग्री को प्रदर्शित करती है।' : 'The catalogue shows the planned coverage. Available question counts and lesson statuses show what has actually been verified.'}</p>
  </>;
}

export function TopicPage() {
  const { topicId } = useParams();
  const { catalog, state, facts, questions, sources, update, toast } = useStore();
  const text = useText();
  const isHi = state.profile.language === 'hi';
  const resolvedTopicId = topicId?.toLowerCase() === 'prehistory' ? 'S03-Cf57dd5c3-T80b6a594' : topicId;
  const subject = catalog.subjects.find(s => s.chapters.some(c => c.topics.some(t => t.id === resolvedTopicId)));
  const chapter = subject?.chapters.find(c => c.topics.some(t => t.id === resolvedTopicId));
  const topic = chapter?.topics.find(t => t.id === resolvedTopicId);
  const [lesson, setLesson] = useState<Lesson>();
  const [loadError, setLoadError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const milestones = useRef(new Set<string>());

  useEffect(() => {
    setLesson(undefined);
    setLoadError('');
    milestones.current.clear();
    const controller = new AbortController();
    if (resolvedTopicId) fetch(`/data/lessons/${resolvedTopicId}.json`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Lesson metadata is unavailable offline.'); return r.json(); })
      .then(setLesson)
      .catch(e => { if (e.name !== 'AbortError') setLoadError(e.message); });
    return () => controller.abort();
  }, [resolvedTopicId]);

  if (!topic || !chapter || !subject) return <Empty title={isHi ? 'विषय नहीं मिला' : 'Topic not found'} link="/learn">{isHi ? 'विषय सूची से किसी विषय का अन्वेषण करें।' : 'Explore a topic from the subject catalogue.'}</Empty>;

  const topicFacts = facts.filter(f => f.topicId === resolvedTopicId);
  const topicQuestions = questions.filter(q => q.topicId === resolvedTopicId);
  const mastered = topic.concepts.filter(c => state.progress[c.id]?.state === 'MASTERED').length;
  const availableVideo = lesson && ['APPROVED', 'PUBLISHED'].includes(lesson.status) && lesson.media && (!lesson.validUntil || Date.parse(lesson.validUntil) > Date.now());
  const track = (milestone: string) => { if (milestones.current.has(milestone)) return; milestones.current.add(milestone); update(s => ({ ...s, videoEvents: [...s.videoEvents, { videoId: lesson!.videoId, milestone, at: Date.now() }] })); };

  const subjectTitle = isHi && subject.titleHindi ? subject.titleHindi : subject.shortTitle;
  const chapterTitle = isHi && chapter.titleHindi ? chapter.titleHindi : chapter.title;
  const topicTitle = `${topic.title} / ${topic.titleHindi || ''}`;

  return <>
    <div className="breadcrumbs">
      <Link to="/learn">{isHi ? 'सीखें' : 'Learn'}</Link>
      <ChevronRight size={14} />
      <Link to={`/learn/${subject.id}`}>{subjectTitle}</Link>
      <ChevronRight size={14} />
      <span>{chapterTitle}</span>
    </div>
    <PageHeading
      eyebrow={isHi ? 'समझें → स्मरण करें → अभ्यास करें' : 'UNDERSTAND → RECALL → PRACTICE'}
      title={topicTitle}
      action={
        <button className="secondary" aria-pressed={state.bookmarks.includes(topic.id)} onClick={() => update(s => toggleBookmark(s, topic.id))}>
          <Bookmark size={17} />
          {state.bookmarks.includes(topic.id) ? (isHi ? 'सहेजा गया' : 'Saved') : (isHi ? 'विषय सहेजें' : 'Save topic')}
        </button>
      }
    >
      {mastered} / {topic.concepts.length} {isHi ? 'अवधारणाएं अभ्यास द्वारा सिद्ध' : 'concepts mastered through practice'}
    </PageHeading>
    <div className="topic-layout">
      <section>
        <div className="video-panel">
          {availableVideo ? (
            <video ref={video} controls playsInline preload="metadata" poster={lesson.media!.poster} onPlay={() => track('started')} onEnded={() => track('completed')} onTimeUpdate={() => { const v = video.current; if (v && Number.isFinite(v.duration)) for (const n of [25, 50, 75]) if (v.currentTime / v.duration * 100 >= n) track(`${n}%`); }}>
              <source src={lesson.media!.url} type="video/mp4" />
              <track kind="captions" src={lesson.media!.subtitlePath} srcLang="hi" label="हिंदी" default />
            </video>
          ) : (
            <div className="video-pending">
              <Film size={40} strokeWidth={1.2} />
              <span className="chip neutral">{isHi ? 'हिंदी पाठ · तैयारी में' : 'HINDI LESSON · IN PREPARATION'}</span>
              <h2>{isHi ? 'समझ सबसे पहले आती है।' : 'Understanding comes first.'}</h2>
              <p>{lesson?.status === 'PROMPT_READY' ? (isHi ? 'स्रोत-आधारित हिंदी पटकथा तैयार है। वीडियो समीक्षा लंबित है।' : 'The source-grounded Hindi script is prepared. Google Flow generation and video review are pending.') : (isHi ? 'यह पाठ सत्यापित प्रमाण और निर्माण की प्रतीक्षा में है।' : 'This lesson is waiting for verified evidence and production. Explore the learning path below.')}</p>
              <span className="small">{isHi ? 'इस विषय के लिए अभी कोई स्वीकृत वीडियो उपलब्ध नहीं है।' : 'No approved video is available for this topic yet.'}</span>
            </div>
          )}
        </div>
        {loadError && <p role="status" className="small muted">{loadError}</p>}
        {availableVideo && (
          <div className="video-controls">
            <span><Clock size={16} />{Math.round(lesson.targetDurationSec)} {isHi ? 'सेकंड' : 'seconds'}</span>
            <label>{isHi ? 'गति' : 'Speed'}
              <select onChange={e => { if (video.current) video.current.playbackRate = Number(e.target.value); }} defaultValue="1">
                <option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option>
              </select>
            </label>
            <button className="secondary" onClick={() => saveVideo(lesson.media!.url, lesson.media!.sha256, lesson.media!.size).then(() => toast(isHi ? 'वीडियो ऑफ़लाइन देखने के लिए सहेजा गया।' : 'Video saved for offline viewing.')).catch(e => toast(e.message))}>
              <Download size={16} />{isHi ? 'ऑफ़लाइन सहेजें' : 'Save offline'}
            </button>
          </div>
        )}
        <section className="card topic-section">
          <h2>{isHi ? 'आप क्या सीखेंगे' : 'What you will learn'}</h2>
          <ul className="concept-list">
            {topic.concepts.map(c => <li key={c.id}><CheckCircle2 size={17} /><span>{c.title}</span><span className="muted small">{state.progress[c.id]?.state.replaceAll('_', ' ') || (isHi ? 'नया' : 'NEW')}</span></li>)}
          </ul>
        </section>
        {topicFacts.length > 0 && (
          <section className="card topic-section">
            <h2>{isHi ? 'प्रमाणित तथ्य' : 'Facts you can trace'}</h2>
            {topicFacts.map(f => {
              const evidenceList = Array.isArray(f.evidence)
                ? f.evidence
                : typeof f.evidence === 'string' && f.evidence
                ? [{ quote: f.evidence, locator: isHi ? 'पाठ्यक्रम मानक संदर्भ' : 'Standard Syllabus' }]
                : [];
              const sourceIdList = Array.isArray(f.sourceIds) ? f.sourceIds : [];
              return (
                <article key={f.id} className="fact">
                  <p>{isHi && f.canonicalStatementHindi ? f.canonicalStatementHindi : f.canonicalStatement}</p>
                  <details>
                    <summary>{isHi ? 'साक्ष्य एवं स्रोत देखें' : 'View evidence & source'}</summary>
                    {evidenceList.map((e, i) => (
                      <blockquote key={i}>
                        {typeof e === 'string' ? e : e.quote}
                        {typeof e === 'object' && e?.locator && <cite>{e.locator}</cite>}
                      </blockquote>
                    ))}
                    {sourceIdList.map(id => {
                      const source = sources.find(s => s.id === id);
                      return source && <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title} ↗</a>;
                    })}
                    <p className="small muted">{isHi ? `सत्यापित ${new Date(f.verifiedAt || Date.now()).toLocaleDateString('hi-IN')}` : `Verified ${new Date(f.verifiedAt || Date.now()).toLocaleDateString()}`}</p>
                  </details>
                </article>
              );
            })}
          </section>
        )}
        {lesson?.narrationHindi && (
          <details className="card topic-section">
            <summary>{isHi ? 'हिंदी प्रतिलेख' : 'Hindi transcript'}</summary>
            <p lang="hi" className="transcript">{lesson.narrationHindi}</p>
          </details>
        )}
        {topicQuestions.length > 0 && (
          <section className="card topic-section">
            <h2>{isHi ? 'सामान्य भ्रम एवं स्मरण संकेत' : 'Common confusions & memory cues'}</h2>
            {topicQuestions.slice(0, 3).map(q => {
              const cueText = typeof q.memoryCue === 'object' && q.memoryCue !== null
                ? text(q.memoryCue)
                : typeof q.memoryCue === 'string'
                ? q.memoryCue
                : '';
              return cueText ? <p key={q.id}>{cueText}</p> : null;
            })}
          </section>
        )}
      </section>
      <aside>
        <div className="card topic-section sticky">
          <span className="eyebrow">{isHi ? 'पक्का करें' : 'MAKE IT STICK'}</span>
          <h2>{isHi ? 'शीघ्र स्मरण बहुत दूर तक जाता है।' : 'A quick recall goes a long way.'}</h2>
          <p>{isHi ? 'अपने नोट्स बंद करें। विचार को याद करें। फिर देखें कि यह कैसे जुड़ता है।' : 'Close your notes. Retrieve the idea. Then see how it connects.'}</p>
          {topicQuestions.length ? <>
            <Link className="button full" to={`/practice?topic=${topic.id}&count=${topicQuestions.length}`}>{isHi ? `त्वरित जांच (${topicQuestions.length} प्रश्न)` : `Quick check (${topicQuestions.length} question${topicQuestions.length > 1 ? 's' : ''})`}<ArrowRight size={17} /></Link>
            <Link className="secondary full" to={`/practice?topic=${topic.id}`}>{isHi ? 'इस विषय का अभ्यास करें' : 'Practice this topic'}</Link>
            <p className="small muted">{topicQuestions.length} {isHi ? (topicQuestions.length > 1 ? 'सत्यापित प्रश्न उपलब्ध हैं।' : 'सत्यापित प्रश्न उपलब्ध है।') : (topicQuestions.length > 1 ? 'verified questions available.' : 'verified question available.')}</p>
          </> : <>
            <p>{topic.questionCount ? (isHi ? 'यहाँ अभ्यास करने के लिए इस विषय का पैक डाउनलोड करें।' : 'Download this subject’s pack to practice here.') : (isHi ? 'प्रमाण एवं उत्तर समीक्षा के बाद प्रश्न दिखाई देंगे।' : 'Questions will appear after evidence and answer review.')}</p>
            <DownloadLink />
          </>}
          <hr />
          <p className="small"><ShieldCheck size={16} /> {isHi ? 'केवल देखना ही निपुणता स्थापित नहीं करता। आपका स्मरण और रिविज़न इतिहास ही वास्तविक प्रगति निर्धारित करता है।' : 'Watching alone does not establish mastery. Your recall and revision history determine progress.'}</p>
        </div>
      </aside>
    </div>
  </>;
}
