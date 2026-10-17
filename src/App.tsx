import LiveSetup from './LiveSetup';
import { exams } from './exams';
import ExamSyllabus from './ExamSyllabus';
import CurrentNews from './CurrentNews';
import PreservedBank from './PreservedBank';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Bookmark, Check, ChevronRight, Download, Flame, Home, LayoutGrid, Maximize, Menu, Minimize, Search, Settings, ShieldCheck, Sparkles, Target, Trophy, WifiOff, X } from './icons';
import { useStore } from './context';
import { PageHeading, SectionTitle, SubjectCard } from './components';
import { revisionQuestions } from './domain';
import Learn, { TopicPage } from './Learn';
import type { Language } from './types';
const Practice = lazy(() => import('./Practice'));
const Library = lazy(() => import('./Library'));
const Downloads = lazy(() => import('./Downloads'));
const SettingsPage = lazy(() => import('./Settings'));

class ErrorBoundary extends React.Component<{ children: React.ReactNode; isHi: boolean }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode; isHi: boolean }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('View Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
          <h2>{this.props.isHi ? 'पृष्ठ लोड करने में समस्या हुई' : 'Something went wrong'}</h2>
          <p className="muted">{this.props.isHi ? 'आप मुख्य पृष्ठ पर लौट सकते हैं या पृष्ठ पुनः लोड कर सकते हैं।' : 'An unexpected error occurred. You can return home or reload the page.'}</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button className="button" onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
              {this.props.isHi ? 'पुनः लोड करें' : 'Reload page'}
            </button>
            <Link to="/learn" className="button secondary" onClick={() => this.setState({ hasError: false })}>
              {this.props.isHi ? 'पाठ्यक्रम पर जाएं' : 'Go to Learn'}
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const translations = {
  en: ['Home', 'Learn', 'Practice', 'Smart revision', 'Challenge', 'Performance', 'Downloads', 'Settings'],
  hi: ['होम', 'सीखें', 'अभ्यास', 'स्मार्ट रिविज़न', 'चुनौती', 'प्रदर्शन', 'डाउनलोड', 'सेटिंग्स'],
  hinglish: ['Home', 'Seekhein', 'Practice', 'Revision', 'Challenge', 'Progress', 'Downloads', 'Settings'],
};
const navigation = [ ['/', Home], ['/learn', BookOpen], ['/practice', Target], ['/revision', Sparkles], ['/challenge', Trophy], ['/performance', BarChart3], ['/downloads', Download], ['/settings', Settings] ] as const;

export default function App() {
  const { state, update, toast } = useStore();
  const [menu, setMenu] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [swUpdate, setSwUpdate] = useState<ServiceWorkerRegistration>();
  const [fullscreen, setFullscreen] = useState(false);
  const location = useLocation();
  const isHi = state.profile.language === 'hi';

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); document.getElementById('main')?.focus(); }, [location.pathname]);
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    const onSwUpdate = (e: Event) => setSwUpdate((e as CustomEvent).detail);
    const swError = () => toast(isHi ? 'ऑफ़लाइन सेटअप विफल रहा। आप ऑनलाइन सीख सकते हैं।' : 'Offline setup failed. You can keep learning online; retry by reloading.');
    window.addEventListener('online', online); window.addEventListener('offline', online); window.addEventListener('pwa-update', onSwUpdate); window.addEventListener('pwa-error', swError);
    navigator.serviceWorker?.getRegistration().then(r => { if (r?.waiting) setSwUpdate(r); });
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', online); window.removeEventListener('pwa-update', onSwUpdate); window.removeEventListener('pwa-error', swError); };
  }, [toast, isHi]);

  // Public data views render before onboarding so the generated bank can be
  // inspected without creating a guest profile first.
  const publicPaths = new Set(['/syllabus', '/preserved', '/live-setup', '/news']);
  if (!state.profile.onboarded) {
    if (location.pathname === '/') return <Navigate to="/syllabus" replace />;
    if (location.pathname === '/start') return <Onboarding />;
    if (!publicPaths.has(location.pathname)) return <Navigate to="/syllabus" replace />;
  }

  return <div className="app-shell"><a href="#main" className="skip-link">{isHi ? 'सामग्री पर जाएं' : 'Skip to content'}</a>
    <aside className={`sidebar ${menu ? 'open' : ''}`}>
      <Link to="/" className="brand"><span className="brand-mark">c<span>r</span></span><span>Crorepati<small>REVISION</small></span></Link>
      <button className="icon-button close-menu" onClick={() => setMenu(false)} aria-label="Close navigation"><X /></button>
      <p className="nav-label">{isHi ? 'आपका अध्ययन क्षेत्र' : 'YOUR LEARNING SPACE'}</p>
      <nav aria-label="Primary navigation">{navigation.map(([to, Icon], i) => <NavLink key={to} to={to} end={to === '/'}><Icon size={20} /><span>{translations.en[i]} / {translations.hi[i]}</span>{i === 3 && <span className="nav-dot" />}</NavLink>)}<NavLink to="/syllabus"><BookOpen size={20}/><span>Exam Syllabus / पाठ्यक्रम</span></NavLink><NavLink to="/news"><Sparkles size={20}/><span>Current News / समाचार</span></NavLink><NavLink to="/preserved"><Bookmark size={20}/><span>Preserved Bank / सुरक्षित प्रश्न</span></NavLink><NavLink to="/live-setup"><Settings size={20}/><span>Live setup / लाइव सेटअप</span></NavLink></nav>
      <div className="sidebar-bottom"><div className="guest-symbol">{state.profile.name.slice(0, 1).toUpperCase()}</div><div><strong>{state.profile.name}</strong><small>{isHi ? 'अतिथि · इस डिवाइस पर सहेजा गया' : 'Guest · saved on this device'}</small></div><ShieldCheck size={18} /></div>
    </aside>
    {menu && <button className="menu-overlay" aria-label="Dismiss navigation" onClick={() => setMenu(false)} />}
    <div className="main-column"><header className="topbar">
      <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu /></button>
      <div className="topbar-breadcrumb">{isHi ? 'ज्ञान की आपकी दैनिक खुराक' : 'Your daily dose of discovery'} <span>✦</span></div>
      <div className="topbar-actions">
        <Link to="/search" className="search-shortcut" aria-label="Search knowledge"><Search size={18} /><span>{isHi ? 'कुछ भी खोजें' : 'Search anything'}</span></Link>
        <button
          type="button"
          aria-label="Toggle language between English and Hindi"
          className="language-indicator"
          title="Click to toggle language / भाषा बदलने के लिए क्लिक करें"
          style={{ cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onClick={() => {
            const nextLang: Language = state.profile.language === 'hi' ? 'en' : 'hi';
            update(s => ({ ...s, profile: { ...s.profile, language: nextLang } }));
            toast(nextLang === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है।' : 'Language switched to English.');
          }}
        >
          {state.profile.language === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
        <Link to="/settings" className="avatar" aria-label="Profile settings">{state.profile.name.slice(0, 1).toUpperCase()}</Link>
      </div>
    </header>
      {offline && <div className="offline-banner" role="status"><WifiOff size={16} /> {isHi ? 'आप ऑफ़लाइन हैं। डाउनलोड किए गए प्रश्न और स्थानीय प्रगति उपलब्ध हैं।' : 'You’re offline. Downloaded questions and local progress are available.'}</div>}
      {swUpdate && <div className="update-banner">{isHi ? 'एक नया संस्करण तैयार है।' : 'A new version is ready. Finish your current session, then '} <button onClick={() => { navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); swUpdate.waiting?.postMessage({ type: 'SKIP_WAITING' }); }}>{isHi ? 'ऐप अपडेट करें' : 'update the app'}</button>.</div>}
      <main id="main" tabIndex={-1}><Suspense fallback={<p className="card">{isHi ? 'आपका अध्ययन क्षेत्र खोला जा रहा है…' : 'Opening your learning space…'}</p>}><ErrorBoundary isHi={isHi}><Routes><Route path="/live-setup" element={<LiveSetup/>}/><Route path="/syllabus" element={<ExamSyllabus/>}/><Route path="/news" element={<CurrentNews/>}/><Route path="/preserved" element={<PreservedBank/>}/>
        <Route path="/" element={<HomePage />} />
        <Route path="/start" element={<Onboarding />} />
        <Route path="/learn/:subjectId?" element={<Learn />} />
        <Route path="/topic/:topicId" element={<TopicPage />} />
        <Route path="/practice/*" element={<Practice key={location.search} />} />
        <Route path="/challenge" element={<Practice key="challenge" mode="challenge" />} />
        <Route path="/mocks" element={<Practice key="mock" mode="mock" />} />
        {['revision', 'notebook', 'bookmarks', 'search', 'performance', 'current-affairs', 'pyq'].map(page => <Route key={page} path={`/${page}`} element={<Library page={page} />} />)}
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></ErrorBoundary></Suspense></main>
      <footer className="app-footer"><span>{isHi ? 'आज जिज्ञासा। कल आत्मविश्वास।' : 'Curiosity today. Confidence tomorrow.'}</span><Link to="/settings#about">{isHi ? 'निर्माण स्थिति एवं गोपनीयता' : 'Build status & privacy'}</Link></footer>
    </div>
    <nav className="bottom-nav" aria-label="Mobile navigation">{navigation.slice(0, 4).map(([to, Icon], i) => <NavLink key={to} to={to} end={to === '/'}><Icon size={21} /><span>{translations.en[i]} / {translations.hi[i]}</span></NavLink>)}<Link to="/search"><Search size={21} /><span>{isHi ? 'खोजें' : 'Search'}</span></Link></nav>
  </div>;
}

function Onboarding() {
  const { catalog, state, update } = useStore();
  const [interests, setInterests] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [exam, setExam] = useState('all');
  const isHi = state.profile.language === 'hi';

  return <main className="onboarding">
    <div className="onboarding-art">
      <Link to="/" className="brand light"><span className="brand-mark">c<span>r</span></span><span>Crorepati<small>REVISION</small></span></Link>
      <span className="eyebrow">{isHi ? 'जिज्ञासु रहें। प्रतिदिन आगे बढ़ें।' : 'STAY CURIOUS. GROW EVERY DAY.'}</span>
      <h1>{isHi ? <>ज्ञान का एक संसार।<br /><em>आपकी अपनी गति।</em></> : <>A world of knowledge.<br /><em>Your own pace.</em></>}</h1>
      <p>{isHi ? 'थोड़ा और समझें। थोड़ा अधिक समय तक याद रखें। एक ऐसी अध्ययन आदत बनाएं जो हमेशा आपके साथ रहे।' : 'Understand a little more. Remember a little longer. Build a learning habit that stays with you.'}</p>
      <div className="orbit-art" aria-hidden="true"><div className="orbit o1" /><div className="orbit o2" /><div className="planet" /><span className="star star1">✦</span><span className="star star2">✦</span><div className="satellite" /></div>
      <div className="onboarding-proof"><ShieldCheck /> {isHi ? <>स्रोत-आधारित अध्ययन <span>·</span> अतिथि-प्रथम <span>·</span> ऑफ़लाइन-सक्षम</> : <>Source-grounded learning <span>·</span> Guest-first <span>·</span> Offline-ready</>}</div>
    </div>
    <section className="onboarding-form">
      <div className="chip">{isHi ? 'आइए इसे आपका बनाएं' : 'LET’S MAKE THIS YOURS'}</div>
      <h2>{isHi ? 'जिज्ञासा आपको कहाँ ले जाएगी?' : 'Where will curiosity take you?'}</h2>
      <p className="muted">{isHi ? 'अपनी रुचियों का चयन करें। आप किसी भी समय सभी 26 विषयों को देख सकते हैं।' : 'Pick a few interests. You can explore all 26 subjects anytime.'}</p>
      <label>Language / अध्ययन भाषा
        <select value={state.profile.language} onChange={e => update(s => ({ ...s, profile: { ...s.profile, language: e.target.value as Language } }))}>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="en">English</option>
          <option value="hinglish">Hinglish</option>
        </select>
      </label>
      <label>{isHi ? 'आपका नाम (वैकल्पिक)' : 'Your name (optional)'}
        <input maxLength={40} placeholder={isHi ? 'हम आपको क्या कहकर संबोधित करें?' : 'What should we call you?'} value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label>{isHi ? 'अध्ययन लक्ष्य' : 'Learning goal'}
        <select value={exam} onChange={e => setExam(e.target.value)}>
          {exams.map(x => <option key={x.id} value={x.id}>{x.en} / {x.hi}</option>)}
        </select>
      </label>
      <div className="interest-grid">
        {catalog.subjects.filter(s => ['S01', 'S03', 'S05', 'S06', 'S08', 'S09', 'S12', 'S13'].includes(s.id)).map(s => (
          <button key={s.id} className={interests.includes(s.id) ? 'selected' : ''} aria-pressed={interests.includes(s.id)} onClick={() => setInterests(old => old.includes(s.id) ? old.filter(x => x !== s.id) : [...old, s.id])}>
            {isHi && s.titleHindi ? s.titleHindi : s.shortTitle}
            {interests.includes(s.id) && <Check size={15} />}
          </button>
        ))}
      </div>
      <button className="button full" onClick={() => update(s => ({ ...s, profile: { ...s.profile, onboarded: true, name: name.trim() || (isHi ? 'अध्येता' : 'Learner'), exam, interests } }))}>
        {isHi ? 'अतिथि के रूप में जारी रखें' : 'Continue as guest'}<ArrowRight size={18} />
      </button>
      <p className="small muted center">{isHi ? 'खाते की आवश्यकता नहीं है। आपकी प्रगति इसी डिवाइस पर सुरक्षित रहती है।' : 'No account needed. Your progress stays on this device.'}</p>
      <p className="small build-note">{isHi ? `सत्यापित चेकपॉइंट · ${catalog.counts.questions} सत्यापित प्रश्न` : `Development checkpoint · ${catalog.counts.questions} verified questions`}</p>
    </section>
  </main>;
}

function HomePage() {
  const { state, questions, catalog } = useStore();
  const isHi = state.profile.language === 'hi';
  const now = new Date();
  const today = state.attempts.filter(a => new Date(a.at).toDateString() === now.toDateString()).length;
  const accuracy = state.attempts.length ? Math.round(state.attempts.filter(a => a.correct).length / state.attempts.length * 100) : null;
  const due = revisionQuestions(questions, state).length;
  const availableTopics = catalog.subjects.flatMap(s => s.chapters.flatMap(c => c.topics)).filter(t => t.questionCount > 0);
  const firstTopic = availableTopics.find(t => t.subjectId === 'S09') || availableTopics[0];
  const chosen = [...catalog.subjects].sort((a, b) => Number(state.profile.interests.includes(b.id)) - Number(state.profile.interests.includes(a.id))).slice(0, 6);

  return <>
    <PageHeading
      eyebrow={now.toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
      title={isHi ? 'प्रतिदिन थोड़ा और प्रबुद्ध।' : 'A little wiser, every day.'}
    >
      {isHi ? `वापसी पर स्वागत है, ${state.profile.name}। एक नई खोज के लिए जगह बनाएं।` : `Welcome back, ${state.profile.name}. Make room for one new discovery.`}
    </PageHeading>
    <div className="home-hero">
      <div className="hero-copy">
        <span className="hero-kicker"><span /> {isHi ? 'आपका अगला छोटा कदम' : 'YOUR NEXT SMALL STEP'}</span>
        <h2>{isHi ? <>महान ज्ञान।<br /><em>दैनिक छोटी जीतें।</em></> : <>Big knowledge.<br /><em>Small, daily wins.</em></>}</h2>
        <p>{isHi ? 'एक विचार को समझें, उसका अभ्यास करें और उसे अपना बनाएं। आपकी अगली खोज बस एक प्रश्न दूर है।' : 'Explore an idea, put it into practice, and make it yours. Your next discovery is just a question away.'}</p>
        <Link to="/practice" className="button light-button">{isHi ? 'आज का अभ्यास शुरू करें' : 'Start today’s practice'}<ArrowRight size={18} /></Link>
        <div className="hero-meta"><ShieldCheck size={15} /> {isHi ? <>सत्यापित स्रोत <span>·</span> अपनी गति से</> : <>Verified sources <span>·</span> At your own pace</>}</div>
      </div>
      <div className="hero-illustration" aria-hidden="true">
        <div className="orbit-art"><div className="orbit o1" /><div className="orbit o2" /><div className="planet" /><div className="satellite" /><span className="star star1">✦</span><span className="star star2">✦</span></div>
        <div className="floating-note"><LightbulbIcon /> {isHi ? 'जिज्ञासु रहें।' : 'Stay curious.'}</div>
        <div className="floating-mini">{isHi ? 'प्रतिदिन थोड़ा और' : 'a little more, every day'}</div>
      </div>
    </div>
    <div className="stats-row">
      <div className="stat"><span className="stat-icon peach"><Flame /></span><div><strong>{today}<small> / {state.profile.dailyGoal}</small></strong><p>{isHi ? 'आज का अभ्यास' : 'Today’s practice'}</p></div><div className="mini-progress"><span style={{ width: `${Math.min(100, today / state.profile.dailyGoal * 100)}%` }} /></div></div>
      <div className="stat"><span className="stat-icon lavender"><Target /></span><div><strong>{accuracy === null ? '—' : `${accuracy}%`}</strong><p>{isHi ? 'कुल सटीकता' : 'Overall accuracy'}</p></div></div>
      <Link to="/revision" className="stat"><span className="stat-icon mint"><Sparkles /></span><div><strong>{due}</strong><p>{isHi ? 'रिविज़न के लिए प्रश्न' : 'Questions due for revision'}</p></div><ChevronRight size={18} /></Link>
    </div>
    <div className="home-columns">
      <section>
        <SectionTitle title={isHi ? 'अपनी अगली खोज ढूंढें' : 'Find your next discovery'} link="/learn" label={isHi ? 'सभी 26 विषय' : 'All 26 subjects'} />
        <div className="subject-grid">{chosen.map(s => <SubjectCard subject={s} key={s.id} />)}</div>
        <SectionTitle title={isHi ? 'शुरुआत के लिए एक अच्छा स्थान' : 'A good place to begin'} />
        {firstTopic && <Link to={`/topic/${firstTopic.id}`} className="feature-lesson card">
          <div className="lesson-art"><div className="tiny-planet" /><span>{isHi ? <>विशेष ज्ञान<br />का अन्वेषण</> : <>EXPLORE<br />THE EXTRAORDINARY</>}</span></div>
          <div>
            <span className="eyebrow">{isHi ? 'अंतरिक्ष और खगोल विज्ञान' : 'SPACE & ASTRONOMY'}</span>
            <h3>{isHi && firstTopic.titleHindi ? firstTopic.titleHindi : firstTopic.title}</h3>
            <p>{isHi ? 'अवधारणाओं को समझें। अपने ज्ञान की जांच करें।' : 'Explore the concepts. Test what you know.'}</p>
            <span className="text-link">{isHi ? 'विषय खोलें' : 'Open topic'}<ArrowRight size={16} /></span>
          </div>
        </Link>}
      </section>
      <aside className="home-right">
        <SectionTitle title={isHi ? 'आपका अध्ययन टूलकिट' : 'Your learning toolkit'} />
        <div className="toolkit card">{[
          ['/notebook', Bookmark, isHi ? 'गलतियों को प्रगति में बदलें' : 'Turn mistakes into progress', isHi ? `${state.wrongIds.length} प्रश्न आपकी नोटबुक में` : `${state.wrongIds.length} questions in your notebook`],
          ['/mocks', Target, isHi ? 'अभ्यास को प्रभावी बनाएं' : 'Make practice count', isHi ? 'समयबद्ध या सामान्य मॉक टेस्ट दें' : 'Build a timed or untimed mock'],
          ['/bookmarks', BookOpen, isHi ? 'महत्वपूर्ण खोजों को संजोएं' : 'Keep the good discoveries', isHi ? `${state.bookmarks.length} बाद के लिए सहेजे गए` : `${state.bookmarks.length} saved for later`]
        ].map(([url, Icon, title, detail]) => {
          const ItemIcon = Icon as typeof Bookmark;
          return <Link to={url as string} key={url as string}><ItemIcon size={22} /><div><h3>{title as string}</h3><p>{detail as string}</p></div><ChevronRight size={17} /></Link>;
        })}</div>
        <Link to="/challenge" className="challenge-card">
          <span className="chip"><Trophy size={14} /> {isHi ? 'करोड़पति चुनौती' : 'THE CROREPATI CHALLENGE'}</span>
          <h3>{isHi ? <>15 चरण।<br />एक जिज्ञासु मन।</> : <>15 stages.<br />One curious mind.</>}</h3>
          <p>{isHi ? <>एक ताज़ा चुनौती। आभासी अंक।<br />आप कितनी दूर जा सकते हैं?</> : <>A fresh challenge. Virtual points.<br />How far can you go?</>}</p>
          <span className="text-link">{isHi ? 'चुनौती स्वीकार करें' : 'Take the challenge'}<ArrowRight size={17} /></span>
          <Trophy className="trophy-art" size={88} strokeWidth={1} />
        </Link>
        <div className="honesty-note">
          <ShieldCheck size={19} />
          <p><strong>{isHi ? 'ज्ञान जिसे आप प्रमाणित कर सकते हैं।' : 'Knowledge you can trace.'}</strong><br />{isHi ? `${catalog.counts.questions} सत्यापित प्रश्न इस चेकपॉइंट में उपलब्ध हैं। प्रत्येक उत्तर के साथ स्रोत जुड़े हैं।` : `${catalog.counts.questions} verified questions in this checkpoint. Sources are linked to every answer. Video lessons are in preparation.`}</p>
        </div>
      </aside>
    </div>
    <div className="explore-links">
      <Link to="/current-affairs">{isHi ? 'समसामयिकी (करंट अफेयर्स)' : 'Current affairs'}<ArrowRight size={16} /></Link>
      <Link to="/pyq">{isHi ? 'पिछले वर्षों के प्रश्न (PYQ)' : 'Previous year questions'}<ArrowRight size={16} /></Link>
      <Link to="/downloads">{isHi ? 'ऑफ़लाइन सीखें' : 'Learn offline'}<Download size={16} /></Link>
    </div>
  </>;
}
function LightbulbIcon() { return <LayoutGrid size={20} strokeWidth={1.5} />; }
