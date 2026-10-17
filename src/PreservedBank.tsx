import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bilingual, PageHeading } from './components';
import { useStore } from './context';
import { fetchJson } from './fetchJson';
import { Search } from './icons';

interface Row {
  id: string;
  subjectId: string;
  chapterId: string;
  topicId: string;
  question: { en: string; hi: string };
  options: { en: string; hi: string }[];
  correctIndex: number;
  explanation?: { en: string; hi: string };
  removedFromPreserved?: boolean;
}
interface Pack {
  counts?: { questions: number; removedSI?: number; convertedFromPreserved?: number };
  questions: Row[];
}

export default function PreservedBank() {
  const { state } = useStore();
  const isHi = state.profile.language === 'hi';
  const [tab, setTab] = useState<'preserved' | 'si'>('preserved');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [preserved, setPreserved] = useState<Pack | null>(null);
  const [si, setSi] = useState<Pack | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([fetchJson<Pack>('/data/preserved-bank.json'), fetchJson<Pack>('/data/si-unit-mcqs.json')])
      .then(([p, s]) => { if (alive) { setPreserved(p); setSi(s); } })
      .catch((e) => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, []);

  const rows = (tab === 'preserved' ? preserved?.questions : si?.questions) || [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => `${row.question.en} ${row.question.hi} ${row.topicId}`.toLowerCase().includes(needle));
  }, [rows, query]);

  return (
    <section>
      <PageHeading eyebrow={isHi ? 'संग्रहित प्रश्न' : 'Preserved questions'} title={isHi ? 'संरक्षित बैंक (एसआई-मुक्त)' : 'Preserved bank (SI-free)'}>
        {isHi
          ? 'यह संग्रह ऐतिहासिक सामग्री सुरक्षित रखता है और हर एसआई मात्रक प्रश्न को अलग बहुविकल्पीय प्रारूप में प्रस्तुत करता है।'
          : 'This archive keeps historical material and presents every SI-unit question separately as a four-option MCQ.'}
      </PageHeading>

      {error && <p role="alert" className="card">{error}</p>}
      {!state.profile.onboarded && (
        <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="muted">{isHi ? 'आप अतिथि के रूप में देख रहे हैं।' : 'You are browsing as a guest.'}</span>
          <Link className="button" to="/start">{isHi ? 'प्रोफ़ाइल बनाएं' : 'Set up profile'}</Link>
        </div>
      )}

      <div className="card">
        <p className="muted">
          {isHi
            ? `संरक्षित प्रश्न: ${preserved?.counts?.questions ?? '…'} · हटाए गए एसआई प्रश्न: ${preserved?.counts?.removedSI ?? '…'} · एसआई एमसीक्यू: ${si?.counts?.questions ?? '…'}`
            : `Preserved: ${preserved?.counts?.questions ?? '…'} · SI removed: ${preserved?.counts?.removedSI ?? '…'} · SI MCQs: ${si?.counts?.questions ?? '…'}`}
        </p>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className={tab === 'preserved' ? 'button' : 'button secondary'} type="button" onClick={() => { setTab('preserved'); setLimit(20); }}>
            {isHi ? 'संरक्षित बैंक' : 'Preserved bank'}
          </button>
          <button className={tab === 'si' ? 'button' : 'button secondary'} type="button" onClick={() => { setTab('si'); setLimit(20); }}>
            {isHi ? 'एसआई मात्रक एमसीक्यू' : 'SI unit MCQs'}
          </button>
        </div>
      </div>

      <div className="card">
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isHi ? 'प्रश्न खोजें…' : 'Search questions…'} aria-label={isHi ? 'प्रश्न खोजें' : 'Search questions'} />
        </label>
        <p className="muted">{isHi ? `${filtered.length} प्रश्न मिले` : `${filtered.length} questions match`}</p>
      </div>

      {filtered.slice(0, limit).map((row) => (
        <article className="card" key={row.id}>
          <p className="eyebrow">{row.id} · {row.subjectId}</p>
          <p><strong><Bilingual value={row.question} /></strong></p>
          <ol type="A" className="option-list">
            {row.options.map((option, index) => (
              <li key={index} style={{ fontWeight: index === row.correctIndex ? 700 : 400 }}>
                <Bilingual value={option} />
                {index === row.correctIndex && <span className="chip" style={{ marginLeft: '.5rem' }}>{isHi ? 'सही' : 'correct'}</span>}
              </li>
            ))}
          </ol>
          {row.explanation?.en && <p className="muted"><Bilingual value={row.explanation} /></p>}
        </article>
      ))}

      {filtered.length > limit && (
        <button className="button secondary" type="button" onClick={() => setLimit((value) => value + 20)}>
          {isHi ? 'और दिखाएं' : 'Show more'}
        </button>
      )}
    </section>
  );
}
