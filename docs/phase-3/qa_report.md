# Phase 3 report: integration and QA

**Owner:** the integration and QA agent. **Date:** 2026-10-05.

**Scope:**
- the test suite (`tests/**`)
- the static server (`tools/serve.mjs`)
- the source-log generator (`tools/audit/sources_md.mjs` → `docs/SOURCES.md`)
- `README.md`, `.gitignore` and the `package.json` scripts
- bug fixes in the engine UI and the scenes
- the git repository: initial commit, no remote

## Pivot re-test: Adam is a Christian learner (2026-10-05)

This re-test followed the change of premise:
- Adam Reed is a Christian learning about Islam from Muslim friends.
- The rulings gained `newcomer_explainer` and `common_ground`, and the scripts were rewritten.
- The engine gained the "In plain words" and "Common ground" card sections, the new end screen, NPC `stations` and `playerLook`.
- All six scenes were updated.

**The tree was stable during the run.** dist/ was freshly built, and the e2e now serves a private snapshot of it, so a rebuild in another terminal cannot swap the chunk names during a run.

Sections 1–6 below describe the first pass and remain valid unless this section says otherwise.

### Results

| Suite | Result |
|---|---|
| `npm test` | **197 / 197 pass**, 0 skipped. That is 19 new tests: 18 pivot-contract tests and 1 that checks the README links. `verify.mjs` now also checks the Bible verses; with its cache it ran 281 checks, FAIL 0. |
| `npm run test:e2e` | **4 / 4 configurations pass**, 0 failures. 90 ruling cards were validated, including the new panels. |
| Flakiness | The two phone configurations were rerun twice more (3 runs in total). There were 0 failures, including 36 of 36 madhhab-tab taps. |

Each configuration takes about 2–2½ minutes; the station fades and new scenes make runs slower than in the first pass.

### Fixes to the e2e for the reported failures

| Report | Cause | Fix (`tests/e2e/playthrough.mjs`) |
|---|---|---|
| mobile-en could not find choice "c" in `gifts_birthday` | The test looked up a fixed choice by its label. Choices are shuffled, and the content and build changed during that run. | Each rendered button is mapped back to its script choice by its normalised label. The test fails if any button matches no script choice, or if the rendered set differs from the script, which catches a content/build mismatch with a clear message. It then picks the wanted *quality* from what is on screen, so new or edited options (such as the wedding's new acceptable option) need no change to the test (line 470). |
| desktop-ar got a placeholder scene after a 404 caused by a rebuild mid-run | dist/ was rebuilt while the test was serving it, so the hashed chunk names changed. | The test serves a temporary copy of dist/ (line 792). The placeholder check is unchanged, and it passed. |
| Is the mobile madhhab-tab check flaky? | A risk was real. The old `press()` scrolled with `block:'nearest'`, so a tab at the bottom edge could sit under the ruling card's sticky "Next" bar, and a tap there would advance the card. | `press()` now centres the element and checks with `elementFromPoint` that nothing covers it, retries once, and otherwise fails with a clear message instead of clicking blindly (line 99). It was stable in 3 of 3 runs. |
| — | The reachability grid was computed once per location, but Samir's collider now moves between stations. | Reachability is recomputed before every walk. |

### New behaviour now covered by the e2e

| Check | How |
|---|---|
| **"In plain words"** | It is present when `newcomer_explainer` exists, its text equals the data, and it sits **directly under the verdict header**. It must not appear without data. |
| **"Common ground"** | The summary and differences are shown verbatim, the number of verses matches, and the panel comes after the madhhab section. |
| **Bible text exactly as in the data** | Each verse is in the UI language: KJV in English and Van Dyck in Arabic, with the right `lang`/`dir`. Its text equals the data except for unmatched quotation marks, which the renderer intentionally drops at display time. The reference and the translation label ("KJV" or "Van Dyck") are present. |
| **Arabic link for Arabic text** | Arabic text links to `source_url_ar` (getbible arabicsv); English text links to `source_url` (bible-api KJV). |
| **Samir's stations** (work, public_events) | On entry he is at his first unfinished hotspot. After each situation he is at the next one, and his collider has moved with him. When he speaks, he stands at that hotspot. **mobile-en plays work in reverse order**, so Samir must jump to `adam_desk` first and then go back to `coffee_machine`. The log is in `e2e_results.json` → `stations`. |
| **Adam's look** | In every scene, the player figure matches `PLAYER.look` in config.js: shirt `#2f4a6d`, no beard, no kufi. The navy jacket `#1f2d4d` appears **only in the street**, from that scene's `playerLook`. Results are in `e2e_results.json` → `looks`. |
| **End screen** | The "What Adam learned" heading and `end.summary_points` are shown verbatim. The 18 topics each carry the first sentence of their plain-words explainer. The next topic matches the `THEMES` logic. The single mosque-referral link is exactly `https://www.google.com/maps/search/<fixed query>`, with no query string or extra data. The screen has no form inputs. |
| **Mid-game end screen** (desktop-en) | Opened from the menu after *work*: it suggests the expected unexplored situation (`school.student_loan`, from the most-explored "money" theme). "Go there now" loads the college. |
| **No belief data stored** | localStorage holds only `yawmuk.progress.v1`, with whitelisted fields (`v, lang, location, situations{tried,best,done,check,last}, visited, finished, introSeen`). There are no belief- or religion-related keys or values. sessionStorage, cookies and IndexedDB are empty. There are no requests to third parties other than Google Fonts. |

### Screenshot review

I reviewed the screenshots myself, including the new card panels on a phone in RTL:
- The common-ground panel is mirrored correctly, with its border on the right in Arabic. The Van Dyck text is diacritized and readable.
- The verbatim KJV verses are shown in italics.
- The "In plain words" panel sits under the badges.
- On a phone, the end screen shows its 2×2 stats tiles, the next-topic and mosque-referral cards, and the "About these rulings" note.
- Adam's home shows a small cross and a Bible on the shelf. Adam has the new look, with a navy jacket in the street.

No layout regressions were found.

One small change came out of the review. Bible references in the caption (for example «رومية 14: 21 · Van Dyck») are now isolated with `<bdi>`, like the other content values (`src/engine/ui/rulingCard.js:125`).

**Screenshot set:** I kept one current set: `docs/phase-3/screenshots/{desktop-ar,desktop-en,mobile-ar,mobile-en}/`, 279 images in total. Each configuration's folder is now cleared at the start of its run, so stale numbering cannot mix with a new run. I deleted `street-v2/`, the street agent's one-off hotspot shots, because the same views are covered by the playthrough.

### Other fixes in this pass

- **`src/engine/README.md` §3, seated legs:** the note now says `+Math.PI/2`. The legs hang along −Y and the figure faces −Z, so a positive rotation swings the thighs forward. home.js and school.js already used +π/2.
- **`README.md`:** rewritten for the new premise, with the new screenshots, test coverage and methodology. A new test checks that every local README link exists.
- **Tests:** in `tests/content.test.mjs`, every ruling must now have a bilingual `newcomer_explainer` and `common_ground.summary`. Every Bible verse must have `ref_en`/`ref_ar` with the same chapter and verse, KJV and Van Dyck text, https `source_url` and `source_url_ar`, and a `verified: true` entry in `content/sources.json`.

### Performance after the pivot (desktop-en / mobile-ar)

| Scene | Meshes | Instanced | Triangles (instances expanded) | Draw calls per frame, desktop / phone | Triangles per frame, desktop / phone | Point lights | Frame time* |
|---|---|---|---|---|---|---|---|
| home | 107 | 0 | 16.2k | 131 / 101 | 17.2k / 15.8k | 3 | 16.6 ms |
| work | 132 | 11 | 15.1k | 121 / 33 | 14.5k / 10.4k | 0 | 16.7 ms |
| school | 212 | 25 | 18.1k | 235 / 171 | 18.9k / 16.1k | 3 | 16.6 ms |
| street | 112 | 7 | 11.5k | 142 / 112 | 12.5k / 11.6k | 3 | 16.7 ms |
| public_events | **309** | 36 | **52.1k** | **289** / 112 | 49.9k / 37.3k | 3 | 16.7 ms |
| private_events | 236 | 18 | 37.4k | 207 / 202 | 35.3k / 34.9k | 2 | 16.6 ms |

\* Measured on an Intel UHD 620 laptop iGPU, capped by vsync. This is not a phone measurement.

**Bundle:** `index` is 672.6 kB (up from 572 kB, because of the larger embedded content JSON), `three` is 687.5 kB, and dist/ totals 1.5 MB.

**Camera sweep** (8 yaws per hotspot): every hotspot is 0/8 except home/laptop 1/8, home/fridge 1/8, work/coffee_machine 2/8, work/hr_desk 1/8 and private_events/garcia_yard 1/8. The gas-station counter is still 0/8.

### Open issues after the pivot

1. **public_events is over the README budget:** 309 meshes against ≤ 250, and 289 draw calls on desktop. It is also close to the triangle limit (52k of 60k). This is for the scene owner: merge or instance the new props, or drop decor on phones (it is 112 draw calls on the phone).
2. **Content, from `docs/audit/pivot_audit.md` §3.3:**
   - The `question` field of 9 rulings still addresses Adam as the Muslim who must follow the ruling (wedding, neighbor_funeral, gifts_birthday, holiday_greetings, alcohol_table, student_loan, mixed_social, lost_wallet, buying_selling).
   - Claims about Christian practice need a reviewer familiar with Christianity.

   I changed no content.
3. **The end screen opened from the menu mid-game:**
   - It uses the end-of-week title ("That's a Wrap") and a score-tier message.
   - `showSummary()` sets `finished=true` (`src/engine/game.js:168`), although the week is not over. The flag is not read anywhere today.

   Both are cosmetic, for the engine owner.
4. Still open from the first pass: no scholar review yet, no real-phone or iOS testing, the size of the screenshots in the repo (18 MB), and the licence TODO.

---

## 1. Results

| Suite | Command | Result |
|---|---|---|
| Unit, content-contract and safety tests, plus the citation-audit wrapper | `npm test` | **177 / 177 pass**, 0 skipped. The audit wrapper ran `verify.mjs` from its cache: 187 checks, PASS 187, FAIL 0. |
| End-to-end playthrough (headless Chrome, served from `dist/` without Vite) | `npm run test:e2e` | **4 / 4 configurations pass**, 0 failures. 90 ruling-card renders were validated against the JSON (36 in desktop-ar, which also replays every situation, and 18 in each other configuration). |
| Production build | `npm run build` | passes. `dist/` was also tested served from a sub-path (`/dist/`) with no errors. |

Each full e2e run takes about 5½ minutes on this machine: Intel UHD 620, Chrome 154, `--use-angle=d3d11`. With `E2E_GL=swiftshader` (software rendering) a frame takes 0.4–0.8 s and a run takes about an hour. Detailed output, including per-scene performance, reachability and the camera sweep, is in `docs/phase-3/e2e_results.json`. The 254 screenshots are in `docs/phase-3/screenshots/<config>/`.

## 2. Test matrix

✓ = checked automatically and passed.

| Check | desktop-ar (1366×768) | desktop-en | mobile-ar (390×844, DPR 2, touch, Android UA) | mobile-en |
|---|---|---|---|---|
| Start screen, language buttons, `dir`/`lang` attributes | ✓ | ✓ | ✓ | ✓ |
| Intro with ≥ 4 disclaimers | ✓ | ✓ | ✓ | ✓ |
| `body.touch` set only on touch devices | ✓ | ✓ | ✓ | ✓ |
| 6/6 real scenes (no placeholder, no auto-placed hotspots, 0 `[scene]`/`[content]` warnings) | ✓ | ✓ | ✓ | ✓ |
| Every hotspot (18) and exit (6) reachable on foot from spawn (grid BFS using the engine's collision rules) | ✓ | ✓ | ✓ | ✓ |
| Interaction with the **E** key (desktop) or the **Interact** button tap (touch) | ✓ | ✓ | ✓ | ✓ |
| Exit locked until the location is finished (toast shown, mode unchanged) | ✓ | ✓ | ✓ | ✓ |
| Dialogue line count = setup + dialogue | ✓ 18 | ✓ 18 | ✓ 18 | ✓ 18 |
| Rendered choices = script choices; chosen label found after the shuffle; points badge | ✓ | ✓ | ✓ | ✓ |
| Ruling card: id, title, verdict badge, status ≠ "reviewed", question, summary, Quran/hadith block counts, a source link on every citation, translations (EN only), 4 madhhab tabs and panels (none empty), contemporary count, guidance and alternatives counts, referral, both disclaimers, only http(s) links, no horizontal overflow | ✓ 36 | ✓ 18 | ✓ 18 | ✓ 18 |
| Madhhab tab switching on a narrow screen | — | — | ✓ | ✓ |
| Check question: correct option highlighted; wrong-answer path | ✓ (wrong, then correct) | ✓ | ✓ | ✓ |
| "Try another choice" from the done screen (all 18) | ✓ | — | — | — |
| Revisit a finished hotspot → "review the ruling card" | ✓ | ✓ | ✓ | ✓ |
| Progress written to `localStorage` after every situation | ✓ | ✓ | ✓ | ✓ |
| Reload after home → Continue → resumes at *work* with 3 situations done and the language restored | ✓ | ✓ | ✓ | ✓ |
| Menu → language switch AR⇄EN (`dir` flips both ways) | ✓ | — | — | — |
| HUD situations counter after each location | ✓ | ✓ | ✓ | ✓ |
| 6 location transitions (exit → outro → next intro), then the summary | ✓ | ✓ | ✓ | ✓ |
| Summary: score = maximum (270), 18/18, 18 best choices, 18 correct checks, 18 topics with verdicts, title not cut off | ✓ | ✓ | ✓ | ✓ |
| `finished` flag stored | ✓ | ✓ | ✓ | ✓ |
| No horizontal overflow (start, intro, dialogue, ruling, summary) | ✓ | ✓ | ✓ | ✓ |
| 0 console errors, 0 page errors, 0 failed requests | ✓ | ✓ | ✓ | ✓ |
| Point/spot lights ≤ 3 per scene and no shadow-casting scene light | ✓ | ✓ | ✓ | ✓ |
| Camera sweep (8 yaws at every hotspot; is Adam occluded?) | `--camera` | ✓ | ✓ | ✓ |

### Unit and safety tests (`npm test`, 177 tests)

**Content contract** (`tests/content.test.mjs`):
- the 18 ids in `TEAM_BRIEF.md` match `src/engine/config.js` and the rulings
- the rulings files are named after their locations
- every ruling has all required fields, bilingual, with ar/en lists of equal length
- the four madhhabs are present
- the script chain ends in `null`
- each catalog situation is played exactly once
- each script has a header and 3 situations
- every `ruling_id` exists
- every hotspot is listed in `docs/hotspots.md` and defined in the scene source
- every dialogue speaker is known
- each situation has ≥ 2 choices with unique ids
- each situation has exactly one `best` choice, and it gives the most points
- each check question has exactly one correct option
- every `{ar,en}` pair in `ui_strings.json` is complete

**Safety** (`tests/safety.test.mjs`):
- **Attribution:**
  - every ayah has surah 1–114, an ayah number or range, the surah name, a translation and a quran.com link to the same surah, and is marked verified in `sources.json`
  - every hadith has collection, number, narrator, grade and an https link to a known hadith site
  - Bukhari and Muslim hadiths are graded صحيح
- **No fabricated hadith:**
  - six-book hadiths are machine-verified in `sources.json`
  - every other hadith must match an entry in `tools/audit/manual_verifications.json`
- **Abstention:**
  - an empty `text_ar` must be explained in `notes_for_reviewer`
  - the renderer shows a "content pending" card for a missing ruling, with no Quran, hadith or madhhab blocks
  - it shows "not provided" for a citation with no text, and never a quote
- **Referral:** every ruling has a meaningful `refer_to_scholar_when` in both languages, and the card heads it "When to ask a scholar".
- **Honest status:**
  - `review_status` is only `ai_draft` or `ai_verified`
  - only an explicit human/scholar status renders as "reviewed"
  - every `ai_draft` or non-high-confidence ruling has reviewer notes
- **No empty madhhab entry** without a reviewer note that names it.
- **Story ≠ ruling:** 11 detectors run over every string in `content/script/*.json`:
  - `﴿ ﴾`
  - «قال رسول الله / قال النبي»
  - «قال تعالى»
  - the salawat formula
  - an isnad «عن فلان رضي الله عنه»
  - "the Prophet … said"
  - "Messenger of Allah said"
  - "Allah says"
  - "the Quran says"
  - a hadith reference number
  - a surah:ayah reference

  A self-test proves the detectors fire.
- **Renderer** (run under node with a tiny DOM shim):
  - for all 18 rulings in both languages, every ayah and hadith is rendered **verbatim** with its reference, collection, number and grade
  - there are 4 madhhab panels, the referral and both disclaimers
  - `javascript:` and `data:` links are never rendered
- **Disclaimers and source log:**
  - `ui_strings.json` has the disclaimers
  - the README carries the review-status disclaimer in both languages
  - `docs/SOURCES.md` is in sync with `content/sources.json`

**Audit wrapper** (`tests/audit.test.mjs`): runs `tools/audit/verify.mjs --quiet`.
- Exit 1 (a citation mismatch) fails the test.
- Exit 2 (offline with no cache) or a timeout skips the test with a clear message.
- `SKIP_AUDIT=1` skips it on purpose.

## 3. Bugs found and fixed

| # | Bug | Where (file:line) | Fix |
|---|---|---|---|
| 1 | **Work: the camera started outside the west wall.** At spawn, and at some angles near the coffee machine, a grey wall filled most of the view (reported by the documentation agent, confirmed in screenshots and the camera sweep). The walls are instanced, so the engine never treated them as camera occluders. | `src/scenes/work.js:217-226` (walls mirrored in `OCC`), `:506-514` (proxy meshes), `:619` (`cameraOccluders` in the result) | Invisible proxy boxes for the 4 opaque walls (`colorWrite:false`, DoubleSide, `visible=false`) returned as `cameraOccluders`. Camera sweep at hr_desk went from 4/8 to 1/8 occluded yaws; spawn now shows the office. |
| 2 | **Street: Adam was completely invisible at the gas-station counter.** The camera stayed outside or above the mart, and the merged stucco walls and roof hid him: 7 of 8 camera yaws occluded. | `src/scenes/street.js:117-131`, `:549` | Proxy boxes for the back wall, side walls, front header and roof, passed as `cameraOccluders`. Occluded yaws: **7/8 → 0/8**. The camera now stays inside the store. |
| 3 | **Ruling card bidi:** in English, Arabic references (madhhab books, narrators, grades, council names) were laid out inside LTR paragraphs, which scrambled punctuation and the order of «» quotes, numbers and URLs. | `src/engine/ui/rulingCard.js:10` (`iso()`), `:37`, `:47-49`, `:66`, `:87` | Content values are wrapped in `<bdi dir="auto">`. |
| 4 | **Summary title and score unreachable.** `.overlay-screen` used `align-items:center`, so a screen taller than the viewport overflowed upwards and could not be scrolled to. On every viewport the title, score and stats were cut off. | `src/styles/main.css:62-65` | `align-items:flex-start` plus `margin:auto` on `.screen`. Added an e2e regression check: the summary `h1` must be at or below the top of the viewport. |
| 5 | Mobile: toasts sat on top of the second HUD row (the situations chip). | `src/styles/main.css:221-222` | `.toasts{top:112px}` at ≤ 600 px. |
| 6 | Mobile: the four madhhab tabs wrapped 3 + 1. | `src/styles/main.css:223-225` | A 4-column grid with tighter padding. |
| 7 | Mobile summary: the verdict badge squeezed topic titles to one word per line; the stat tiles overflowed. | `src/styles/main.css:226-232` | The badge moves under the title; the stats use a 2×2 grid and a smaller number font. |
| 8 | Gameplay toasts and the HUD were drawn over full-screen screens (summary and start). | `src/styles/main.css:237-238` | `#ui:has(> .overlay-screen) :is(.toasts,.hud){display:none}` |
| 9 | Toasts were forced to `direction:ltr; text-align:left`, so Arabic messages were laid out left to right. | `src/styles/main.css:205` | `unicode-bidi:plaintext; text-align:start`. |
| 10 | **Point-light budget exceeded** (from the supervisor): home 4, street 5, public_events 5, school 7, against the README limit of 3. | `src/scenes/home.js:567`, `src/scenes/street.js:350-353`, `src/scenes/public_events.js:424-428`, `src/scenes/school.js:582-590` | **Decision: reduce to ≤ 3 per scene and keep the README limit.** We have no real mid-range phone to prove the extra lights are cheap. Our in-browser timing on the laptop iGPU was too noisy to rely on: `gl.finish` timings varied by more than the effect being measured. Every scene now passes an e2e budget assertion (≤ 3 point/spot lights, 0 shadow-casting). Details are below the table. Before/after screenshots look the same in street and public_events; the school corridor is slightly darker but well lit. |
| 11 | public_events: the evening preset background (salmon) showed as a flat band under the floor edge at spawn. | `src/scenes/public_events.js:484-487` | `sky: '#24171a'` |

How the lights were reduced (bug 10):
- **home:** dropped the 0.6-intensity, 2.2 m fridge light; the fridge interior is already emissive.
- **street:** kept the bus-stop lamp, the canopy (range 16 → 19) and the mart interior. The other lamps already have additive light-pool decals.
- **public_events:** merged the stage and tree lights into the centre and gift-table lights, with a longer range. The tree glows from its emissive bulbs.
- **school:** 7 → 3 lights. Each sits between a room and the corridor, with range 11 → 14.

Also checked and found to be fine:
- **public_events twinkle shader** (`onBeforeCompile` with `uTime` on an InstancedMesh): it compiles with no WebGL or console error in all 4 configurations, and the bulbs render. The `#include <opaque_fragment>` hook exists in three r170.
- **RTL layout**: the ruling card's four madhhab columns are mirrored correctly, the "Next ‹" arrow is mirrored, HUD chips with mixed Arabic and English text are ordered correctly, and nothing overflows horizontally on any viewport.
- `dist/` works from any static host and from a sub-path.

No script or ruling file was changed. No test required a fix in the scripts.

## 4. Performance

Measured in-game, on the scene root, in the `desktop-en` configuration.

| Scene | Meshes (incl. NPCs, markers) | of which instanced | Triangles (instances expanded) | Draw calls per frame (incl. shadow pass) desktop / mobile | Triangles per frame desktop / mobile | Point lights | Colliders | Camera occluders | Frame time* |
|---|---|---|---|---|---|---|---|---|---|
| home | 89 | 0 | 15.8k | 114 / 81 | 16.9k / 15.0k | 3 | 32 | 10 | 16.7 ms |
| work | 113 | 11 | 13.5k | 112 / 51 | 13.4k / 10.7k | 0 | 42 | 14 | 16.7 ms |
| school | 202 | 25 | 17.7k | 226 / 170 | 18.6k / 16.2k | 3 | 64 | 32 | 16.7 ms |
| street | 124 | 7 | 12.1k | 153 / 109 | 13.2k / 11.4k | 3 | 46 | 39 | 16.7 ms |
| public_events | 253 | 35 | 48.9k | 236 / 114 | 47.1k / 37.6k | 3 | 70 | 48 | 16.7 ms |
| private_events | 201 | 16 | 57.8k | 209 / 205 | 57.9k / 57.8k | 2 | 70 | 18 | 16.7 ms |

\* Average over 30 frames on an Intel UHD 620 (laptop iGPU) through ANGLE D3D11, at both 1366×768 and 780×1688 (phone at DPR 2). Frames are capped at 60 fps by vsync, so every scene hit the cap. This is **not** a phone measurement.

Every scene is within the README budget (≤ 60k triangles, ≤ 250 meshes). private_events (57.8k) and public_events (48.9k) are close to the triangle limit, and public_events (253 meshes) is at the mesh limit. The `yawmuk.stats()` triangle figure does not multiply instanced meshes by their instance count (`countStats` in `src/engine/sceneManager.js`), so it under-reports work (4.8k), school (7.9k) and public_events (12.1k). The table above counts instances.

**Bundle** (`npm run build`, `dist/` is 1.4 MB):

| Chunk | Size | gzip |
|---|---|---|
| `three` | 687.5 kB | 177.2 kB |
| `index` (engine, UI, and all content JSON embedded raw) | 571.9 kB | 181.0 kB |
| CSS | 14.3 kB | 4.3 kB |
| Scenes (lazy, one per location) | 22–32 kB each | 8.7–12.2 kB |

The first load is about 365 kB gzip, plus Google Fonts.

## 5. Known issues and open items

**Camera:**
- The 8-yaw sweep still finds partial occlusion in a few spots:
  - private_events: harris_porch 2/8, garcia_yard 3/8, wedding_hall 2/8 (houses, bushes and trees in an outdoor scene)
  - work: coffee_machine 2/8 (kitchen cabinets, with the camera already pulled in to 2.1 m) and hr_desk 1/8
  - home: fridge 1/8
  - school: aid_office 1/8, where the blocking mesh is the hotspot marker gem itself, a false positive

  The player can orbit away from all of these, and the default approach view is clear. They could be refined with more proxies or `noCameraCollide` on bushes.
- At spawn on a phone, the work scene's camera sits close to Adam, because spawn is 2.4 m from a wall. This is expected with the occluder fix.

**Content problems (reported, not changed):**
- **`street.lost_wallet`:** one hadith's `number` field reads `"1722 (الرواية الخامسة في الباب)"`. The note belongs in another field; `number` should be numeric. The tests tolerate it (they use the leading digits).
- **English UI:**
  - madhhab `reference` values are Arabic only, so they show in Arabic in the English card (now laid out correctly with `<bdi>`)
  - contemporary `body` and `decision_ref` are Arabic only for some councils
  - an English reference field would help non-Arabic readers
- **Scholar review:** none of the 18 rulings has been reviewed by a scholar. The 4 `ai_draft` rulings and the prioritized list in `docs/audit/phase1_audit.md` §4 remain open. 72 madhhab references and 45 contemporary references are not verified against print (`docs/SOURCES.md`).

**Engine:**
- `countStats` ignores instance counts (see §4).
- A 3.5 s toast can still overlap a modal dialog. It no longer covers full screens.

**Tooling:**
- The e2e needs a GPU for a reasonable runtime. Software rendering works (`E2E_GL=swiftshader`) but is about 10× slower.
- The audit test depends on `tools/audit/.cache/`, which is ignored by git (about 50 MB). A fresh clone needs network once; offline it is skipped, not failed.

**Repository:**
- The hackathon brief PDF at the root is in `.gitignore`, because it is the organizers' document; the team can decide to add it.
- `LICENSE` is a TODO for the team (see the README).
- Screenshots add about 16 MB to the repo.
- **Nothing has been deployed.** The README has GitHub Pages and Netlify instructions.

**Not tested:**
- real phones and iOS Safari
- Firefox
- screen readers (only focus order and ARIA roles were reviewed in code)
- an actual FPS figure on a phone

## 6. Files added or changed in this phase

**Added:**
- `tests/content.test.mjs`
- `tests/safety.test.mjs`
- `tests/audit.test.mjs`
- `tests/helpers/content.mjs`
- `tests/helpers/dom-shim.mjs`
- `tests/e2e/playthrough.mjs`
- `tools/serve.mjs`
- `tools/audit/sources_md.mjs`
- `docs/SOURCES.md`
- `docs/phase-3/qa_report.md`
- `docs/phase-3/e2e_results.json`
- `docs/phase-3/screenshots/**`
- `README.md`
- `.gitignore`

**Changed:**
- `package.json`: scripts `test`, `test:e2e`, `serve:dist`, `audit`, `sources`; devDependency `puppeteer-core`; `engines.node >= 22`
- `src/engine/ui/rulingCard.js`
- `src/styles/main.css`
- `src/scenes/work.js`
- `src/scenes/street.js`
- `src/scenes/home.js`
- `src/scenes/school.js`
- `src/scenes/public_events.js`

All in-code changes are marked `Phase 3 QA`.
