import { useEffect, useState } from 'react';
import { PageHeading } from './components';
import { useStore } from './context';
import { fetchJson } from './fetchJson';
import type { Catalog } from './types';

export default function CurrentNews() {
  const { state } = useStore();
  const isHi = state.profile.language === 'hi';
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJson<Catalog>('/data/catalog.json').then(setCatalog).catch((e) => setError(String(e)));
  }, []);

  const subject = catalog?.subjects.find((item) => item.id === 'S02');

  return (
    <section>
      <PageHeading eyebrow={isHi ? 'समसामयिकी' : 'Current affairs'} title={isHi ? 'करेंट अफेयर्स पाठ्यक्रम' : 'Current affairs syllabus'}>
        {isHi ? 'यह अनुभाग समकालीन घटनाओं का स्थिर पाठ्यक्रम दिखाता है; लाइव फ़ीड के लिए सर्वर-आधारित सेटअप आवश्यक है।' : 'This section shows the static current-affairs syllabus; live feeds require the server-backed setup.'}
      </PageHeading>
      {error && <p role="alert" className="card">{error}</p>}
      {subject ? (
        <div className="card">
          <p className="muted">{isHi ? subject.titleHindi : subject.title}</p>
          {subject.chapters.map((chapter) => (
            <details key={chapter.id}>
              <summary><strong>{isHi ? chapter.titleHindi : chapter.title}</strong> · {chapter.topics.length} {isHi ? 'टॉपिक' : 'topics'}</summary>
              <ul>{chapter.topics.map((topic) => <li key={topic.id}>{isHi ? topic.titleHindi : topic.title} · {topic.questionCount || 0} {isHi ? 'प्रश्न' : 'questions'}</li>)}</ul>
            </details>
          ))}
        </div>
      ) : <p className="card">{isHi ? 'कैटलॉग लोड हो रहा है…' : 'Loading catalogue…'}</p>}
    </section>
  );
}
