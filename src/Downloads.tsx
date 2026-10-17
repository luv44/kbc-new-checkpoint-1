import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, HardDrive, Pause, Trash2 } from './icons';
import { useStore } from './context';
import { PageHeading } from './components';
import DownloadPack from './DownloadPack';
import { deletePack, downloadPack, downloadedPacks } from './storage';
import type { PackMeta } from './types';

export default function Downloads() {
  const { catalog, refreshPacks, toast, state } = useStore();
  const [installed, setInstalled] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [usage, setUsage] = useState<StorageEstimate>();
  const [subject, setSubject] = useState('all');
  const controllers = useRef<Record<string, AbortController>>({});
  const isHi = state.profile.language === 'hi';

  const refresh = async () => {
    setInstalled(Object.fromEntries((await downloadedPacks()).map(p => [p.id, p.sha256])));
    setUsage(await navigator.storage?.estimate());
    await refreshPacks();
  };

  useEffect(() => {
    refresh().catch(e => toast(e.message));
    return () => Object.values(controllers.current).forEach(c => c.abort());
  }, []);

  async function install(meta: PackMeta) {
    const controller = new AbortController();
    controllers.current[meta.id] = controller;
    setStatus(s => ({ ...s, [meta.id]: isHi ? 'डाउनलोड हो रहा है...' : 'Downloading' }));
    try {
      await downloadPack(meta, controller.signal, n => setProgress(s => ({ ...s, [meta.id]: n })));
      setStatus(s => ({ ...s, [meta.id]: isHi ? 'सत्यापित · ऑफ़लाइन उपलब्ध' : 'Integrity checked · available offline' }));
      await refresh();
    } catch (e) {
      const error = e as Error;
      setStatus(s => ({ ...s, [meta.id]: error.name === 'AbortError' ? (isHi ? 'रोक दिया गया। तैयार होने पर पुनः शुरू करें।' : 'Paused. Resume when ready.') : error.message }));
    } finally {
      delete controllers.current[meta.id];
    }
  }

  return <>
    <DownloadPack compact />
    <PageHeading
      eyebrow={isHi ? 'आपकी लाइब्रेरी, आपके साथ' : 'YOUR LIBRARY, WHEREVER YOU GO'}
      title={isHi ? 'ऑफ़लाइन अध्ययन सामग्री डाउनलोड करें।' : 'Take knowledge with you.'}
    >
      {isHi ? 'केवल वही डाउनलोड करें जिसकी आवश्यकता है। पैक सहेजे जाने से पहले अखंडता जांची जाती है।' : 'Download only what you need. Question packs are hash-checked before they’re saved.'}
    </PageHeading>
    <div className="storage-card card">
      <HardDrive size={30} />
      <div>
        <h2>{usage ? `${((usage.usage || 0) / 1048576).toFixed(1)} MB ${isHi ? 'उपयोग में' : 'used by this app'}` : (isHi ? 'ब्राउज़र मेमोरी' : 'Browser storage')}</h2>
        <p>{usage?.quota ? `${Math.round(usage.quota / 1048576).toLocaleString()} MB ${isHi ? 'अनुमानित ब्राउज़र कोटा।' : 'estimated browser quota. '}` : ''}{isHi ? 'डिवाइस द्वारा कैश खाली किया जा सकता है; सेटिंग्स से अपनी प्रगति निर्यात करें।' : 'Browser storage may be cleared by the device; export your progress in Settings.'}</p>
      </div>
      <button className="secondary" onClick={() => navigator.storage?.persist?.().then(ok => toast(ok ? (isHi ? 'स्थायी संग्रहण सक्षम किया गया।' : 'Persistent storage granted.') : (isHi ? 'ब्राउज़र ने स्थायी संग्रहण नहीं दिया।' : 'Your browser did not grant persistent storage. Export important progress.'))).catch(e => toast(e.message))}>
        {isHi ? 'डाउनलोड सुरक्षित रखें' : 'Keep downloads'}
      </button>
    </div>
    <div className="download-intro">
      <h2>{isHi ? 'सत्यापित प्रश्न पैक' : 'Verified question packs'}</h2>
      <label>{isHi ? 'विषय चुनें' : 'Filter subject'}
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="all">{isHi ? 'सभी विषय' : 'All subjects'}</option>
          {catalog.subjects.filter(s => s.questionCount).map(s => <option key={s.id} value={s.id}>{isHi && s.titleHindi ? s.titleHindi : s.shortTitle}</option>)}
        </select>
      </label>
    </div>
    <div className="pack-list">
      {catalog.packs.filter(p => subject === 'all' || p.subjectId === subject).map(p => {
        const active = !!controllers.current[p.id];
        const ready = installed[p.id] === p.sha256;
        return (
          <section className="card pack-card" key={p.id}>
            <div className="stat-icon mint">{ready ? <CheckCircle2 /> : <Download />}</div>
            <div className="pack-info">
              <h3>{p.title}</h3>
              <p>{p.questionCount} {isHi ? 'प्रश्न' : 'questions'} · {(p.size / 1024).toFixed(1)} KB · {p.chapterId ? (isHi ? 'अध्याय पैक' : 'Chapter pack') : (isHi ? 'विषय पैक' : 'Subject pack')}</p>
              <p className="small muted" role="status">
                {status[p.id] || (ready ? (isHi ? 'सत्यापित · ऑफ़लाइन उपलब्ध' : 'Integrity checked · available offline') : installed[p.id] ? (isHi ? 'अपडेट उपलब्ध है' : 'An updated version is available') : (isHi ? 'डाउनलोड के लिए तैयार' : 'Ready to download'))}
              </p>
              {active && <progress aria-label={`${p.title} download progress`} value={progress[p.id] || 0} max={100} />}
            </div>
            <div className="actions">
              {active ? (
                <button className="secondary" onClick={() => controllers.current[p.id]?.abort()}>
                  <Pause size={16} />{isHi ? 'रोकें' : 'Pause'}
                </button>
              ) : !ready && (
                <button className="secondary" onClick={() => install(p)}>
                  <Download size={16} />{status[p.id] ? (isHi ? 'पुनः प्रयास' : 'Resume / retry') : (isHi ? 'डाउनलोड' : 'Download')}
                </button>
              )}
              {installed[p.id] && (
                <button className="icon-button" aria-label={`Delete ${p.title}`} onClick={() => deletePack(p.id).then(refresh).then(() => setStatus(s => ({ ...s, [p.id]: isHi ? 'हटा दिया गया' : 'Removed from this device' }))).catch(e => toast(e.message))}>
                  <Trash2 size={19} />
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
    <section className="card topic-section">
      <h2>{isHi ? 'वीडियो डाउनलोड' : 'Selected video downloads'}</h2>
      <p>{isHi ? 'अनुमोदित वीडियो पाठों के लिए ऑफ़लाइन डाउनलोड उपलब्ध हैं। वर्तमान में 3 उच्च-गुणवत्ता वीडियो पाठ उपलब्ध हैं: (1) भारत का भौगोलिक विस्तार, (2) पृथ्वी की आंतरिक संरचना, एवं (3) पुरापाषाण काल में मानव जीवन (1080p Full HD)।' : 'Offline downloads are available for approved video lessons. Currently, 3 high-quality video lessons are published: (1) Geographical Coordinates of India, (2) Interior Structure of the Earth, and (3) Palaeolithic Life & Early Humans (1080p Full HD).'} </p>
      <p className="small muted">{isHi ? 'स्टार्टर पैक पहली बार खोलने पर कैश हो जाता है।' : 'The small starter pack and app shell are cached on first visit. Downloading a pack does not change the global unique-question count. Deleting a pack preserves answer history and bookmarks.'}</p>
    </section>
  </>;
}
