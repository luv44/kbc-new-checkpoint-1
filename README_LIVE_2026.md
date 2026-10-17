# Crorepati Live 2026 — start here

## Windows
1. Extract this ZIP into a NEW folder on D:, e.g. `D:\Crorepati_Live_2026`.
2. Double-click `START_WINDOWS.bat`. Node.js 22 or newer is required; install Node.js LTS from https://nodejs.org if needed.
3. Open `http://localhost:4173`. Keep the launcher window open.
4. Choose **Exam Syllabus / पाठ्यक्रम**, your exam, subject and topic.
5. Open **Current News / समाचार** for 2026 news. Sources refresh on startup and every 30 minutes.

No npm install, Docker or OmniRush is needed to run the included production build. The backend is bundled in server.mjs. Ubuntu users can run `bash START_UBUNTU.sh`.

## Enable automatic MCQs once
1. Open **Live setup / लाइव सेटअप**.
2. Choose your model connection:
   - Local Ollama: install Ollama from https://ollama.com/download, download a model your PC can run, enter its exact installed model name, and keep the default `http://127.0.0.1:11434/v1`. No API key is needed for a local model. This download does not include the model or install it automatically.
   - Remote provider: enter its OpenAI-compatible base URL, model ID and your API key. The provider may charge for calls. No credentials or paid calls are supplied with this download.
3. Set the daily call limit (default 20) and question target per topic (default 5).
4. Tick **Automatically generate within daily limit** and save.
5. In **Exam Syllabus**, click **Queue all gaps for this exam**. Keep the launcher open.

The queue processes one call at a time, saves after each accepted result and resumes on restart. Each call requests up to three MCQs. Invalid output is rejected; failed jobs retry at increasing intervals, up to three attempts. Use Retry failed jobs after correcting a source/model problem. Pause survives restart. Quotas stop calls until the next UTC day or until you change the limit. The call limit is not a guaranteed monetary spending limit.

## What is automatic
- Fetch 2026-dated items from PIB, UN News, NASA, BBC News and BBC Sport; retain every collected topic, with optional keyword category filters.
- Keep collected articles, source links, MCQs and work queues on the same drive as the app, in `user-data`.
- Generate Hindi/English MCQs from source text when a model is configured and generation is enabled.
- Track every topic in the included exam outline and queue topics below the configured question-count target.
- Keep the original 939-question active bank and 14,016-question checkpoint archive.

## What is not guaranteed
- A current RSS feed does not contain every article from January 2026 onward. The archive grows from collected items. Import earlier dated articles via the JSON importer to backfill your own sources. Future-dated and non-2026 records are excluded.
- These are practical exam study outlines; they are not independently certified exhaustive official syllabi. Some optional subjects and specialist recruitment exams require their own official syllabus. Sources are linked from each exam page. A target count does not mean complete topic mastery.
- The model must be installed or configured by you. Its factual quality, Hindi translation and exam relevance still require review. No live paid-provider generation was run while preparing this package.
- Automatic MCQs are PENDING_REVIEW. Four options, Hindi fields, duplicate option checks, answer bounds, exact source-quote matching and exact English-answer presence in the quote are enforced. These checks do not establish full semantic correctness or an official PYQ provenance.
- Automatic article categories are suggestions based on keywords. Use Every subject to avoid hiding articles.
- Source outages are shown on screen. Existing saved content is retained. News does not refresh while the PC/server is off. Some sources may respond without any eligible 2026 articles.

## Missing topic sources
For an existing topic the tool can reuse supplied bank evidence. For an empty topic it tries a Wikipedia extract, explicitly labelled as a secondary source needing review. For authoritative material, select the topic, expand **Add source evidence**, paste the official source link and relevant text, and save before generating. The source text is treated as data, not instructions.

## Save and recover
Everything new is in `user-data/live-state.json`. Settings are in `user-data/settings.json`; keep this private because it contains your configured API key. Files are saved via a temporary file and rename, with a `.bak` copy of the previous version. The backup download in Live Setup exports study data without the API key. To restore that export, stop the app, keep a copy of your existing user-data, and place the exported JSON at `user-data/live-state.json`, then restart. Do not overwrite your backup with a blank state.

Your old browser progress remains in IndexedDB. Older downloaded packs with mismatching content hashes are not silently mixed into the new catalogue.

## Source and API documentation
- PIB feeds: https://www.pib.gov.in/ViewRss.aspx?lang=1&reg=3
- NASA feeds: https://www.nasa.gov/rss-feeds/
- UN feed: https://news.un.org/feed/subscribe/en/news/all/rss.xml
- BBC feeds: https://support.bbc.co.uk/platform/feeds/NewsFeeds.htm
- Ollama API compatibility: https://docs.ollama.com/api/openai-compatibility
- MediaWiki source retrieval: https://www.mediawiki.org/wiki/API:Search_and_discovery

## Developer commands
`npm ci`
`npm run build`
`npm test`
`npx playwright install chromium --only-shell`
`npx playwright test --project=desktop --project=mobile`

Use `node server.mjs` for the app with live APIs. A static file host or `vite preview` does not provide the live backend. Node.js 22+ is required. Backend binds to 127.0.0.1 and accepts changes only through same-origin JSON app requests; it is not a public multi-user server.
