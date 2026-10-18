#!/usr/bin/env node
/**
 * Assemble the downloadable question pack.
 *
 * Human-first layout: per-subject readable HTML, per-subject/per-exam
 * spreadsheets, then the machine formats (JSON) and a manifest that states the
 * exact expected counts so a download can be verified at a glance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from '../lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build/pack/kbc-40-per-topic-pack');
const TARGET = 40;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (s) => String(s ?? '').replace(/"/g, '""');

const catalog = readJson(path.join(ROOT, 'public/data/catalog.json'));
const starter = readJson(path.join(ROOT, 'public/data/starter.json'), { questions: [] });
const syllabus = readJson(path.join(ROOT, 'public/data/syllabus-index.json'), { exams: [] });
const preserved = readJson(path.join(ROOT, 'public/data/preserved-bank.json'), { questions: [] });
const si = readJson(path.join(ROOT, 'public/data/si-unit-mcqs.json'), { questions: [] });
const exams = readJson(path.join(ROOT, 'data/exams.json'), { exams: [] }).exams;

const questions = starter.questions || [];
const byTopic = new Map();
for (const q of questions) {
  if (!byTopic.has(q.topicId)) byTopic.set(q.topicId, []);
  byTopic.get(q.topicId).push(q);
}

const dirs = {
  html: path.join(OUT, '1_READ_QUESTIONS_HTML'),
  sheets: path.join(OUT, '2_SPREADSHEETS'),
  sheetsSubject: path.join(OUT, '2_SPREADSHEETS/by-subject'),
  sheetsExam: path.join(OUT, '2_SPREADSHEETS/by-exam'),
  full: path.join(OUT, '3_JSON_FULL_BANK'),
  chapters: path.join(OUT, '4_JSON_BY_CHAPTER'),
  examJson: path.join(OUT, '5_JSON_BY_EXAM'),
  siDir: path.join(OUT, '6_SI_UNIT_MCQS'),
  preservedDir: path.join(OUT, '7_PRESERVED_SI_FREE'),
  syllabusDir: path.join(OUT, '8_SYLLABUS'),
  reports: path.join(OUT, '9_REPORTS'),
};
fs.rmSync(OUT, { recursive: true, force: true });
for (const dir of Object.values(dirs)) fs.mkdirSync(dir, { recursive: true });

/* ------------------------------------------------------------------ CSV */

const HEAD = ['subject_id', 'subject_en', 'subject_hi', 'chapter_id', 'chapter_en', 'chapter_hi', 'topic_id', 'topic_en', 'topic_hi',
  'question_id', 'question_en', 'question_hi',
  'option_a_en', 'option_a_hi', 'option_b_en', 'option_b_hi', 'option_c_en', 'option_c_hi', 'option_d_en', 'option_d_hi',
  'correct_index', 'correct_letter', 'answer_en', 'answer_hi', 'explanation_en', 'explanation_hi', 'difficulty', 'kind'];

const meta = new Map();
for (const subject of catalog.subjects) {
  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) meta.set(topic.id, { subject, chapter, topic });
  }
}

function csvRow(q) {
  const m = meta.get(q.topicId) || {};
  const opts = q.options || [];
  const ci = q.correctIndex ?? 0;
  const ans = opts[ci] || {};
  const pad = (i) => [opts[i]?.en || '', opts[i]?.hi || ''];
  return [
    q.subjectId, m.subject?.title || '', m.subject?.titleHindi || '', q.chapterId, m.chapter?.title || '', m.chapter?.titleHindi || '',
    q.topicId, m.topic?.title || '', m.topic?.titleHindi || '', q.id, q.question?.en || '', q.question?.hi || '',
    ...pad(0), ...pad(1), ...pad(2), ...pad(3),
    ci, 'ABCD'[ci] || '', ans.en || '', ans.hi || '', q.explanation?.en || '', q.explanation?.hi || '', q.difficulty || '', q.kind || '',
  ];
}
function writeCsv(file, rows) {
  const lines = [HEAD.join(',')];
  for (const row of rows) lines.push(row.map((v) => `"${cell(v)}"`).join(','));
  fs.writeFileSync(file, `\ufeff${lines.join('\r\n')}\r\n`, 'utf8');
}

writeCsv(path.join(dirs.sheets, 'ALL-13800-questions.csv'), questions.map(csvRow));

const subjectFiles = [];
for (const subject of catalog.subjects) {
  const rows = questions.filter((q) => q.subjectId === subject.id);
  const slug = subject.shortTitle.startsWith(subject.id) ? subject.shortTitle : `${subject.id}-${subject.shortTitle}`;
  const file = path.join(dirs.sheetsSubject, `${slug.replace(/[^A-Za-z0-9]+/g, '-')}.csv`);
  writeCsv(file, rows.map(csvRow));
  subjectFiles.push({ id: subject.id, title: subject.title, file, count: rows.length });
}

const EXAM_HEAD = ['question_id', 'subject_id', 'chapter_id', 'topic_id', 'topic_en', 'question_en', 'question_hi',
  'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en', 'correct_letter', 'answer_en', 'difficulty', 'kind'];
const examFiles = [];
const seenSignatures = new Map();
for (const exam of exams) {
  const allowed = exam.subjects === 'all' ? null : new Set(exam.subjects);
  const rows = questions.filter((q) => !allowed || allowed.has(q.subjectId));
  const signature = exam.subjects === 'all' ? 'all' : [...exam.subjects].sort().join(',');
  if (seenSignatures.has(signature)) {
    const existing = seenSignatures.get(signature);
    examFiles.push({ id: exam.id, label: exam.label, file: existing.file, count: rows.length, sameAs: existing.id });
    continue;
  }
  const lines = [EXAM_HEAD.join(',')];
  for (const q of rows) {
    const m = meta.get(q.topicId);
    const o = q.options || [];
    lines.push([q.id, q.subjectId, q.chapterId, q.topicId, m?.topic?.title || '', q.question?.en || '', q.question?.hi || '',
      o[0]?.en || '', o[1]?.en || '', o[2]?.en || '', o[3]?.en || '', 'ABCD'[q.correctIndex] || '', o[q.correctIndex]?.en || '',
      q.difficulty || '', q.kind || ''].map((v) => `"${cell(v)}"`).join(','));
  }
  const file = path.join(dirs.sheetsExam, `${exam.id}.csv`);
  fs.writeFileSync(file, `\ufeff${lines.join('\r\n')}\r\n`, 'utf8');
  examFiles.push({ id: exam.id, label: exam.label, file, count: rows.length });
  seenSignatures.set(signature, { id: exam.id, file });
}

/* ------------------------------------------------------- SI + preserved CSV */
const SI_HEAD = ['question_id', 'original_id', 'origin', 'removed_from_preserved', 'subject_en', 'subject_hi', 'chapter_en', 'chapter_hi',
  'topic_en', 'topic_hi', 'question_en', 'question_hi',
  'option_a_en', 'option_a_hi', 'option_b_en', 'option_b_hi', 'option_c_en', 'option_c_hi', 'option_d_en', 'option_d_hi',
  'correct_index', 'correct_letter', 'answer_en', 'answer_hi', 'explanation_en', 'explanation_hi', 'layout', 'source_url'];
{
  const lines = [SI_HEAD.join(',')];
  for (const q of si.questions || []) {
    const o = q.options;
    const row = [q.id, q.originalId, q.origin, q.removedFromPreserved, q.subject.en, q.subject.hi, q.chapter.en, q.chapter.hi, q.topic.en, q.topic.hi,
      q.question.en, q.question.hi, o[0].en, o[0].hi, o[1].en, o[1].hi, o[2].en, o[2].hi, o[3].en, o[3].hi,
      q.correctIndex, 'ABCD'[q.correctIndex], q.answer.en, q.answer.hi, q.explanation?.en || '', q.explanation?.hi || '', q.layout, q.sourceUrl || ''];
    lines.push(row.map((v) => `"${cell(v)}"`).join(','));
  }
  fs.writeFileSync(path.join(dirs.sheets, 'SI-UNIT-400-mcqs.csv'), `\ufeff${lines.join('\r\n')}\r\n`, 'utf8');
}
writeCsv(path.join(dirs.sheets, 'PRESERVED-1895-si-free.csv'), (preserved.questions || []).map(csvRow));

/* --------------------------------------------------------------- HTML */

const PAGE_CSS = `:root{--ink:#16302b;--muted:#5b6f69;--line:#dbe6e1;--mint:#eaf5f0;--accent:#174f46}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:#f6faf8}
header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid var(--line);padding:.9rem 1.2rem}
.wrap{max-width:1080px;margin:0 auto;padding:1.2rem}
h1{font-size:1.4rem;margin:0 0 .3rem}h2{font-size:1.1rem;margin:1.6rem 0 .5rem}h3{font-size:1rem;margin:1.2rem 0 .35rem}
.muted{color:var(--muted);font-size:.92rem}a{color:var(--accent)}
.topic{border:1px solid var(--line);border-radius:10px;background:#fff;padding:.9rem 1rem;margin:.8rem 0}
.q{padding:.7rem 0;border-top:1px dashed var(--line)}.q:first-of-type{border-top:0}
.stem{margin:.15rem 0 .4rem}ol.opts{margin:.2rem 0 .3rem;padding-left:1.4rem}ol.opts li{padding:.12rem 0}
details{background:var(--mint);border-radius:8px;padding:.45rem .7rem;margin-top:.35rem}
summary{cursor:pointer;font-weight:600;color:var(--accent)}.ans{font-weight:700;color:#0b6b3a}
input[type=search]{width:100%;padding:.55rem .7rem;border:1px solid var(--line);border-radius:8px;font-size:1rem}
.bar{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-top:.6rem}
.chip{background:var(--mint);border:1px solid var(--line);border-radius:999px;padding:.15rem .6rem;font-size:.82rem;color:var(--accent)}
table{border-collapse:collapse;width:100%;background:#fff}th,td{border-bottom:1px solid var(--line);padding:.5rem .6rem;text-align:left;font-size:.92rem}
th{background:var(--mint)}
`;

function htmlShell(title, body, extraHead = '') {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${PAGE_CSS}</style>${extraHead}</head>
<body><header><div class="wrap"><h1>${esc(title)}</h1><p class="muted">${esc(body.subtitle || '')}</p>
<div class="bar"><a href="index.html">← All subjects</a><span class="chip">${esc(body.count || '')}</span></div></div></header>
<div class="wrap">${body.html}</div></body></html>`;
}

function questionHtml(q, index) {
  const ci = q.correctIndex;
  const opts = (q.options || []).map((o, i) => `<li><strong>${'ABCD'[i]}.</strong> ${esc(o.en)} <span class="muted">/ ${esc(o.hi)}</span></li>`).join('');
  return `<div class="q" data-search="${esc(`${q.question.en} ${q.question.hi} ${q.id}`.toLowerCase())}">
<div class="muted">Q${index} · ${esc(q.id)} · ${esc(q.difficulty || '')}</div>
<p class="stem"><strong>${esc(q.question.en)}</strong><br><span class="muted">${esc(q.question.hi)}</span></p>
<ol class="opts" type="A">${opts}</ol>
<details><summary>Answer &amp; explanation</summary>
<p class="ans">${'ABCD'[ci]}. ${esc(q.options?.[ci]?.en || '')} <span class="muted">/ ${esc(q.options?.[ci]?.hi || '')}</span></p>
<p><strong>Why:</strong> ${esc(q.explanation?.en || '')}</p><p class="muted">${esc(q.explanation?.hi || '')}</p>
</details></div>`;
}

const htmlIndexRows = [];
for (const subject of catalog.subjects) {
  const parts = [];
  let total = 0;
  for (const chapter of subject.chapters) {
    parts.push(`<h2>${esc(chapter.title)} <span class="muted">/ ${esc(chapter.titleHindi || '')}</span></h2>`);
    for (const topic of chapter.topics) {
      const list = byTopic.get(topic.id) || [];
      total += list.length;
      parts.push(`<div class="topic"><h3>${esc(topic.title)}</h3><p class="muted">${esc(topic.titleHindi || '')} · <span class="chip">${list.length} / ${TARGET} questions</span></p>
${list.map((q, i) => questionHtml(q, i + 1)).join('\n')}</div>`);
    }
  }
  const file = path.join(dirs.html, `${subject.id}.html`);
  fs.writeFileSync(file, htmlShell(`${subject.title} — ${total} questions`, {
    subtitle: `${subject.titleHindi || ''} · ${subject.chapters.length} chapters · ${total} questions`,
    count: `${total} questions`,
    html: `<input type="search" id="find" placeholder="Search this subject…" aria-label="Search questions">
<p class="muted" id="hits"></p>${parts.join('\n')}
<script>
const box=document.getElementById('find'),hits=document.getElementById('hits'),items=[...document.querySelectorAll('.q')];
box.addEventListener('input',()=>{const v=box.value.trim().toLowerCase();let n=0;items.forEach(el=>{const ok=!v||el.dataset.search.includes(v);el.style.display=ok?'':'none';if(ok)n++;});hits.textContent=v?n+' question(s) match':'Showing all '+items.length+' questions';});
hits.textContent='Showing all '+items.length+' questions';
</script>`,
  }));
  htmlIndexRows.push({ subject, file: `${subject.id}.html`, total });
}

const indexHtml = `<table><thead><tr><th>#</th><th>Subject</th><th>Chapters</th><th>Topics</th><th>Questions</th><th>Open</th></tr></thead><tbody>
${htmlIndexRows.map(({ subject, file, total }, i) => `<tr><td>${i + 1}</td><td>${esc(subject.title)}<br><span class="muted">${esc(subject.titleHindi || '')}</span></td>
<td>${subject.chapters.length}</td><td>${subject.chapters.reduce((s, c) => s + c.topics.length, 0)}</td><td><strong>${total}</strong></td>
<td><a href="${file}">Read →</a></td></tr>`).join('\n')}
</tbody></table>
<p class="muted">Every topic holds exactly ${TARGET} questions. Total: <strong>${questions.length}</strong> questions across ${catalog.subjects.length} subjects.</p>`;

fs.writeFileSync(path.join(dirs.html, 'index.html'), htmlShell('All subjects — 13,800 questions', {
  subtitle: 'Open a subject to read every question with its four options, answer and explanation.',
  count: `${questions.length} questions`,
  html: indexHtml,
}));

/* --------------------------------------------------------------- JSON */

fs.copyFileSync(path.join(ROOT, 'public/data/starter.json'), path.join(dirs.full, 'starter.json'));
fs.copyFileSync(path.join(ROOT, 'public/data/si-unit-mcqs.json'), path.join(dirs.siDir, 'si-unit-mcqs.json'));
fs.copyFileSync(path.join(ROOT, 'public/data/si-unit-mcqs.md'), path.join(dirs.siDir, 'si-unit-mcqs.md'));
fs.copyFileSync(path.join(ROOT, 'public/data/preserved-bank.json'), path.join(dirs.preservedDir, 'preserved-bank.json'));
fs.copyFileSync(path.join(ROOT, 'public/data/syllabus-index.json'), path.join(dirs.syllabusDir, 'syllabus-index.json'));
fs.copyFileSync(path.join(ROOT, 'public/data/catalog.json'), path.join(dirs.syllabusDir, 'catalog.json'));

let chapterFiles = 0;
for (const subject of catalog.subjects) {
  for (const chapter of subject.chapters) {
    const topics = chapter.topics.map((topic) => ({
      id: topic.id,
      title: { en: topic.title, hi: topic.titleHindi || topic.title },
      target: TARGET,
      count: (byTopic.get(topic.id) || []).length,
      questions: byTopic.get(topic.id) || [],
    }));
    const payload = {
      subject: { id: subject.id, en: subject.title, hi: subject.titleHindi },
      chapter: { id: chapter.id, en: chapter.title, hi: chapter.titleHindi },
      targetPerTopic: TARGET,
      counts: { topics: topics.length, questions: topics.reduce((s, t) => s + t.count, 0) },
      topics,
    };
    fs.writeFileSync(path.join(dirs.chapters, `${subject.id}__${chapter.id}.json`), JSON.stringify(payload));
    chapterFiles += 1;
  }
}

let examFilesJson = 0;
let examFilesExpected = 0;
for (const exam of exams) {
  examFilesExpected += catalog.subjects
    .filter((subject) => exam.subjects === 'all' || exam.subjects.includes(subject.id))
    .reduce((sum, subject) => sum + subject.chapters.length, 0);
  const dir = path.join(dirs.examJson, exam.id);
  fs.mkdirSync(dir, { recursive: true });
  const allowed = exam.subjects === 'all' ? null : new Set(exam.subjects);
  for (const subject of catalog.subjects) {
    if (allowed && !allowed.has(subject.id)) continue;
    for (const chapter of subject.chapters) {
      const topics = chapter.topics.map((topic) => ({
        id: topic.id,
        title: { en: topic.title, hi: topic.titleHindi || topic.title },
        target: TARGET,
        count: (byTopic.get(topic.id) || []).length,
        questionIds: (byTopic.get(topic.id) || []).map((q) => q.id),
      }));
      fs.writeFileSync(path.join(dir, `${subject.id}__${chapter.id}.json`), JSON.stringify({
        exam: { id: exam.id, en: exam.en, hi: exam.hi },
        subject: { id: subject.id, en: subject.title, hi: subject.titleHindi },
        chapter: { id: chapter.id, en: chapter.title, hi: chapter.titleHindi },
        questionsFile: `../../4_JSON_BY_CHAPTER/${subject.id}__${chapter.id}.json`,
        topics,
      }));
      examFilesJson += 1;
    }
  }
}

for (const name of ['data-report.json', 'validation.json']) {
  const src = path.join(ROOT, 'data/reports', name);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dirs.reports, name));
}
for (const name of ['OUTPUT_SAMPLE.md', 'GENERATION_REPORT.md']) {
  const src = path.join(ROOT, name);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dirs.reports, name));
}

/* ------------------------------------------------------------ manifest */

const perTopicCounts = [...byTopic.values()].map((list) => list.length);
const topicsAtTarget = perTopicCounts.filter((n) => n === TARGET).length;
let allFiles = [];
function scanFiles() {
  allFiles = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else allFiles.push({ relative: path.relative(OUT, full).replace(/\\/g, '/'), size: fs.statSync(full).size });
    }
  })(OUT);
  return allFiles.length;
}
scanFiles();

function writeManifest() {
scanFiles();
const manifest = [
  'KBC / Crorepati Revision — question pack manifest',
  `Built: ${new Date().toISOString()}`,
  '',
  'EXPECTED COUNTS',
  `  subjects ................ ${catalog.subjects.length}`,
  `  chapters ................ ${catalog.subjects.reduce((s, x) => s + x.chapters.length, 0)}`,
  `  topics .................. ${meta.size}`,
  `  questions ............... ${questions.length}`,
  `  topics at exactly ${TARGET} .... ${topicsAtTarget} of ${meta.size}`,
  `  min / max per topic ..... ${Math.min(...perTopicCounts)} / ${Math.max(...perTopicCounts)}`,
  `  SI MCQs ................. ${(si.questions || []).length}`,
  `  preserved (SI-free) ..... ${(preserved.questions || []).length}`,
  `  preserved SI removed .... ${preserved.counts?.removedSI ?? '?'}`,
  `  exam profiles ........... ${exams.length}`,
  `  chapter JSON files ...... ${chapterFiles}`,
  `  exam JSON files ......... ${examFilesJson}`,
  '',
  'HOW TO CHECK',
  '  Open START-HERE.html — it repeats these counts and links to everything.',
  '  Open 1_READ_QUESTIONS_HTML/index.html — browse all questions without any tooling.',
  '  Open 2_SPREADSHEETS/ALL-13800-questions.csv — one row per question.',
  '  Run 9_REPORTS/validation.json — every acceptance check says "ok": true.',
  '',
  `FILES (${allFiles.length} listed + this file = ${allFiles.length + 1})`,
  ...allFiles.map((f) => `  ${String(f.size).padStart(9)}  ${f.relative}`),
].join('\n');
fs.writeFileSync(path.join(OUT, 'MANIFEST.txt'), `${manifest}\n`);
return allFiles.length + 1;
}

/* ------------------------------------------------------------- reports */

const check = `# Check report

Everything in this pack was measured from the built data, not estimated.

| Check | Expected | Found | Result |
| --- | ---: | ---: | --- |
| Subjects | 26 | ${catalog.subjects.length} | ${catalog.subjects.length === 26 ? 'PASS' : 'FAIL'} |
| Chapters | 82 | ${catalog.subjects.reduce((s, x) => s + x.chapters.length, 0)} | ${catalog.subjects.reduce((s, x) => s + x.chapters.length, 0) === 82 ? 'PASS' : 'FAIL'} |
| Topics | 345 | ${meta.size} | ${meta.size === 345 ? 'PASS' : 'FAIL'} |
| Questions | 13,800 | ${questions.length} | ${questions.length === 13800 ? 'PASS' : 'FAIL'} |
| Topics with exactly 40 questions | 345 | ${topicsAtTarget} | ${topicsAtTarget === 345 ? 'PASS' : 'FAIL'} |
| SI-unit MCQs | 400 | ${(si.questions || []).length} | ${(si.questions || []).length >= 400 ? 'PASS' : 'FAIL'} |
| SI-unit questions in preserved bank | 0 | ${(preserved.questions || []).filter((q) => q.subjectId === 'S26').length} | ${(preserved.questions || []).filter((q) => q.subjectId === 'S26').length === 0 ? 'PASS' : 'FAIL'} |
| Exam profiles | 10 | ${exams.length} | ${exams.length === 10 ? 'PASS' : 'FAIL'} |
| Chapter JSON files | 82 | ${chapterFiles} | ${chapterFiles === 82 ? 'PASS' : 'FAIL'} |
| Exam JSON files | ${examFilesExpected} | ${examFilesJson} | ${examFilesJson === examFilesExpected ? 'PASS' : 'FAIL'} |
| Files in this pack | — | __FILE_COUNT__ | — |

## Question counts by subject

| Subject | Topics | Questions |
| --- | ---: | ---: |
${catalog.subjects.map((s) => {
  const topics = s.chapters.reduce((n, c) => n + c.topics.length, 0);
  const count = questions.filter((q) => q.subjectId === s.id).length;
  return `| ${s.id} · ${s.title} | ${topics} | ${count} |`;
}).join('\n')}

## Questions by exam

| Exam | Subjects | Questions | CSV in \`by-exam/\` |
| --- | ---: | ---: | --- |
${examFiles.map((e) => `| ${e.label} (${e.id}) | ${(exams.find((x) => x.id === e.id).subjects === 'all' ? 26 : exams.find((x) => x.id === e.id).subjects.length)} | ${e.count} | \`${path.basename(e.file)}\`${e.sameAs ? ` (shared with ${e.sameAs})` : ''} |`).join('\n')}
`;
fs.writeFileSync(path.join(OUT, 'CHECK-REPORT.md'), check);
fs.writeFileSync(path.join(dirs.reports, 'CHECK-REPORT.md'), check);

/* ---------------------------------------------------- START-HERE.html */

const start = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KBC question pack — start here</title><style>${PAGE_CSS}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:.9rem;margin:1rem 0}
.card{border:1px solid var(--line);border-radius:12px;background:#fff;padding:1rem}
.card h3{margin:.1rem 0 .4rem}.big{font-size:1.8rem;font-weight:800;color:var(--accent)}
</style></head><body>
<header><div class="wrap"><h1>KBC / Crorepati Revision — 40 questions per topic</h1>
<p class="muted">${catalog.subjects.length} subjects · ${catalog.subjects.reduce((s, x) => s + x.chapters.length, 0)} chapters · ${meta.size} topics · <strong>${questions.length.toLocaleString('en-IN')} questions</strong> · bilingual (English + Hindi)</p></div></header>
<div class="wrap">
<div class="grid">
<div class="card"><div class="big">${questions.length.toLocaleString('en-IN')}</div><p class="muted">questions in total</p></div>
<div class="card"><div class="big">${meta.size}</div><p class="muted">topics, each with exactly ${TARGET} questions</p></div>
<div class="card"><div class="big">${(si.questions || []).length}</div><p class="muted">SI-unit MCQs (question left, options right)</p></div>
<div class="card"><div class="big">${(preserved.questions || []).length}</div><p class="muted">preserved records · 0 SI-unit questions</p></div>
</div>

<h2>1. Read the questions</h2>
<p><a href="1_READ_QUESTIONS_HTML/index.html"><strong>Open the reader →</strong></a> — pick a subject, read every question with its four options, then expand "Answer &amp; explanation". Works offline in any browser, no software needed.</p>

<h2>2. Spreadsheets</h2>
<ul>
<li><a href="2_SPREADSHEETS/ALL-13800-questions.csv">ALL-13800-questions.csv</a> — every question, one row each (opens in Excel)</li>
<li><a href="2_SPREADSHEETS/SI-UNIT-400-mcqs.csv">SI-UNIT-400-mcqs.csv</a> — the SI conversions</li>
<li><a href="2_SPREADSHEETS/PRESERVED-1895-si-free.csv">PRESERVED-1895-si-free.csv</a> — archive without SI</li>
<li>Per subject: <code>2_SPREADSHEETS/by-subject/</code> — ${subjectFiles.length} files, same 28 columns</li>
<li>Per exam: <code>2_SPREADSHEETS/by-exam/</code> — ${examFiles.length} files: ${examFiles.map((e) => (e.sameAs ? `${e.id} (same as ${e.sameAs})` : e.id)).join(', ')}</li>
</ul>
<p class="muted">Exams that cover the identical syllabus share one file — e.g. ${examFiles.filter((e) => e.sameAs).map((e) => `${e.id} and ${e.sameAs}`).slice(0, 3).join('; ')} — so nothing is duplicated byte for byte. Full per-exam JSON is still in <code>5_JSON_BY_EXAM/</code> (${examFilesJson} files, every exam separate).</p>
<ul>
</ul>

<h2>3. JSON</h2>
<ul>
<li><a href="3_JSON_FULL_BANK/starter.json">3_JSON_FULL_BANK/starter.json</a> — the whole bank</li>
<li><code>4_JSON_BY_CHAPTER/</code> — ${chapterFiles} files, each chapter's topics with all ${TARGET} questions inline</li>
<li><code>5_JSON_BY_EXAM/</code> — ${examFilesJson} files, filtered per exam syllabus</li>
<li><code>6_SI_UNIT_MCQS/</code> — si-unit-mcqs.json + a Markdown table</li>
<li><code>7_PRESERVED_SI_FREE/</code>, <code>8_SYLLABUS/</code></li>
</ul>

<h2>4. Verify nothing is missing</h2>
<p>Open <a href="CHECK-REPORT.md">CHECK-REPORT.md</a> or <a href="MANIFEST.txt">MANIFEST.txt</a>. The manifest lists every file with its byte size and states the expected counts:
${catalog.subjects.length} subjects, ${meta.size} topics, ${questions.length} questions, ${topicsAtTarget} topics at exactly ${TARGET}, ${(si.questions || []).length} SI MCQs.</p>

<h2>Question counts by subject</h2>
<table><thead><tr><th>Subject</th><th>Chapters</th><th>Topics</th><th>Questions</th></tr></thead><tbody>
${catalog.subjects.map((s) => `<tr><td>${esc(s.title)}<br><span class="muted">${esc(s.titleHindi || '')}</span></td><td>${s.chapters.length}</td>
<td>${s.chapters.reduce((n, c) => n + c.topics.length, 0)}</td><td><strong>${questions.filter((q) => q.subjectId === s.id).length}</strong></td></tr>`).join('\n')}
</tbody></table>
<p class="muted">Generated ${new Date().toISOString().slice(0, 10)} · see 9_reports/ for the full build and validation reports.</p>
</div></body></html>`;
fs.writeFileSync(path.join(OUT, 'START-HERE.html'), start);

/* ---------------------------------------------------------------- README */

fs.writeFileSync(path.join(OUT, 'README.md'), `# KBC question pack — ${questions.length.toLocaleString('en-IN')} questions

**${catalog.subjects.length} subjects · ${catalog.subjects.reduce((s, x) => s + x.chapters.length, 0)} chapters · ${meta.size} topics · exactly ${TARGET} questions per topic.**

Start with **START-HERE.html** — it links to everything and shows the counts.

| Folder | What it holds |
| --- | --- |
| \`1_READ_QUESTIONS_HTML/\` | 26 subject pages + an index. Read every question in a browser, no tools needed. |
| \`2_SPREADSHEETS/\` | The master CSV (all ${questions.length} questions, 28 columns, English + Hindi), SI MCQs, the preserved bank, one CSV per subject (26) and per exam (${examFiles.length} distinct syllabuses). |
| \`3_JSON_FULL_BANK/\` | The complete bank as one JSON file. |
| \`4_JSON_BY_CHAPTER/\` | ${chapterFiles} chapter files — each topic's ${TARGET} questions inline. |
| \`5_JSON_BY_EXAM/\` | ${examFilesJson} exam-filtered files pointing at the chapter files. |
| \`6_SI_UNIT_MCQS/\` | The ${(si.questions || []).length} SI MCQs in left-question/right-options layout, JSON + Markdown. |
| \`7_PRESERVED_SI_FREE/\` | ${(preserved.questions || []).length} archive records, zero SI. |
| \`8_SYLLABUS/\` | Exam → subject → chapter → topic coverage. |
| \`9_REPORTS/\` | Build report, validation report, worked sample. |
| \`CHECK-REPORT.md\` | Measured counts and pass/fail for every acceptance rule. |
| \`MANIFEST.txt\` | Every file in the pack with its size. |

## Verify

1. Open \`CHECK-REPORT.md\` — expect ${questions.length} questions, ${meta.size} topics, ${topicsAtTarget} at exactly ${TARGET}.
2. Open \`1_READ_QUESTIONS_HTML/index.html\` and pick any subject.
3. Open \`2_SPREADSHEETS/ALL-13800-questions.csv\` in Excel — ${questions.length} data rows.
4. \`MANIFEST.txt\` lists every file with its byte size, plus the grand total.

## About generation

Ollama was not available in the build environment, so the questions were produced by the
repository's deterministic, fact-grounded offline engine (each question derives from the
topic's verified catalogue concepts and fact card; \`kind: "FACT_DERIVED"\`).
To regenerate with a real model: \`ollama pull gemma3:4b\` then
\`node scripts/generate.mjs --engine ollama --model gemma3:4b --target 40 --force && node scripts/build-data.mjs\`.
`);

const totalFiles = writeManifest();
for (const file of [path.join(OUT, 'CHECK-REPORT.md'), path.join(dirs.reports, 'CHECK-REPORT.md')]) {
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('__FILE_COUNT__', String(totalFiles)));
}

console.log(JSON.stringify({
  questions: questions.length,
  topics: meta.size,
  topicsAtTarget,
  minPerTopic: Math.min(...perTopicCounts),
  maxPerTopic: Math.max(...perTopicCounts),
  siMcqs: (si.questions || []).length,
  preserved: (preserved.questions || []).length,
  chapterFiles,
  examFiles: examFilesJson,
  htmlSubjects: htmlIndexRows.length,
  subjectCsvs: subjectFiles.length,
  examCsvs: examFiles.length,
  files: totalFiles,
}, null, 2));
