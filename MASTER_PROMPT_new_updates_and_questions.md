# MASTER PROMPT — New Updates in a New Tab + Auto-MCQ + Non-Repetitive Topic Questions

Paste everything between the lines into a new session, then attach the project ZIP.
Replace the two bracketed VALUES at the top before sending.

---

## 0. VALUES TO SET

- `PROJECT_ROOT` = `[path to the unzipped project, e.g. /home/user/crorepati-kbc]`
- `TOPICS_PER_BATCH` = `[e.g. 10  — how many topics to fill per batch]`

---

## 1. ROLE

You are working inside an existing React + TypeScript + Vite app ("Crorepati Revision V2"),
a bilingual (English + Hindi) exam-prep product. The app already ships:

- `public/data/catalog.json` — 26 subjects → chapters → 345 topics (each topic has 4 concepts)
- `public/data/starter.json` — the question pack the app actually loads (`questions`, `factCards`, `sources`)
- `data/questions/CORE_QUESTION_BANK.json` and `EXAM_READY_QUESTION_BANK.json` — offline mirrors
- `src/` — the UI. **Do not redesign it.**

Your job has exactly three parts, described below. Preserve every existing question and every
existing id. Never delete or rewrite a question that already exists unless a rule in §5 says so.

---

## 2. PART A — "NEW UPDATES", EACH OPENING IN A NEW TAB

Build an **Updates** feed: a list of dated, source-backed current-affairs/current-knowledge items.

Requirements:

1. Each update is one record with: `id`, `date` (YYYY-MM-DD), `subjectId`, `topicId`,
   `titleEn`, `titleHi`, `summaryEn`, `summaryHi`, `sourceName`, `sourceUrl`, `tags[]`.
2. Store them in a new file `public/data/updates.json` shaped as
   `{ "version": 1, "builtAt": "...", "updates": [ ... ] }`.
3. Add a route `/updates` rendering the feed: newest first, grouped by date, filterable by
   subject. Match the existing visual language — reuse the existing `card`, `chip`,
   `eyebrow`, `text-link` and `button` classes. **Do not introduce a new design system.**
4. Every update row must expose an **"Open in new tab"** action linking to `sourceUrl` with
   `target="_blank" rel="noopener noreferrer"`. This is the "new tab every new" requirement:
   reading the source must never navigate the learner away from the app.
5. Each update row must also link to `/practice?update=<updateId>` so the learner can
   immediately practise the MCQs generated for that update (Part B).
6. If an update has no source URL, it must not ship. No unsourced updates.
7. Never fabricate a date, a scheme name, a statistic or a source. If you cannot verify it,
   leave it out and say so.

---

## 3. PART B — MCQs FOR EVERY UPDATE

For **each** update record, author `3` to `5` MCQs.

1. Give each question `updateId`, so `/practice?update=<id>` can filter to them.
2. Apply **all** the rules in §5 (bilingual, no giveaway, no meta-language).
3. The correct answer must be findable from the update's own summary or its cited source.
4. Add the new questions to `starter.json`, both offline banks, and the catalog's
   `questionCount` for the owning topic. Keep `counts.questions` and the `starter` pack
   `sha256`/`size` in `catalog.json` truthful after every write.

Suggested schema per question (match the existing record shape exactly):

```json
{
  "id": "Q_<topicId>_U<nnn>",
  "subjectId": "S02",
  "chapterId": "<chapterId>",
  "topicId": "<topicId>",
  "conceptIds": ["concept_<topicId>_0"],
  "question": { "en": "...", "hi": "..." },
  "options": [ { "en": "...", "hi": "..." }, "… x4" ],
  "correctIndex": 0,
  "difficulty": "MEDIUM",
  "angle": "CONCEPTUAL_APPLICATION",
  "explanation": { "en": "...", "hi": "..." },
  "detailedExplanation": { "en": "...", "hi": "..." },
  "wrongReasons": [ { "en": "...", "hi": "..." }, "… x4" ],
  "memoryCue": { "en": "...", "hi": "..." },
  "factCardIds": ["FC_<topicId>"],
  "sourceIds": ["<source id from sources[]>"],
  "fingerprint": "<md5 of id + english stem, 16 hex>",
  "lifecycle": "VERIFIED",
  "qualityScore": 100,
  "dynamic": false,
  "validUntil": null,
  "validFrom": "<build date>",
  "verifiedAt": "<build date>",
  "kind": "ACTUAL_PYQ"
}
```

---

## 4. PART C — NON-REPETITIVE QUESTIONS FOR EVERY SUBJECT AND EVERY TOPIC

Current measured state (update these numbers yourself before starting):

- 345 topics exist; **339 topics hold only 1 question each**.
- Reaching 20 questions per topic needs **6,441 new questions**.
- Do not attempt this in one turn. Work in batches of `TOPICS_PER_BATCH` topics.

Per batch, for each topic in the batch:

1. Read that topic's four concepts from `catalog.json` and its `factCard` text.
2. Author up to **20 questions per topic** — 5 per concept — covering the concept from
   different angles: definition, identification, contrast, application, and evidence/source.
3. **Non-repetition is a hard gate, not a preference.** Before saving, run the dedupe check in §6
   and refuse to save on any collision.
4. Vary the *shape* of the question, not just the words: "Which…", "Identify…", "Match…",
   "Arrange in order…", "Which is NOT…", "What is the correct pair…".
5. Write the report and print per-topic counts when done.

---

## 5. HARD CONTENT RULES (apply to every question you author)

1. **Bilingual.** Every stem, every option, every explanation, every wrong reason must exist
   in English *and* Hindi. No exceptions.
2. **No answer giveaway by length.** This is the single most common defect in the existing
   pack. The correct option must not be visibly longer or more detailed than the distractors.
   - Target: correct-option length ÷ mean distractor length **< 1.5**.
   - Distractors must be *parallel in form* — all four either short phrases, or all four
     full sentences, or all four site/date/name style.
   - Never let the correct option carry a parenthetical list of extra detail that the
     distractors lack.
3. **No answer in the stem.** The correct option's wording must not appear in the English or
   Hindi stem. Check this with a word-boundary test, not a substring test.
4. **Banned meta-language in stems:** "syllabus", "curriculum", "benchmarks", "evaluating",
   "scrutiny", "from an advanced exam perspective", "assessing syllabus".
5. **Distractors must be plausible.** No joke options ("rubber tyres", "glass windows",
   "written in English"). A well-made distractor is a real, tempting confusion.
6. **All four options distinct** within a question, in both languages. A distractor equal to
   the correct answer is a fatal defect.
7. **Balanced answer key.** Within each concept, spread correct answers across A/B/C/D
   (aim for 5/5/5/5 over 20 questions). Never leave the answer always in one slot.
8. **No duplicate stems** anywhere in the pack, across all subjects.
9. Explain *why* in `wrongReasons` — one line per distractor, not a copied template.
10. If you are unsure of a fact, do not write the question. Say the topic is blocked instead.

---

## 6. VERIFICATION GATES — run before claiming any batch is done

Create and run these scripts; do not eyeball the data.

**`build_curriculum/audit_option_balance.py`** — per question compute
`len(correct) / mean(len(other options))` for English and Hindi, bin it, and print the worst
offenders with their topics. Exit non-zero if any ratio ≥ 3.0.

**`build_curriculum/check_duplicates.py`** — fail on:
- duplicate question ids
- duplicate English stems (normalised: lowercased, punctuation stripped)
- any question whose option set contains a repeated string
- the correct answer's wording appearing in the stem (word-boundary match)
- any of the banned phrases in §5.4

**`build_curriculum/check_coverage.py`** — print, per subject and per topic, the question
count and the shortfall to 20. Report the running total.

Then assert:
- every question has 4 options, all distinct, in both languages
- `correctIndex` is a valid index for every question
- `catalog.json counts.questions` equals `len(starter.questions)`
- the `starter` pack `sha256` in `catalog.json` matches the real file hash
- both offline banks agree with `starter.json` for every shared id

---

## 7. WORKING AGREEMENT

1. Work in batches. After each batch: run all gates, then report
   *topics touched / questions added / running total / remaining shortfall*.
2. **Never** claim a count you have not measured with a script.
3. If a gate fails, fix the data — do not lower the gate.
4. Preserve all existing questions, ids, and the visual design.
5. Keep `node_modules` out of the archive; it is excluded from snapshots and must be
   reinstalled with `npm install` on resume.
6. Rebuild `crorepati-kbc-latest.zip` at the end and hand it over; `node_modules/`,
   `dist/`, `.git/` excluded.
7. Report honestly what was finished, what was not, and the exact command to resume.

---

## 8. FIRST RESPONSE I EXPECT FROM YOU

1. The measured starting numbers (topics, per-topic counts, shortfall).
2. Your batch plan (`TOPICS_PER_BATCH`, the order you will work in).
3. The three gate scripts, written and passing on the *existing* data before you add anything.
4. Then begin batch 1 — and stop after batch 1 to show me the result.

---

END OF PROMPT
