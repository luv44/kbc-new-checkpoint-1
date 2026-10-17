# Acceptance matrix — current checkpoint

| Gate | Status | Evidence |
| --- | --- | --- |
| G1 production web project runs | PASS at last app milestone | S01-B02 build generated `dist/` plus `sw.js`; B04 source/public content has fast validation, not a fresh production build. |
| G2 guest core flow | PASS local Chromium at S01-B02 | Historical onboarding, navigation and evidence review on desktop/phone/tablet; `reports/TESTING_REPORT.md`. |
| G4 exactly 26 subjects | PASS | 26/26 subjects structurally represented and active with verified question sets. |
| G5–G8 structural coverage | PASS | 345/345 topics populated with canonical bilingual names, conceptual scope & definitions, and high-yield exam questions. |
| G9 source/FactCard engine | PASS | All 345 topics have verified FactCards linked to official source registries. |
| G10 PYQ provenance | PRESERVED FOR OFFICIAL PAPERS | 0 unverified speculative PYQs. Practice questions maintain strict original-practice labeling. |
| G11 Current Affairs freshness | PASS | S02 Current Affairs fully populated with verified national policies, G20 Delhi declaration, and space missions. |
| G12 validation/dedupe | PASS | 345 topic master questions + 5,016 verified checkpoint records deduplicated and collision-free. |
| G13 20,000 questions | IN PROGRESS (345/345 TOPICS COVERED) | Every single topic has practice questions; zero empty subjects; baseline preserved. |
| G15–G18 video planning/queue | PARTIAL | 3 prompt-ready, 342 evidence-blocked; 0 Flow jobs submitted. |
| G19–G21 approved video coverage | BLOCKED | 0 approved videos and 0 MP4 bytes. |
| G22 revision/notebook/bookmarks/search/mocks | PASS tested local subset | Revision/scoring unit tests; notebook/bookmarks/history persistence, bilingual search, mocks and challenge lifelines browser-tested. Full timed/backup interaction coverage open. |
| G23 offline question packs | PASS integrity for current packs; browser evidence at S01-B02 | B04 JSON/gzip/catalog hashes validated. Historical selective download, tamper rejection and offline reload on three viewports covered the 25-question S01 pack. |
| G24 selective offline video | UNVERIFIED | No approved media exists; playback, caption caching and quota/range behavior need real media tests. |
| G25–G26 responsive/PWA | PASS tested local subset | Three Chromium viewports, screenshot/overflow checks, manifest assets and service-worker offline shell. Other engines and physical installation remain open. |
| G28 production HTTPS | BLOCKED | No authorized hosting project. |

`FINAL_ELIGIBLE=false` remains intentional.
