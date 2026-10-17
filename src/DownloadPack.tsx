import { Download, ExternalLink } from './icons';
import { useStore } from './context';

/**
 * Direct download card for the full 40-questions-per-topic pack.
 * Files are served statically from /downloads, so the browser saves them.
 */
export default function DownloadPack({ compact = false }: { compact?: boolean }) {
  const { state } = useStore();
  const isHi = state.profile.language === 'hi';

  return (
    <section className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <div>
        <p className="eyebrow">{isHi ? 'डाउनलोड' : 'DOWNLOAD'}</p>
        <h2 style={{ margin: '.2rem 0' }}>{isHi ? 'पूरा प्रश्न पैक' : 'Full question pack'}</h2>
        <p className="muted" style={{ margin: 0 }}>
          {isHi
            ? '13,800 प्रश्न · 345 टॉपिक × 40 · 82 अध्याय फ़ाइलें · 9 परीक्षा फ़ोल्डर · 400 एसआई एमसीक्यू · एसआई-मुक्त संरक्षित बैंक'
            : '13,800 questions · 345 topics × 40 · 82 chapter files · 9 exam folders · 400 SI MCQs · SI-free preserved bank'}
        </p>
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <a className="button" href="/downloads/kbc-40-per-topic-pack.zip" download>
          <Download size={17} /> {isHi ? 'पैक डाउनलोड करें (22 MB)' : 'Download pack (22 MB)'}
        </a>
        <a className="button secondary" href="/downloads/kbc-40-per-topic-csv.zip" download>
          <Download size={17} /> {isHi ? 'केवल CSV (6 MB)' : 'CSV only (6 MB)'}
        </a>
        {!compact && (
          <a className="button secondary" href="/downloads/kbc-40-per-topic-pack.zip" target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> {isHi ? 'नए टैब में खोलें' : 'Open in new tab'}
          </a>
        )}
      </div>
    </section>
  );
}
