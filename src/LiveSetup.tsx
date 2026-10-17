import { useEffect, useState } from 'react';
import { PageHeading } from './components';
import { useStore } from './context';
import { fetchJson } from './fetchJson';
import type { Catalog } from './types';

const STEPS = [
  'ollama serve',
  'ollama pull gemma3:4b',
  'node scripts/generate.mjs --engine ollama --model gemma3:4b --target 40',
  'node scripts/build-data.mjs',
];

export default function LiveSetup() {
  const { state } = useStore();
  const isHi = state.profile.language === 'hi';
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    fetchJson<Catalog>('/data/catalog.json').then(setCatalog).catch(() => setCatalog(null));
  }, []);

  return (
    <section>
      <PageHeading eyebrow={isHi ? 'लाइव सेटअप' : 'Live setup'} title={isHi ? 'स्थानीय ऑलामा पाइपलाइन' : 'Local Ollama pipeline'}>
        {isHi ? '40 प्रश्न प्रति टॉपिक बनाने के लिए स्थानीय ऑलामा सर्वर और इस रिपॉज़िटरी की जनरेट स्क्रिप्ट चलाएं।' : 'Run a local Ollama server and this repository’s generator to create 40 questions per topic.'}
      </PageHeading>

      <div className="card">
        <h2>{isHi ? 'वर्तमान डेटा' : 'Current data'}</h2>
        <p className="muted">
          {catalog
            ? `${catalog.counts.questions} ${isHi ? 'सक्रिय प्रश्न' : 'active questions'} · ${catalog.counts.topics} ${isHi ? 'टॉपिक' : 'topics'} · ${catalog.counts.factCards} ${isHi ? 'फैक्ट कार्ड' : 'fact cards'}`
            : isHi ? 'कैटलॉग लोड हो रहा है…' : 'Loading catalogue…'}
        </p>
      </div>

      <div className="card">
        <h2>{isHi ? 'चलाने के चरण' : 'Run these steps'}</h2>
        <pre style={{ overflowX: 'auto' }}>{STEPS.join('\n')}</pre>
        <p className="muted">
          {isHi
            ? 'जनरेटर प्रगति को data/generated/ में सहेजता है और रुकने पर वहीं से आगे बढ़ता है।'
            : 'The generator checkpoints into data/generated/ and resumes where it stopped.'}
        </p>
      </div>

      <div className="card">
        <h2>{isHi ? 'आवश्यकताएं' : 'Requirements'}</h2>
        <ul>
          <li>{isHi ? 'Node.js 22 या नया' : 'Node.js 22 or newer'}</li>
          <li>Ollama · <code>gemma3:4b</code></li>
          <li>{isHi ? 'पोर्ट 11434 पर स्थानीय सर्वर' : 'Local server on port 11434'}</li>
        </ul>
      </div>
    </section>
  );
}
