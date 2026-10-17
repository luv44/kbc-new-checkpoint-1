import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeading } from './components';
import { useStore } from './context';
import DownloadPack from './DownloadPack';
import { fetchJson } from './fetchJson';

interface TopicRow {
  id: string; subjectId: string; chapterId: string; en: string; hi: string;
  subjectEn: string; subjectHi: string; chapterEn: string; chapterHi: string;
  questionCount: number; target: number; status: string;
}
interface SubjectRow { id: string; en: string; hi: string; chapters: { id: string; en: string; hi: string; topicCount: number; questions: number }[]; topics: number; questions: number }
interface ExamRow {
  id: string; label: string; en: string; hi: string; sourceUrl: string;
  subjects: SubjectRow[]; topics: TopicRow[];
  totals: { subjects: number; topics: number; questions: number; target: number; complete: number };
}
interface IndexFile { target: number; exams: ExamRow[] }

export default function ExamSyllabus() {
  const { state } = useStore();
  const isHi = state.profile.language === 'hi';
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [examId, setExamId] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJson<IndexFile>('/data/syllabus-index.json').then(setIndex).catch((e) => setError(String(e)));
  }, []);

  const exam = useMemo(() => index?.exams.find((item) => item.id === examId) || index?.exams[0], [index, examId]);
  const coverage = useMemo(() => {
    if (!exam) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return exam.topics;
    return exam.topics.filter((topic) => `${topic.en} ${topic.hi} ${topic.chapterEn} ${topic.subjectEn}`.toLowerCase().includes(needle));
  }, [exam, query]);

  return (
    <section>
      <PageHeading eyebrow={isHi ? 'परीक्षा पाठ्यक्रम' : 'Exam syllabus'} title={isHi ? 'हर परीक्षा के लिए 40 प्रश्न प्रति टॉपिक' : '40 questions per topic for every exam'}>
        {isHi ? 'हर परीक्षा के विषय, अध्याय और टॉपिक उसके पाठ्यक्रम से मैप किए गए हैं; हर टॉपिक पर 40 प्रश्न हैं।' : 'Subjects, chapters and topics are mapped from each exam syllabus; every topic carries 40 questions.'}
      </PageHeading>

      <DownloadPack />

      {error && <p role="alert" className="card">{error}</p>}
      {!state.profile.onboarded && (
        <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="muted">{isHi ? 'आप अतिथि के रूप में देख रहे हैं।' : 'You are browsing as a guest.'}</span>
          <Link className="button" to="/start">{isHi ? 'प्रोफ़ाइल बनाएं' : 'Set up profile'}</Link>
        </div>
      )}

      {index && (
        <div className="card">
          <label>
            <span className="muted">{isHi ? 'परीक्षा चुनें' : 'Choose exam'}</span>
            <select value={examId} onChange={(event) => setExamId(event.target.value)}>
              {index.exams.map((item) => <option key={item.id} value={item.id}>{isHi ? item.hi : item.en}</option>)}
            </select>
          </label>
          {exam && (
            <p className="muted">
              {isHi
                ? `${exam.totals.subjects} विषय · ${exam.totals.topics} टॉपिक · ${exam.totals.questions} प्रश्न (लक्ष्य ${exam.totals.target})`
                : `${exam.totals.subjects} subjects · ${exam.totals.topics} topics · ${exam.totals.questions} questions (target ${exam.totals.target})`}
            </p>
          )}
        </div>
      )}

      {exam && (
        <div className="card">
          <label className="search-field">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isHi ? 'टॉपिक खोजें…' : 'Search topics…'} aria-label={isHi ? 'टॉपिक खोजें' : 'Search topics'} />
          </label>
          <div className="coverage-table">
            <table>
              <thead>
                <tr>
                  <th>{isHi ? 'विषय' : 'Subject'}</th>
                  <th>{isHi ? 'अध्याय' : 'Chapter'}</th>
                  <th>{isHi ? 'टॉपिक' : 'Topic'}</th>
                  <th>{isHi ? 'प्रश्न' : 'Questions'}</th>
                </tr>
              </thead>
              <tbody>
                {coverage.slice(0, 500).map((topic) => (
                  <tr key={topic.id}>
                    <td>{isHi ? topic.subjectHi : topic.subjectEn}</td>
                    <td>{isHi ? topic.chapterHi : topic.chapterEn}</td>
                    <td>{isHi ? topic.hi : topic.en}</td>
                    <td>{topic.questionCount} / {topic.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">{isHi ? `${coverage.length} टॉपिक दिख रहे हैं` : `Showing ${coverage.length} topics`}</p>
        </div>
      )}
    </section>
  );
}
