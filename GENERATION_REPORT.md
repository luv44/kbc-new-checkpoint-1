# Question-generation report

## What was produced

| Item | Result |
| --- | --- |
| Catalogue topics covered | **345 / 345** (26 subjects, 82 chapters) |
| Verified base questions | 1,725 |
| Newly generated questions | **12,075** |
| Active bank | **13,800 = 345 × 40** |
| Questions per topic | **40 everywhere** (`npm run validate`) |
| Exam profiles exported | 10 — all, kbc, upsc-cse, hcs, ssc-cgl, railway-ntpc, sbi-po, ibps-po, rbi-grade-b, apfc |
| Preserved bank | 1,895 records, **0 SI-unit questions** |
| SI-unit questions converted to MCQ | **400**, `layout: left-question-right-options` |
| Link-only questions | 0 |

## Where the data lives

| Path | Contents |
| --- | --- |
| `public/data/starter.json` | Active bank served by the app (13,800 questions + 345 fact cards) |
| `public/data/catalog.json` | Catalogue with per-topic and per-subject question counts |
| `public/data/preserved-bank.json` | SI-free archive (`policy: SI_UNITS_EXCLUDED`) |
| `public/data/si-unit-mcqs.json` / `.md` | Every SI question as an MCQ; the Markdown renders question-left / options-right |
| `public/data/syllabus-index.json` | exam → subject → chapter → topic coverage, 40 per topic |
| `deliverables/Ollama_40/all/<subject>/<chapterId>.json` | Full chapter records — each topic carries its own 40 questions |
| `deliverables/Ollama_40/<exam>/<subject>/<chapterId>.json` | Exam-filtered chapters with per-topic `questionIds` and a `questionsFile` pointer |
| `data/generated/<topicId>.json.gz` | Resumable per-topic generation output |
| `data/reports/data-report.json`, `validation.json` | Measured counts and the pass/fail acceptance report |
| `public/downloads/*.zip` | The finished download packs |

### Exam coverage

| Exam | Subjects | Topics | Questions |
| --- | ---: | ---: | ---: |
| all / kbc / ssc-cgl | 26 | 345 | 13,800 each |
| upsc-cse / hcs | 25 | 335 | 13,400 each |
| railway-ntpc | 24 | 327 | 13,080 |
| sbi-po / ibps-po | 9 | 118 | 4,720 each |
| rbi-grade-b / apfc | 8 | 108 | 4,320 each |

## SI-unit handling

The whole **S26 "Metrology, SI Units & Standard Measures"** subject is SI content
(`lib/si.mjs`, `SI_SUBJECT_IDS = {S26}`), plus any stem that names the SI system,
base/derived units, BIPM/CGPM, or SI prefixes.

* 50 SI records were removed from the preserved candidates (48 S26 + 2 text matches).
* The preserved bank now contains **zero** S26 records and zero SI-text matches.
* All 400 S26 questions in the active bank are present in `si-unit-mcqs.json`
  (join on `originalId`); none is missing.
* `si-unit-mcqs.md` lays each question out as a table: question on the left,
  four bilingual options on the right, answer and explanation underneath.

If the full 14,016-record checkpoint archive is supplied at `data/preserved-bank.json`,
`scripts/build-data.mjs` merges it automatically, applies the same SI filter and
re-emits the public packs.

## How it was generated — caveat

**Ollama was not available in this environment** (`ollama` is not installed and nothing
listens on port 11434). Generation therefore ran with the deterministic, fact-grounded
offline engine:

```bash
node scripts/generate.mjs --engine offline --target 40
node scripts/build-data.mjs
```

Every generated question is grounded in the topic's catalogue concepts and fact card,
with anti-duplication checks, balanced A/B/C/D answer keys, bilingual stems and options,
and the same schema as the verified bank (`kind: FACT_DERIVED`, `generator: offline-fact-v2`).

To regenerate with a real model once Ollama is available:

```bash
ollama pull gemma3:4b
node scripts/generate.mjs --engine ollama --model gemma3:4b --target 40 --force
node scripts/build-data.mjs
```

`--engine auto` uses Ollama when reachable and falls back to offline otherwise.
Progress is checkpointed in `data/generated/progress.json`; an interrupted run resumes
from the last completed topic.

## Verification

```bash
npm run validate   # 9 acceptance checks, exits non-zero on failure
npm test           # 6 node:test data invariants
npm run build      # tsc -b + vite production build
```

All checks pass: 40 questions in each of the 345 topics, four options and a valid answer
key everywhere, bilingual stems, no duplicate ids, no link-only stems, zero SI in the
preserved bank, full SI→MCQ coverage, ten exam profiles, and 40 questions per syllabus
topic in every exam export.
