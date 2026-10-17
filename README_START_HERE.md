# Latest update

Read **README_LIVE_2026.md** first. It describes the live backend, model setup, saved data and coverage limits. The notes below describe the earlier bilingual repair.

# Crorepati Revision — repaired bilingual edition

## Windows: open the app
1. Extract the entire ZIP to a new folder, for example `D:\Crorepati_Repaired`.
2. Double-click `START_WINDOWS.bat`.
3. Your browser opens `http://localhost:4173`. Keep the terminal window open.
4. If Node.js is missing, install Node.js LTS from https://nodejs.org and reopen the launcher.

The built app is included. You do not need OmniRush, Docker, an API key or npm installation to view it once Node.js is installed. Keep your existing project and browser data until you have checked this copy.

## Ubuntu / WSL
Open a terminal in the extracted folder and run `bash START_UBUNTU.sh`. Open `http://localhost:4173` in your browser. Node.js must be available inside Ubuntu.

## What's included
- 939 questions from the latest app, displayed with Hindi questions/options and English underneath. Explanations also show both languages.
- Corrected catalogue question totals and pack hashes.
- Exam syllabus tab with dependent exam → subject → topic selectors, bilingual headings, additional preparation areas and source links.
- Study profiles for KBC, UPSC CSE, HCS, SSC CGL, APFC, SBI PO, IBPS PO, RBI Grade B General and Railway NTPC.
- Mythology topics under KBC and the complete study outline.
- Current News tab: three source-checked PIB articles dated 8–16 October 2026; one bilingual MCQ per article, answer feedback and original links.
- Preserved Bank tab: 14,016 checkpoint questions, with search, review-status filter, pagination and a JSON download.
- Independent second ZIP preserves the original question data, including versions and source/fact-card records.

## Important coverage details
The 939 active questions already contained Hindi fields; this update makes them visible beside English. This is not a new independent factual verification of all inherited questions. The earlier checkpoint's labels remain exactly as supplied: 5,016 VERIFIED and 9,000 PENDING_REVIEW. Some pending records use English technical wording inside Hindi fields; they remain in the preserved archive, with their original text, pending language and content review.

New syllabus areas with no authored questions show zero and a clear content-pending message. These are study outlines, not a claim of complete exam or optional-subject coverage. Check each exam's linked notification for the current cycle, stage, optional subject, marking scheme and eligibility. HCS PDF retrieval failed during this update; its outline is marked for notification checking. KBC has no fixed official syllabus.

News is a dated curated edition, not an automatic live service. The tab links to the latest official PIB release list. To publish a new edition, update `public/data/news.json` with checked summaries and MCQs, then rebuild. Never present unreviewed generated news questions as verified.

## Developer commands
`npm ci`
`npm run validate`
`npm test`
`npm run build`
`npx playwright install chromium`
`npx playwright test`

The production build uses esbuild after TypeScript checking. The original upload referenced absent build/pipeline scripts. Those broken script references were replaced with the included build and validation tools. Old service-worker registrations are retired to avoid serving stale editions. This edition runs from the local server; previous offline-PWA guarantees do not apply.

## Preservation
The checkpoint upload had no ZIP central directory. All 3,430 sequential local entries were recovered and checked against their stored CRC32 values. Question records were extracted from intact JSON files. See `reports/PRESERVATION_REPORT.json` and the separate preservation ZIP. Original review statuses were retained. The two banks use different subject-ID taxonomies, so archived questions are kept separate to avoid assigning them to incorrect subjects.

## Current-news sources
- https://www.pib.gov.in/PressReleseDetailm.aspx?PRID=2324319&lang=1&reg=3
- https://www.pib.gov.in/PressReleasepage.aspx?PRID=2323795&lang=1&reg=48
- https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2320798&lang=2&reg=48
