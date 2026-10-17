import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Catalog, FactCard, LearningState, Pack, Question, Source } from './types';
import { initialState, eligible } from './domain';
import { downloadedPacks, loadState, saveState } from './storage';

interface Store { catalog: Catalog; state: LearningState; questions: Question[]; facts: FactCard[]; sources: Source[]; update: (f: (s: LearningState) => LearningState) => void; refreshPacks: () => Promise<void>; toast: (text: string) => void }
const Context = createContext<Store | null>(null);
export function useStore() { const store = useContext(Context); if (!store) throw new Error('Store unavailable'); return store; }
export function Provider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>();
  const [state, setState] = useState(initialState);
  const [packs, setPacks] = useState<Pack[]>([]);
  const starter = useRef<Pack | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const writes = useRef(Promise.resolve());
  const refreshPacks = async () => {
    try {
      const downloaded = await downloadedPacks();
      const valid = downloaded.filter(p => catalog?.packs?.some(cp => cp.id === p.id && cp.sha256 === p.sha256));
      setPacks([...(starter.current ? [starter.current] : []), ...valid]);
    }
    catch (e) { setStorageAvailable(false); setError(`Browser storage unavailable: ${String(e)}. Downloaded packs and progress cannot be saved in this session.`); }
  };
  useEffect(() => {
    Promise.allSettled([
      fetch('/data/catalog.json').then(r => { if (!r.ok) throw new Error('Cannot load the catalogue. Connect once to download the learning shell.'); return r.json(); }),
      fetch('/data/starter.json').then(r => { if (!r.ok) throw new Error('Starter content unavailable.'); return r.json(); }),
      loadState(), downloadedPacks(),
    ]).then(([catalogResult, starterResult, stateResult, packsResult]) => {
      if (catalogResult.status === 'rejected' || starterResult.status === 'rejected') {
        const failure = catalogResult.status === 'rejected' ? catalogResult.reason : (starterResult as PromiseRejectedResult).reason;
        setError(`Learning content could not load: ${String(failure)}. Check the terminal and reload.`);
        return;
      }
      const cat = catalogResult.value;
      setCatalog(cat);
      starter.current = starterResult.value;
      const validDownloaded = packsResult.status === 'fulfilled'
        ? packsResult.value.filter(p => cat.packs?.some((cp: any) => cp.id === p.id && cp.sha256 === p.sha256))
        : [];
      setPacks([starterResult.value, ...validDownloaded]);
      if (stateResult.status === 'fulfilled') setState(stateResult.value);
      if (stateResult.status === 'rejected' || packsResult.status === 'rejected') {
        setStorageAvailable(false);
        setError(`Browser storage unavailable (${String(stateResult.status === 'rejected' ? stateResult.reason : (packsResult as PromiseRejectedResult).reason)}). The app is open for viewing, but progress will not be saved. Existing stored data has not been deleted.`);
      }
      setReady(true);
    }).catch(e => setError(`Startup failed: ${String(e)}`));
  }, []);
  useEffect(() => { if (!ready || !storageAvailable) return; writes.current = writes.current.then(() => saveState(state)).catch(e => { setStorageAvailable(false); setError(`Progress could not be saved: ${String(e)}. Existing stored data has not been deleted.`); }); }, [state, ready, storageAvailable]);
  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(id); }, [message]);
  if (!ready || !catalog) return <main className="loading"><div className="brand-mark">c<span>r</span></div><h1>Crorepati Revision</h1><p role={error ? 'alert' : 'status'}>{error || 'Opening your learning space…'}</p>{error && <button onClick={() => location.reload()}>Try again</button>}</main>;
  const unique = <T extends { id: string },>(items: T[]) => [...new Map(items.map(x => [x.id, x])).values()];
  const value: Store = { catalog, state, questions: unique(packs.flatMap(p => p.questions)).filter(q => eligible(q)), facts: unique(packs.flatMap(p => p.factCards)), sources: unique(packs.flatMap(p => p.sources)), update: setState, refreshPacks, toast: setMessage };
  return <Context.Provider value={value}>{error && <div role="alert" className="error-banner">{error}</div>}{children}{message && <div className="toast" role="status">{message}</div>}</Context.Provider>;
}
