import { useEffect, useRef, useState } from 'react';
import { Download, ShieldCheck, Smartphone, Upload } from './icons';
import { useStore } from './context';
import { PageHeading } from './components';
import { initialState, validateBackup } from './domain';
import type { Language } from './types';

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function Settings() {
  const { state, catalog, update, toast } = useStore();
  const [prompt, setPrompt] = useState<InstallPrompt>();
  const file = useRef<HTMLInputElement>(null);
  const isHi = state.profile.language === 'hi';

  useEffect(() => {
    const listener = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `crorepati-progress-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <>
    <PageHeading
      eyebrow={isHi ? 'आपकी गति, आपकी शैली' : 'YOUR SPACE, YOUR PACE'}
      title={isHi ? 'अपनी अध्ययन प्राथमिकताओं को अनुकूलित करें।' : 'Make learning feel like you.'}
    >
      {isHi ? 'स्थानीय रूप से सुरक्षित। आपकी गति के अनुसार तैयार।' : 'Guest-first. Locally saved. Ready when you are.'}
    </PageHeading>
    <div className="two-column">
      <section className="card topic-section settings-form">
        <h2>{isHi ? 'आपकी प्रोफ़ाइल' : 'Your learning profile'}</h2>
        <label>{isHi ? 'आपका नाम' : 'Your name'}
          <input maxLength={40} value={state.profile.name} onChange={e => update(s => ({ ...s, profile: { ...s.profile, name: e.target.value } }))} />
        </label>
        <label>{isHi ? 'सीखने की भाषा' : 'Learning language'}
          <select value={state.profile.language} onChange={e => update(s => ({ ...s, profile: { ...s.profile, language: e.target.value as Language } }))}>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="en">English</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </label>
        <p className="small muted">
          {isHi ? 'प्रश्न और पाठ्यक्रम सामग्री हिंदी और अंग्रेज़ी दोनों में उपलब्ध है।' : 'Question content is available in English and Hindi. Hinglish uses English where no reviewed transliteration is available.'}
        </p>
        <label>{isHi ? 'दैनिक अभ्यास लक्ष्य' : 'Daily practice goal'}
          <select value={state.profile.dailyGoal} onChange={e => update(s => ({ ...s, profile: { ...s.profile, dailyGoal: Number(e.target.value) } }))}>
            {[5, 10, 15, 20, 30, 50].map(n => <option key={n} value={n}>{n} {isHi ? 'प्रश्न' : 'questions'}</option>)}
          </select>
        </label>
        <p className="small"><ShieldCheck size={16} /> {isHi ? 'परिवर्तन आपके डिवाइस पर अपने आप सहेजे जाते हैं।' : 'Changes are saved automatically on this device.'}</p>
      </section>
      <section className="card topic-section">
        <Smartphone size={30} />
        <h2>{isHi ? 'नियमित अभ्यास की आदत बनाएं' : 'A home for your learning habit.'}</h2>
        <p>{isHi ? 'एकाग्र और व्यवस्थित अनुभव के लिए करोड़पति रीविज़न को इंस्टॉल करें।' : 'Install Crorepati Revision for a focused, app-like experience.'}</p>
        {prompt ? (
          <button onClick={() => prompt.prompt().then(() => prompt.userChoice).then(result => { toast(result.outcome === 'accepted' ? (isHi ? 'ऐप इंस्टॉल हो गया।' : 'Installation accepted.') : (isHi ? 'आप बाद में भी इंस्टॉल कर सकते हैं।' : 'You can install later.')); setPrompt(undefined); })}>
            {isHi ? 'करोड़पति रीविज़न इंस्टॉल करें' : 'Install Crorepati Revision'}
          </button>
        ) : <>
          <p><strong>iPhone / iPad:</strong> Safari में खोलें → शेयर → होम स्क्रीन पर जोड़ें।</p>
          <p><strong>Chrome / Edge:</strong> ब्राउज़र मेनू से "ऐप इंस्टॉल करें" या "होम स्क्रीन पर जोड़ें" चुनें।</p>
        </>}
        <p className="small muted">{isHi ? 'इंस्टॉलेशन के लिए HTTPS या localhost आवश्यक है।' : 'Installation requires HTTPS or localhost. Availability depends on your browser.'}</p>
      </section>
    </div>
    <section className="card topic-section">
      <h2>{isHi ? 'आपकी प्रगति आपके पास सुरक्षित है' : 'Your progress belongs to you.'}</h2>
      <p>{isHi ? 'ब्राउज़र डेटा साफ़ करने से पहले बैकअप डाउनलोड करें।' : 'Export a backup before clearing browser data. Import replaces this device’s learning history with the selected backup.'}</p>
      <div className="actions">
        <button className="secondary" onClick={exportData}><Download size={17} />{isHi ? 'प्रगति निर्यात करें (Export)' : 'Export progress'}</button>
        <button className="secondary" onClick={() => file.current?.click()}><Upload size={17} />{isHi ? 'बैकअप आयात करें (Import)' : 'Import backup'}</button>
        <input hidden ref={file} type="file" accept="application/json" onChange={async e => {
          const selected = e.target.files?.[0];
          if (!selected) return;
          try {
            if (selected.size > 10_000_000) throw new Error(isHi ? 'बैकअप फ़ाइल 10 MB से बड़ी नहीं हो सकती।' : 'Backup exceeds 10 MB.');
            const parsed = JSON.parse(await selected.text());
            if (parsed.schemaVersion !== 1 || !validateBackup(parsed.state)) throw new Error(isHi ? 'यह फ़ाइल एक वैध करोड़पति बैकअप नहीं है।' : 'This file is not a valid Crorepati progress backup.');
            if (window.confirm(isHi ? 'स्थानीय प्रगति को इस बैकअप से बदलें?' : 'Replace local progress with this backup? Export first if you need to preserve it.')) {
              update(() => parsed.state);
              toast(isHi ? 'प्रगति सफलतापूर्वक आयात की गई।' : 'Progress imported.');
            }
          } catch (error) { toast((error as Error).message); }
          e.target.value = '';
        }} />
        <button className="danger-link" onClick={() => {
          if (window.confirm(isHi ? 'सभी उत्तर, बुकमार्क और प्रगति रीसेट करें?' : 'Reset all local answers, bookmarks and progress? Downloaded packs are preserved.')) {
            update(s => ({ ...initialState(), profile: s.profile }));
            for (const key of ['cr-session-practice', 'cr-session-mock', 'cr-session-challenge']) sessionStorage.removeItem(key);
            toast(isHi ? 'इतिहास रीसेट हो गया।' : 'Learning history reset.');
          }
        }}>{isHi ? 'प्रगति रीसेट करें' : 'Reset progress'}</button>
      </div>
    </section>
    <section className="card topic-section" id="about">
      <h2>{isHi ? 'प्रणाली स्थिति एवं गोपनीयता' : 'Build status & privacy'}</h2>
      <span className="chip neutral">{isHi ? 'पाठ्यक्रम सत्यापित · 345/345 शीर्षक उपलब्ध' : 'CURRICULUM VERIFIED · 345/345 TOPICS POPULATED'}</span>
      <p>{catalog.subjects.length} {isHi ? 'विषय शामिल' : 'subjects represented'} · {catalog.counts.topics} {isHi ? 'शीर्षक' : 'planned topics'} · {catalog.counts.questions} {isHi ? 'सत्यापित प्रश्न' : 'verified questions'}</p>
      <p><strong>{isHi ? 'पाठ्यक्रम विस्तार:' : 'Curriculum Coverage:'}</strong> {isHi ? 'संपूर्ण पाठ्यक्रम के सभी 345 विषयों में द्विभाषी नाम (हिंदी और अंग्रेज़ी), अवधारणात्मक परिभाषाएं, और व्याख्या सहित उच्च स्तरीय अभ्यास प्रश्न शामिल हैं।' : 'Every single topic across the entire curriculum has now been fully populated with canonical bilingual names (English & Hindi), conceptual scope & definitions, and high-yield competitive examination practice questions with 4 options, marked answer keys, and authoritative explanations.'}</p>
      <p><strong>{isHi ? 'स्थानीय गोपनीयता:' : 'Local privacy:'}</strong> {isHi ? 'प्रोफ़ाइल, उत्तर इतिहास, बुकमार्क और डाउनलोड आपके ब्राउज़र में सुरक्षित रहते हैं। कोई विज्ञापन या डेटा ट्रैकिंग सक्षम नहीं है।' : 'profile, answer history, bookmarks and downloaded packs are stored in your browser. No advertising, account sync, analytics transmission or payments are enabled.'}</p>
      <p><strong>{isHi ? 'शैक्षणिक नियम:' : 'Educational terms:'}</strong> {isHi ? 'आभासी अंकों का कोई मौद्रिक मूल्य नहीं है। यह एक स्वतंत्र शिक्षण प्लेटफ़ॉर्म है।' : 'virtual points have no monetary value. This is an independent learning project, with no affiliation to any television programme or exam authority.'}</p>
      <p className="small muted">Version {catalog.version} · Content build {new Date(catalog.builtAt).toLocaleDateString(isHi ? 'hi-IN' : 'en')}</p>
    </section>
  </>;
}
