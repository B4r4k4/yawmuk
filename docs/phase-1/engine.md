# Phase 1 report: game engine

**Owner:** the engine agent. **Scope:** `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/engine/**`, `src/styles/**`, `src/scenes/index.js`, `src/scenes/_placeholder.js` and `public/`.
The scene-author guide is in `src/engine/README.md`.

## Run

```
npm install
npm run dev        # http://localhost:5173  (?scene=<id>&nointro=1&lang=en&debug=1)
npm run build      # dist/ uses base './' and works from any static host
```

## Architecture

- **Stack:** Vite 6 and three r170. All geometry is procedural, with no external assets. Google Fonts are loaded via `<link>` (Tajawal, Noto Kufi Arabic, Amiri, Amiri Quran) with system fallbacks.
- **Game flow (`game.js`):**
  1. Start screen (AR/EN; Arabic is the default and fully RTL).
  2. Intro with the four disclaimers from `ui_strings.json` and the controls.
  3. For each location: intro card, then exploration, situations, the exit (locked until all situations are done), the outro, and finally `next_location`. `null` leads to the summary.
  4. Summary screen: score out of the maximum, situations done, best choices, correct checks, topics with verdict badges, a score-tier message, and the "ask a trusted scholar / local imam" note.
- **Situation flow (`ui/situation.js`):**
  1. Setup and dialogue in a bottom sheet. Speakers are adam, narrator or the NPC id, resolved to `npc.name`.
  2. Choices, shuffled on every display, selectable with keys 1–4.
  3. The consequence with a quality badge and points.
  4. The ruling card.
  5. The check question (+5 if correct).
  6. "Done" or "Try another choice".
  
  The score keeps the best points per situation. Revisiting a finished hotspot offers "try another choice" or "review the ruling card".
- **Ruling card (`ui/rulingCard.js`):**
  - A colour-coded verdict badge and a review-status badge. Only explicit human or scholar review shows as "reviewed"; `ai_draft` and `ai_verified` both show as pending scholar review.
  - Confidence, question and summary.
  - Quran in Amiri Quran, with surah:ayah and the source link; the translation shows in EN.
  - Hadith: text, collection and number, narrator, grade and grader, link.
  - The four madhhabs as accessible tabs on narrow screens and 4 columns on wide screens.
  - Contemporary bodies, practical guidance, halal alternatives, "refer to a scholar when…", and the general-info and AI-review disclaimers.
  - A missing ruling shows a "content pending" card.
  - All text is inserted with `textContent`, and only http(s) links are rendered.
- **Content (`content.js`):** `import.meta.glob` (eager, `?raw`) over `content/rulings/*.json` and `content/script/*.json`, parsed with `JSON.parse` inside try/catch, so a malformed JSON file is reported and skipped and the build never breaks. `ui_strings.json` overrides the UI strings, verdict names, quality labels and location names. Test fixtures in `src/engine/__fixtures__/` are used only for missing content, and their UI is badged.
- **Scenes:** `sceneRegistry.js` lazy-globs `src/scenes/*.js` (ignoring `index.js` and `_*.js`) and falls back to `_placeholder.js` if a file is missing, fails to import or throws in `build()`. `sceneManager.js` validates and normalises the result:
  - auto-places missing script hotspots with a warning
  - builds NPCs from `look` (`bg_*` NPCs get no label)
  - places hotspot and exit markers and clamps the player to the scene bounds
  - collects camera occluders and applies the `sky`/`fog` overrides
  - disposes everything except the shared materials
- **Player, camera and input:** a circle-vs-AABB collider with sliding. The camera orbits with mouse drag and the wheel zooms. Camera occlusion uses a raycast that honours `material.side` (cut-away single-sided walls never pull the camera in) plus optional `cameraOccluders`. Controls are WASD or arrows, Shift to run, E/Enter/Space to interact and Esc for the menu. On mobile there is a virtual joystick, drag-to-look and a tap Interact button.
- **Rendering:** one PCF-soft shadow-casting sun (1024 px on mobile, 2048 px on desktop) whose frustum follows Adam, a hemisphere light, fog, ACES tone mapping and pixelRatio capped at 2. There are three presets: day, evening and night.
- **Persistence and HUD:** localStorage access is wrapped in try/catch. The HUD shows location, time, score, X/18 and a menu button. The menu has resume, a language switch, jump-to-location, the summary and restart. Locations fade in and out.

## Coordinator requests addressed

| Request | Status |
|---|---|
| `next_location: null` leads to the summary | Done |
| +5 for a correct check question | Done |
| Shuffled choices | Done |
| `hijabColor` | Done, with a reworked hijab (a hood with a real face opening, plus a drape) |
| `bg_` NPCs | Done |
| `ui_strings.json` | Done, including the disclaimers |
| `sky` / `fog` overrides | Done |
| `cameraOccluders` | Done |
| Label `depthTest` | Now defaults to true |
| The tick `t` shadowing bug | Fixed |

## Verification

The Chrome extension cannot reach this machine's localhost, so verification used local **headless Chrome driven over CDP** (a scratch script outside the repo).

- `npm run build` passes.
- **All six real scenes** (`?scene=<id>&nointro=1`) load with no console errors or warnings. Every script hotspot is provided by the scenes, none are auto-placed. Exit prompts show the "finish first" lock. Scenes range from 89–253 meshes and 4.8k–15.8k tris.
- The full flow in EN and AR, with screenshots:
  - start screen, intro, location intro and HUD
  - dialogue, choices, consequence and ruling card (including the RTL madhahib columns)
  - check question and done
  - progress persisted, exit lock, outro and the next location
- Headless FPS is not meaningful because of software rendering.
- Camera raycasts against big merged meshes cost about 20 ms, so meshes over 2000 triangles are now excluded automatically. Scenes can pass proxies through `cameraOccluders`.

## Suggestions and notes for the supervisor

- `review_status` values in use are `ai_draft` and `ai_verified`. Both are shown as "pending scholar review". If a human review status is introduced, use a value containing `scholar` or `human` (for example `scholar_reviewed`).
- The `index` chunk is about 570 kB because the rulings are embedded as raw JSON. This is acceptable; it could be split per location later if needed.

## Update 2026-10-05: Adam is a Christian learner

### Ruling card
- **"In plain words"** shows `newcomer_explainer` right under the verdict.
- **"Common ground with Christianity"** appears in a soft-blue panel. It shows `common_ground`:
  - the summary
  - the Bible verse in the UI language (Van Dyck in Arabic, KJV in English), linked to `source_url_ar` or `source_url` to match
  - the differences
  - the translation note
- When displayed, unmatched quotation marks are dropped. The data itself is untouched.
- Each section is hidden when its field is missing or empty.

### End screen
- "What Adam learned" uses `end.summary_points` plus the completed topics, each with the first sentence of its plain-words explainer.
- "A topic to explore next" picks an entry from `end.next_topics` based on the theme the player explored most (`THEMES[...].nextTopic` in config.js), and also offers any situation the player hasn't explored yet.
- The mosque or Islamic-center referral (`end.referral_*`) has a button that searches for "mosque open house near me". The link contains only that fixed text.
- The game never asks about or stores the player's beliefs.

### Other changes
- **Player and scenes:**
  - `PLAYER` in config.js holds Adam Reed's look.
  - A scene can return `playerLook`, which is merged over it for that scene only.
  - New `makeNPC` option `jacket`: an open coat with no tie.
  - NPCs can have `stations` (documented in the README).
- **Labels:** `ui_strings.json` keys are mapped with fallbacks. `UI_MAP` in i18n.js accepts several candidate names for each key.
