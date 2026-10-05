#!/usr/bin/env node
// Headless end-to-end playthrough of «يومك» Yawmuk.
//
// Serves the production build (dist/) with a tiny static server (no Vite), drives a local headless
// Chrome through puppeteer-core and plays the whole day: 6 locations x 18 situations, in Arabic and
// English, on a desktop viewport and a 390x844 touch phone viewport.
//
// It checks: no console/page errors, every scene is the real one (no placeholder, no auto-placed
// hotspots), every hotspot + the exit is reachable by walking from spawn (grid BFS against the
// player's own collision rules), interaction via the E key (desktop) / the Interact button (touch),
// the dialogue -> choices -> consequence -> ruling card -> check question -> done flow, every ruling
// card section against content/rulings, "try another choice", the revisit menu, the language switch,
// location transitions, localStorage resume after a reload, the final summary (score = max), and
// horizontal overflow (RTL/LTR) of the page and the ruling card.
//
// Usage:  npm run test:e2e                       (builds dist/ if missing)
//         node tests/e2e/playthrough.mjs --only=desktop-en,mobile-ar --no-shots --build --camera
//   --only=<names>   run a subset of: desktop-ar, desktop-en, mobile-ar, mobile-en
//   --no-shots       do not write screenshots to docs/phase-3/screenshots/
//   --build          force `npm run build` first
//   --camera         also sweep the camera around every hotspot (8 yaws) and report occlusion
//   --hotspot-shots=<dir>  save a screenshot at every hotspot (visual QA)
// Env: CHROME_PATH=<path to chrome/chromium>. If no browser is found the test is SKIPPED (exit 0).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../tools/serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SHOTS = !args['no-shots'];
const SHOT_DIR = path.join(ROOT, 'docs/phase-3/screenshots');
const HOTSPOT_SHOTS = typeof args['hotspot-shots'] === 'string' ? path.resolve(args['hotspot-shots']) : null;
const CAMERA = !!args.camera;
const RESULTS_FILE = path.join(ROOT, 'docs/phase-3/e2e_results.json');

const LOCATIONS = ['home', 'work', 'school', 'street', 'public_events', 'private_events'];
const CONFIGS = [
  { name: 'desktop-ar', lang: 'ar', mobile: false, retry: true, viewport: { width: 1366, height: 768, deviceScaleFactor: 1 } },
  { name: 'desktop-en', lang: 'en', mobile: false, viewport: { width: 1366, height: 768, deviceScaleFactor: 1 } },
  { name: 'mobile-ar', lang: 'ar', mobile: true, viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'mobile-en', lang: 'en', mobile: true, viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
].filter((c) => !args.only || String(args.only).split(',').includes(c.name));
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';

// ------------------------------------------------------------------ content (ground truth)
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/^\uFEFF/, ''));
const RULINGS = {};
for (const f of fs.readdirSync(path.join(ROOT, 'content/rulings'))) for (const r of readJson(`content/rulings/${f}`)) RULINGS[r.id] = r;
const SCRIPTS = Object.fromEntries(LOCATIONS.map((l) => [l, readJson(`content/script/${l}.json`)]));
const MAX_SCORE = LOCATIONS.flatMap((l) => SCRIPTS[l].situations).reduce((a, s) => a + Math.max(0, ...s.choices.map((c) => c.points || 0)) + (s.check_question ? 5 : 0), 0);
const TOTAL = LOCATIONS.reduce((a, l) => a + SCRIPTS[l].situations.length, 0);

// ------------------------------------------------------------------ browser discovery
function findChrome() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`, 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return c.find((p) => p && fs.existsSync(p));
}

// ------------------------------------------------------------------ helpers
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OPEN = '.overlay:not(.leaving)';
class Fail extends Error {}

function makeRunner(page, cfg, log) {
  const shotIdx = { n: 0 };
  const failures = [];
  const check = (cond, msg) => { if (!cond) { failures.push(msg); log(`  ✗ ${msg}`); } return !!cond; };

  async function press(selector, { index = 0, timeout = 20000 } = {}) {
    await page.waitForFunction((s, i) => { const els = [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null && !e.disabled); return els.length > i; }, { timeout, polling: 50 }, selector, index);
    const els = (await page.$$(selector));
    const vis = [];
    for (const e of els) if (await e.evaluate((n) => n.offsetParent !== null && !n.disabled)) vis.push(e);
    const el = vis[index];
    await el.evaluate((n) => n.scrollIntoView({ block: 'nearest' }));
    if (cfg.mobile) await el.tap(); else await el.click();
  }
  const waitSel = (s, timeout = 20000) => page.waitForSelector(s, { visible: true, timeout });
  const waitFn = (fn, timeout = 30000, ...a) => page.waitForFunction(fn, { timeout, polling: 50 }, ...a);
  const evalp = (fn, ...a) => page.evaluate(fn, ...a);

  async function shot(name) {
    if (!SHOTS) return;
    const dir = path.join(SHOT_DIR, cfg.name);
    fs.mkdirSync(dir, { recursive: true });
    await sleep(250); // let fades/transitions settle
    const file = path.join(dir, `${String(++shotIdx.n).padStart(2, '0')}-${name}.jpg`);
    // phones render at DPR 2; store them at 1.5x CSS size to keep the repo small but the text readable
    const clip = cfg.mobile ? { x: 0, y: 0, width: cfg.viewport.width, height: cfg.viewport.height, scale: 0.75 } : undefined;
    await page.screenshot({ path: file, type: 'jpeg', quality: 62, ...(clip ? { clip } : {}) });
  }

  /** Page + ruling-card horizontal overflow (RTL bugs usually show up as a horizontal scrollbar). */
  async function checkOverflow(where) {
    const o = await evalp(() => {
      const de = document.documentElement;
      const res = { page: de.scrollWidth - window.innerWidth, boxes: [] };
      for (const el of document.querySelectorAll('.modal, .sheet, .screen, .ruling-card, .hud')) {
        if (el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (el.scrollWidth - el.clientWidth > 2 || r.left < -2 || r.right > window.innerWidth + 2) res.boxes.push(`${el.className} sw=${el.scrollWidth} cw=${el.clientWidth} l=${Math.round(r.left)} r=${Math.round(r.right)}`);
      }
      return res;
    });
    check(o.page <= 1, `${where}: page overflows horizontally by ${o.page}px`);
    check(!o.boxes.length, `${where}: element overflow ${o.boxes.join(' | ')}`);
  }

  return { press, waitSel, waitFn, evalp, shot, check, checkOverflow, failures };
}

// ------------------------------------------------------------------ in-page: reachability (grid BFS)
// Same rules as src/engine/player.js: circle r=0.3 vs AABBs whose y-range overlaps (0.25, 1.7), clamped to bounds.
function reachabilityInPage() {
  const a = window.yawmuk.scenes.active;
  const R = 0.3, STEP = 0.1;
  const cols = a.colliders.filter((c) => c.max[1] > 0.25 && c.min[1] < 1.7);
  const b = a.bounds;
  const nx = Math.floor((b.maxX - b.minX) / STEP) + 1, nz = Math.floor((b.maxZ - b.minZ) / STEP) + 1;
  const free = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = b.minX + i * STEP, z = b.minZ + j * STEP;
    let ok = 1;
    for (const c of cols) {
      const dx = x - Math.max(c.min[0], Math.min(x, c.max[0])), dz = z - Math.max(c.min[2], Math.min(z, c.max[2]));
      if (dx * dx + dz * dz < R * R) { ok = 0; break; }
    }
    free[i * nz + j] = ok;
  }
  // start from where the engine actually puts Adam at spawn (after collision resolve)
  const p = window.yawmuk.player.pos;
  const si = Math.round((p.x - b.minX) / STEP), sj = Math.round((p.z - b.minZ) / STEP);
  const seen = new Uint8Array(nx * nz);
  const q = new Int32Array(nx * nz); let qh = 0, qt = 0;
  // find nearest free cell to spawn
  let start = -1;
  for (let r = 0; r < 6 && start < 0; r++) for (let di = -r; di <= r && start < 0; di++) for (let dj = -r; dj <= r; dj++) {
    const i = si + di, j = sj + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
    if (free[i * nz + j]) { start = i * nz + j; break; }
  }
  if (start < 0) return { error: 'spawn is inside a collider' };
  seen[start] = 1; q[qt++] = start;
  while (qh < qt) {
    const k = q[qh++], i = Math.floor(k / nz), j = k % nz;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
      const kk = ii * nz + jj; if (seen[kk] || !free[kk]) continue; seen[kk] = 1; q[qt++] = kk;
    }
  }
  const reachedArea = qt * STEP * STEP;
  const targets = [...a.hotspots.filter((h) => h.active).map((h) => ({ id: h.id, x: h.position[0], z: h.position[2], r: h.radius })), { id: 'exit', x: a.exit.position[0], z: a.exit.position[2], r: a.exit.radius }];
  const out = {};
  for (const t of targets) {
    let best = null;
    // prefer a standing spot ~60% of the radius away from the centre (realistic approach), fall back to nearest
    for (let k = 0; k < qt; k++) {
      const c = q[k], x = b.minX + Math.floor(c / nz) * STEP, z = b.minZ + (c % nz) * STEP;
      const d = Math.hypot(x - t.x, z - t.z);
      if (d >= t.r - 0.12) continue;
      const score = Math.abs(d - t.r * 0.6);
      if (!best || score < best.score) best = { x, z, d, score };
    }
    out[t.id] = best ? { reachable: true, stand: [best.x, best.z], dist: +best.d.toFixed(2), target: [t.x, t.z] } : { reachable: false, target: [t.x, t.z] };
  }
  return { cells: qt, area: +reachedArea.toFixed(1), targets: out };
}

// ------------------------------------------------------------------ in-page: camera occlusion sweep
function cameraSweepInPage(stand, target) {
  const { THREE, world, player, scenes } = window.yawmuk;
  const root = scenes.active.root;
  const rc = new THREE.Raycaster();
  const res = [];
  const visibleChain = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
  const isNpc = (o) => { for (let n = o; n; n = n.parent) if (n.userData?.npcId) return true; return false; };
  const blocks = (o) => {
    if (!o.isMesh || o.isSprite || !visibleChain(o) || isNpc(o)) return false;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.colorWrite === false || (m.transparent && m.opacity < 0.6) || m.visible === false) return false;
    return true;
  };
  for (let k = 0; k < 8; k++) {
    const yaw = (k / 8) * Math.PI * 2;
    player.teleport([stand[0], 0, stand[1]], yaw);
    const cam = world.camera.position.clone();
    const head = new THREE.Vector3(player.pos.x, 1.45, player.pos.z);
    const dir = head.clone().sub(cam); const dist = dir.length(); dir.normalize();
    rc.set(cam, dir); rc.far = dist - 0.3; rc.camera = world.camera;
    const hits = rc.intersectObject(root, true).filter((h) => blocks(h.object));
    res.push({ yaw: +yaw.toFixed(2), occluded: hits.length > 0, by: hits[0] ? (hits[0].object.name || hits[0].object.geometry?.type || 'mesh') : null, camDist: +dist.toFixed(2) });
  }
  // restore: face the hotspot
  player.teleport([stand[0], 0, stand[1]], Math.atan2(-(target[0] - stand[0]), -(target[1] - stand[1])));
  return res;
}

// ------------------------------------------------------------------ in-page: ruling card validation
function validateRulingCardInPage(r, lang) {
  const errs = [];
  const card = document.querySelector('.overlay:not(.leaving) .ruling-card');
  if (!card) return ['no .ruling-card'];
  const q = (s) => card.querySelector(s), qa = (s) => [...card.querySelectorAll(s)];
  const tr = (o) => (o && typeof o === 'object' ? o[lang] : o);
  if (card.dataset.ruling !== r.id) errs.push(`data-ruling=${card.dataset.ruling} expected ${r.id}`);
  if ((q('.rc-title')?.textContent || '').trim() !== (tr(r.title) || '').trim()) errs.push('title mismatch');
  if (!q(`.badge.verdict[data-verdict="${r.verdict}"]`)) errs.push(`verdict badge ${r.verdict} missing`);
  const st = q('.badge.status');
  if (!st) errs.push('status badge missing'); else if (st.classList.contains('ok')) errs.push('status badge claims scholar-reviewed');
  if (!q('.rc-question .question')) errs.push('question section missing');
  if (!q('.rc-summary .summary')) errs.push('summary section missing');
  const nQ = (r.quran || []).length, nH = (r.hadith || []).length;
  if (qa('.rc-quran figure.ayah').length !== nQ) errs.push(`quran blocks ${qa('.rc-quran figure.ayah').length}/${nQ}`);
  if (qa('.rc-hadith figure.hadith').length !== nH) errs.push(`hadith blocks ${qa('.rc-hadith figure.hadith').length}/${nH}`);
  for (const f of qa('figure.ayah, figure.hadith')) {
    if (!f.querySelector('blockquote')) errs.push('citation without text');
    if (!f.querySelector('a.src-link')) errs.push('citation without source link');
  }
  if (lang === 'en') {
    const want = (r.quran || []).filter((x) => x.translation_en).length + (r.hadith || []).filter((x) => x.translation_en).length;
    if (qa('.translation').length !== want) errs.push(`translations ${qa('.translation').length}/${want}`);
  } else if (qa('.translation').length) errs.push('English translation shown in Arabic UI');
  if (qa('.madhahib [role=tab]').length !== 4) errs.push('madhhab tabs != 4');
  const panels = qa('.madhahib .tabpanel');
  if (panels.length !== 4) errs.push('madhhab panels != 4');
  panels.forEach((p, i) => { if (!p.querySelector('p:not(.muted):not(.ref)')) errs.push(`madhhab panel ${i} empty`); });
  if (qa('.rc-contemporary .council').length !== (r.contemporary || []).length) errs.push(`contemporary ${qa('.rc-contemporary .council').length}/${(r.contemporary || []).length}`);
  const g = tr(r.practical_guidance) || [];
  if (qa('.rc-guidance li').length !== g.length) errs.push(`guidance ${qa('.rc-guidance li').length}/${g.length}`);
  const alt = tr(r.halal_alternatives) || [];
  if (qa('.rc-alternatives li').length !== alt.length) errs.push(`alternatives ${qa('.rc-alternatives li').length}/${alt.length}`);
  if (!q('.rc-scholar p')) errs.push('refer-to-scholar section missing');
  if (qa('.rc-foot p').length !== 2) errs.push('disclaimer footer missing');
  for (const a of qa('a')) if (!/^https?:\/\//.test(a.getAttribute('href') || '')) errs.push(`bad link ${a.getAttribute('href')}`);
  if (card.scrollWidth - card.clientWidth > 2) errs.push(`card overflows horizontally (${card.scrollWidth}>${card.clientWidth})`);
  if (document.documentElement.dir !== (lang === 'ar' ? 'rtl' : 'ltr')) errs.push(`dir=${document.documentElement.dir}`);
  return errs;
}

// ------------------------------------------------------------------ one configuration
async function runConfig(browser, baseUrl, cfg) {
  const t0 = Date.now();
  const log = (m) => console.log(`[${cfg.name}] ${m}`);
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  if (cfg.mobile) await page.setUserAgent(MOBILE_UA);
  await page.setViewport(cfg.viewport);
  const errors = [], warnings = [];
  page.on('console', (m) => {
    const txt = m.text();
    if (m.type() === 'error') {
      if (/fonts\.(googleapis|gstatic)\.com/.test(txt) || (/Failed to load resource/.test(txt) && /net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CONNECTION)/.test(txt))) warnings.push(`offline font: ${txt}`);
      else errors.push(txt);
    } else if (m.type() === 'warn' || m.type() === 'warning') warnings.push(txt);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url())) errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });

  const R = makeRunner(page, cfg, log);
  const { press, waitSel, waitFn, evalp, shot, check } = R;
  const perf = {}, reach = {}, camera = {}, rulingsChecked = [];
  let hotspotShot = 0;

  async function waitPlay(loc) {
    await waitFn((l) => window.yawmuk && window.yawmuk.mode === 'play' && window.yawmuk.scenes.active?.location === l, 60000, loc);
    await sleep(200);
  }

  async function startExploring() {
    await waitSel(`${OPEN} .loc-intro .btn.primary`, 60000);
    await press(`${OPEN} .loc-intro .btn.primary`);
  }

  async function onLocationEntered(loc, idx) {
    await waitFn((l) => window.yawmuk?.scenes.active?.location === l, 60000, loc);
    await waitSel(`${OPEN} .loc-intro`, 60000);
    await R.checkOverflow(`${loc} intro card`);
    if (idx === 0) await shot(`${loc}-intro-card`);
    await startExploring();
    await waitPlay(loc);
    const info = await evalp(() => {
      const a = window.yawmuk.scenes.active;
      let inst = 0, instTris = 0, meshes = 0, tris = 0;
      a.root.traverse((o) => {
        if (!o.isMesh) return; meshes++;
        const g = o.geometry; const t = g ? (g.index ? g.index.count : g.attributes.position?.count || 0) / 3 : 0;
        if (o.isInstancedMesh) { inst++; instTris += t * o.count; } else tris += t;
      });
      const ri = window.yawmuk.world.renderer.info;
      let pointLights = 0, shadowLights = 0;
      a.root.traverse((o) => { if (o.isPointLight || o.isSpotLight) pointLights++; if (o.isLight && o.castShadow) shadowLights++; });
      return { pointLights, shadowLights, placeholder: a.isPlaceholder, auto: a.hotspots.filter((h) => h.auto).map((h) => h.id), meshes, instanced: inst, trisDrawn: Math.round(tris + instTris), statsApi: window.yawmuk.stats(), drawCalls: ri.render.calls, frameTris: ri.render.triangles, geometries: ri.memory.geometries, textures: ri.memory.textures, colliders: a.colliders.length, occluders: a.occluders.length, lights: a.lights };
    });
    info.frameMs = await evalp(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 31) requestAnimationFrame(f); else res(+((ts.at(-1) - ts[0]) / 30).toFixed(1)); }; requestAnimationFrame(f); }));
    info.gpu = await evalp(() => { try { const gl = window.yawmuk.world.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch { return '?'; } });
    perf[loc] = info;
    check(!info.placeholder, `${loc}: placeholder scene loaded instead of the real one`);
    check(info.pointLights <= 3 && info.shadowLights === 0, `${loc}: ${info.pointLights} point/spot lights and ${info.shadowLights} shadow-casting scene lights (budget: <= 3, none casting shadows)`);
    check(!info.auto.length, `${loc}: auto-placed hotspots ${info.auto}`);
    reach[loc] = await evalp(reachabilityInPage);
    check(!reach[loc].error, `${loc}: ${reach[loc].error}`);
    for (const [id, t] of Object.entries(reach[loc].targets || {})) check(t.reachable, `${loc}: ${id} is NOT reachable on foot from spawn`);
    await shot(`${loc}-scene`);
  }

  /** Walk-teleport to a reachable spot inside the hotspot radius, facing it, then interact like a player. */
  async function goAndInteract(loc, id) {
    const t = reach[loc].targets[id];
    await evalp((stand, target) => {
      const y = Math.atan2(-(target[0] - stand[0]), -(target[1] - stand[1]));
      window.yawmuk.player.teleport([stand[0], 0, stand[1]], y);
    }, t.stand, t.target);
    await waitFn((h) => window.yawmuk.near === h && window.yawmuk.mode === 'play', 10000, id).catch(() => { throw new Fail(`${loc}: standing at ${t.stand} did not put "${id}" in range (near=${id})`); });
    if (HOTSPOT_SHOTS && id !== 'exit') {
      fs.mkdirSync(path.join(HOTSPOT_SHOTS, cfg.name), { recursive: true });
      await sleep(300);
      await page.screenshot({ path: path.join(HOTSPOT_SHOTS, cfg.name, `${String(++hotspotShot).padStart(2, '0')}-${loc}-${id}.jpg`), type: 'jpeg', quality: 60 });
    }
    if (CAMERA && id !== 'exit') {
      camera[`${loc}/${id}`] = await evalp(cameraSweepInPage, t.stand, t.target);
      await sleep(100);
    }
    if (cfg.mobile) {
      await press('.interact-btn.show');
    } else {
      await evalp(() => document.activeElement?.blur?.());
      await page.keyboard.press('KeyE');
    }
  }

  async function playChoices(sit, pickQuality, { shots = false, locName = '' } = {}) {
    await waitSel(`${OPEN} .dialogue .choices .choice`);
    if (shots) await shot(`${locName}-choices`);
    const want = sit.choices.find((c) => c.quality === pickQuality) || sit.choices.find((c) => c.quality !== 'best') || sit.choices[0];
    const idx = await evalp((label) => [...document.querySelectorAll('.overlay:not(.leaving) .dialogue .choices .choice span:last-child')].findIndex((s) => s.textContent.trim() === label.trim()), want.label[cfg.lang]);
    check(idx >= 0, `${sit.ruling_id}: choice "${want.id}" label not found among rendered choices`);
    const n = await evalp(() => document.querySelectorAll('.overlay:not(.leaving) .dialogue .choices .choice').length);
    check(n === sit.choices.length, `${sit.ruling_id}: rendered ${n} choices, script has ${sit.choices.length}`);
    await press(`${OPEN} .dialogue .choices .choice`, { index: Math.max(0, idx) });
    await waitSel(`${OPEN} .dialogue .consequence`);
    const pts = await evalp(() => document.querySelector('.overlay:not(.leaving) .dialogue .points')?.textContent || '');
    check(pts.includes(`+${want.points}`), `${sit.ruling_id}: points badge "${pts}" expected +${want.points}`);
    if (shots) await shot(`${locName}-consequence`);
    await press(`${OPEN} .dialogue .row.end .btn.primary`);
    return want;
  }

  async function rulingAndCheck(sit, { answerCorrect = true, shots = false, locName = '' } = {}) {
    const r = RULINGS[sit.ruling_id];
    await waitSel(`${OPEN} .ruling-modal .ruling-card`);
    await sleep(120);
    const errs = await evalp(validateRulingCardInPage, r, cfg.lang);
    errs.forEach((e) => check(false, `${sit.ruling_id} card: ${e}`));
    rulingsChecked.push(sit.ruling_id);
    await R.checkOverflow(`${sit.ruling_id} ruling card`);
    if (shots) {
      await shot(`${locName}-ruling-top`);
      // scroll to the madhhab section for a look at the RTL/LTR tabs/columns
      await evalp(() => { const m = document.querySelector('.overlay:not(.leaving) .ruling-card .rc-madhahib'); m?.scrollIntoView({ block: 'start' }); });
      await shot(`${locName}-ruling-madhahib`);
      if (cfg.mobile) {
        // tabs on narrow screens: activate the 3rd tab and check its panel shows
        await press(`${OPEN} .ruling-card .madhahib [role=tab]`, { index: 2 });
        const ok = await evalp(() => { const p = document.querySelectorAll('.overlay:not(.leaving) .ruling-card .tabpanel'); return p[2]?.classList.contains('active') && p[2].offsetHeight > 0 && p[0].offsetHeight === 0; });
        check(ok, `${sit.ruling_id}: madhhab tab 3 did not activate its panel on mobile`);
      }
      await evalp(() => { const m = document.querySelector('.overlay:not(.leaving) .ruling-modal'); m.scrollTop = m.scrollHeight; });
      await shot(`${locName}-ruling-bottom`);
    }
    await press(`${OPEN} .ruling-modal .sticky-actions .btn.primary`);
    const cq = sit.check_question;
    if (cq) {
      await waitSel(`${OPEN} .ruling-modal .check .choices .choice`);
      const correct = cq.options.findIndex((o) => o.correct);
      const pick = answerCorrect ? correct : cq.options.findIndex((o) => !o.correct);
      if (shots) await shot(`${locName}-check-question`);
      await press(`${OPEN} .ruling-modal .check .choices .choice`, { index: pick });
      await waitSel(`${OPEN} .ruling-modal .feedback.${answerCorrect ? 'ok' : 'bad'}`);
      const green = await evalp((i) => document.querySelectorAll('.overlay:not(.leaving) .ruling-modal .check .choice')[i]?.classList.contains('correct'), correct);
      check(green, `${sit.ruling_id}: correct check option not highlighted`);
      await press(`${OPEN} .ruling-modal .row.end .btn.primary`);
    }
    await waitSel(`${OPEN} .ruling-modal .row.end.wrap`);
    if (shots) await shot(`${locName}-done`);
  }

  async function playSituation(loc, sit, i) {
    const shots = i === 0;
    await goAndInteract(loc, sit.hotspot);
    // dialogue: click Next until the choices show
    await waitSel(`${OPEN} .dialogue`);
    let lines = 0;
    for (let guard = 0; guard < 40; guard++) {
      const state = await evalp(() => (document.querySelector('.overlay:not(.leaving) .dialogue .choices') ? 'choices' : document.querySelector('.overlay:not(.leaving) .dialogue .line') ? 'line' : 'wait'));
      if (state === 'choices') break;
      if (state === 'wait') { await sleep(50); continue; }
      if (shots && lines === 1) { await shot(`${loc}-dialogue`); await R.checkOverflow(`${loc} dialogue sheet`); }
      await press(`${OPEN} .dialogue .row.end .btn.primary`);
      lines++;
    }
    check(lines === (sit.setup ? 1 : 0) + sit.dialogue.length, `${sit.ruling_id}: showed ${lines} dialogue lines, expected ${(sit.setup ? 1 : 0) + sit.dialogue.length}`);
    if (cfg.retry) {
      // first a non-best choice and a wrong check answer, then "Try another choice" -> best + correct
      await playChoices(sit, 'wrong', { shots, locName: loc });
      await rulingAndCheck(sit, { answerCorrect: false, shots, locName: loc });
      await press(`${OPEN} .ruling-modal .row.end.wrap .btn.ghost`); // try another choice
      await playChoices(sit, 'best');
      await rulingAndCheck(sit, { answerCorrect: true });
    } else {
      await playChoices(sit, 'best', { shots, locName: loc });
      await rulingAndCheck(sit, { answerCorrect: true, shots, locName: loc });
    }
    await press(`${OPEN} .ruling-modal .row.end.wrap .btn.primary`); // done
    await waitPlay(loc);
    const done = await evalp((k) => !!window.yawmuk.progress().situations[k]?.done, sit.ruling_id);
    check(done, `${sit.ruling_id}: not marked done in progress`);
    const stored = await evalp((k) => { try { return !!JSON.parse(localStorage.getItem('yawmuk.progress.v1')).situations[k]?.done; } catch { return false; } }, sit.ruling_id);
    check(stored, `${sit.ruling_id}: not persisted to localStorage`);
  }

  async function revisitTest(loc, sit) {
    await goAndInteract(loc, sit.hotspot);
    await waitSel(`${OPEN} .modal.small .stack .btn`);
    await shot(`${loc}-revisit-menu`);
    await press(`${OPEN} .modal.small .stack .btn`, { index: 1 }); // review the ruling card
    await waitSel(`${OPEN} .ruling-modal .ruling-card`);
    const errs = await evalp(validateRulingCardInPage, RULINGS[sit.ruling_id], cfg.lang);
    errs.forEach((e) => check(false, `review ${sit.ruling_id}: ${e}`));
    await press(`${OPEN} .ruling-modal .sticky-actions .btn.primary`); // close
    await waitPlay(loc);
  }

  async function exitTo(loc, next) {
    await goAndInteract(loc, 'exit');
    await waitSel(`${OPEN} .loc-intro .row.end.wrap .btn.primary`);
    if (loc === 'home') await shot(`${loc}-outro`);
    await press(`${OPEN} .loc-intro .row.end.wrap .btn.primary`);
  }

  async function exitLockedTest(loc) {
    await goAndInteract(loc, 'exit');
    await waitFn(() => [...document.querySelectorAll('.toast')].length > 0, 5000).catch(() => {});
    const toast = await evalp(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '));
    check(/أكمل|Finish/.test(toast), `${loc}: exit not locked before finishing (toast: "${toast}")`);
    check(await evalp(() => window.yawmuk.mode === 'play'), `${loc}: locked exit changed mode`);
  }

  try {
    // ---------- start screen (fresh profile, no save)
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 90000 });
    await waitSel(`${OPEN} .start .lang-btn`, 60000);
    await press(`${OPEN} .start .lang-btn[lang="${cfg.lang}"]`);
    await waitFn((l) => document.documentElement.lang === l && document.documentElement.dir === (l === 'ar' ? 'rtl' : 'ltr'), 5000, cfg.lang);
    await sleep(600);
    await shot('start-screen');
    await R.checkOverflow('start screen');
    check(await evalp(() => document.querySelectorAll('.start .stack .btn').length === 1), 'fresh profile shows a Continue button');
    await press(`${OPEN} .start .stack .btn.primary`);
    await waitSel(`${OPEN} .intro .row.end .btn.primary`);
    await shot('intro-disclaimers');
    await R.checkOverflow('intro');
    check(await evalp(() => document.querySelectorAll('.intro .notice li').length >= 4), 'intro shows fewer than 4 disclaimers');
    await press(`${OPEN} .intro .row.end .btn.primary`);
    check(await evalp(() => document.body.classList.contains('touch')) === cfg.mobile, `touch class = ${!cfg.mobile} (expected ${cfg.mobile})`);

    for (let li = 0; li < LOCATIONS.length; li++) {
      const loc = LOCATIONS[li];
      const script = SCRIPTS[loc];
      await onLocationEntered(loc, li);
      if (li === 0) await exitLockedTest(loc);
      for (let i = 0; i < script.situations.length; i++) {
        await playSituation(loc, script.situations[i], i);
        log(`  ✓ ${script.situations[i].ruling_id}`);
      }
      if (li === 0) await revisitTest(loc, script.situations[0]);
      const hud = await evalp(() => document.querySelector('.hud-done')?.textContent);
      const doneSoFar = LOCATIONS.slice(0, li + 1).reduce((a, l) => a + SCRIPTS[l].situations.length, 0);
      check(hud === `${doneSoFar}/${TOTAL}`, `${loc}: HUD shows ${hud}, expected ${doneSoFar}/${TOTAL}`);
      if (li === 1 && SHOTS) await shot(`${loc}-hud-after`);
      if (li === 1 && cfg.retry) {
        // ---------- language switch from the menu, both ways
        await press('.hud-menu');
        await waitSel(`${OPEN} .menu .stack .btn`);
        await shot('menu');
        await press(`${OPEN} .menu .stack .btn`, { index: 1 });
        const d1 = await evalp(() => document.documentElement.dir);
        await shot('menu-after-lang-switch');
        await press(`${OPEN} .menu .stack .btn`, { index: 1 });
        const d2 = await evalp(() => document.documentElement.dir);
        check(d1 === (cfg.lang === 'ar' ? 'ltr' : 'rtl') && d2 === (cfg.lang === 'ar' ? 'rtl' : 'ltr'), `language switch dir ${d1} -> ${d2}`);
        await press(`${OPEN} .menu .stack .btn.primary`); // resume
        await waitPlay(loc);
      }
      await exitTo(loc, LOCATIONS[li + 1]);

      if (li === 0) {
        // ---------- resume after reload (localStorage)
        await waitFn(() => window.yawmuk?.scenes.active?.location === 'work', 60000);
        await waitSel(`${OPEN} .loc-intro`, 60000);
        await page.reload({ waitUntil: 'load' });
        await waitSel(`${OPEN} .start .stack .btn.primary`, 60000);
        const btns = await evalp(() => document.querySelectorAll('.start .stack .btn').length);
        check(btns === 2, 'after reload the start screen has no Continue button');
        check(await evalp((l) => document.documentElement.lang === l, cfg.lang), 'language preference not restored after reload');
        await shot('resume-start-screen');
        await press(`${OPEN} .start .stack .btn.primary`); // Continue
        await waitFn(() => window.yawmuk?.scenes.active?.location === 'work', 60000).catch(() => {});
        const resumedLoc = await evalp(() => window.yawmuk?.scenes.active?.location);
        check(resumedLoc === 'work', `resume went to ${resumedLoc}, expected work`);
        const doneAfter = await evalp(() => Object.values(window.yawmuk.progress().situations).filter((s) => s.done).length);
        check(doneAfter === SCRIPTS.home.situations.length, `resume restored ${doneAfter} done situations`);
        log('  ✓ resume from localStorage');
      }
    }

    // ---------- summary
    await waitSel(`${OPEN} .summary .big-num`, 60000);
    await sleep(400);
    const sum = await evalp(() => ({
      nums: [...document.querySelectorAll('.summary .big-num')].map((n) => n.textContent.trim()),
      topics: document.querySelectorAll('.summary .topics li').length,
      done: document.querySelectorAll('.summary .topics li.done').length,
      verdicts: document.querySelectorAll('.summary .topics .badge.verdict').length,
      maxText: document.querySelector('.summary .stat .muted')?.textContent || ''
    }));
    check(sum.nums[0] === String(MAX_SCORE), `summary score ${sum.nums[0]}, expected max ${MAX_SCORE}`);
    check(sum.maxText.includes(String(MAX_SCORE)), `summary max text "${sum.maxText}"`);
    check(sum.nums[1] === `${TOTAL}/${TOTAL}`, `summary completed ${sum.nums[1]}`);
    check(sum.nums[2] === String(TOTAL), `summary best choices ${sum.nums[2]}`);
    check(sum.nums[3] === String(TOTAL), `summary correct checks ${sum.nums[3]}`);
    check(sum.topics === TOTAL && sum.done === TOTAL && sum.verdicts === TOTAL, `summary topics ${sum.done}/${sum.topics} verdicts ${sum.verdicts}`);
    await R.checkOverflow('summary');
    const top = await evalp(() => { const s = document.querySelector('.overlay-screen:not(.leaving)'); s.scrollTop = 0; const r = document.querySelector('.summary h1').getBoundingClientRect(); return Math.round(r.top); });
    check(top >= 0, `summary title is cut off above the viewport (top=${top}px) and cannot be scrolled to`);
    await shot('summary-top');
    await evalp(() => { const s = document.querySelector('.overlay:not(.leaving) .overlay-screen, .overlay-screen'); if (s) s.scrollTop = s.scrollHeight; });
    await shot('summary-bottom');
    check(await evalp(() => JSON.parse(localStorage.getItem('yawmuk.progress.v1')).finished === true), 'finished flag not stored');
    await press(`${OPEN} .summary .row.center .btn.ghost`); // back to game
    await waitFn(() => window.yawmuk.mode === 'play', 10000);
  } catch (e) {
    R.failures.push(`ABORTED: ${e.message.split('\n')[0]}`);
    log(`  ✗ ABORTED: ${e.stack}`);
    try { await page.screenshot({ path: path.join(ROOT, `docs/phase-3/e2e-failure-${cfg.name}.jpg`), type: 'jpeg', quality: 60 }); } catch { /* */ }
  }
  errors.forEach((e) => R.failures.push(`console: ${e}`));
  const sceneWarn = warnings.filter((w) => /\[scene|\[content\]|auto-placed/.test(w));
  sceneWarn.forEach((w) => R.failures.push(`warning: ${w}`));
  await ctx.close();
  const secs = Math.round((Date.now() - t0) / 1000);
  log(`${R.failures.length ? 'FAIL' : 'PASS'} — ${rulingsChecked.length} ruling cards checked, ${R.failures.length} failure(s), ${secs}s`);
  return { config: cfg.name, pass: !R.failures.length, failures: R.failures, warnings, rulingsChecked: rulingsChecked.length, perf, reach, camera, seconds: secs };
}

// ------------------------------------------------------------------ main
const chrome = findChrome();
if (!chrome) { console.log('SKIP e2e: no Chrome/Chromium/Edge found (set CHROME_PATH)'); process.exit(0); }
let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; } catch { console.log('SKIP e2e: puppeteer-core is not installed (npm install)'); process.exit(0); }

if (args.build || !fs.existsSync(path.join(ROOT, 'dist/index.html'))) {
  console.log('building dist/ …');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}
const srv = await startServer(path.join(ROOT, 'dist'), 0);
console.log(`serving dist/ at ${srv.url} (static, no Vite) — browser: ${chrome}`);
const GL = process.env.E2E_GL || (process.platform === 'win32' ? 'd3d11' : 'default');
const GL_ARGS = GL === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : GL === 'default' ? ['--enable-gpu'] : [`--use-angle=${GL}`, '--enable-gpu'];
console.log(`WebGL backend: ${GL}`);
const browser = await puppeteer.launch({
  executablePath: chrome, headless: true,
  // GPU by default (D3D11 on Windows; headless SwiftShader renders these scenes at ~0.5 s/frame, which makes the
  // run take an hour). E2E_GL=swiftshader forces software rendering (CI machines without a GPU).
  args: [...GL_ARGS, '--ignore-gpu-blocklist', '--enable-webgl', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']
});
const results = [];
try {
  for (const cfg of CONFIGS) {
    results.push(await runConfig(browser, srv.url, cfg));
    fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
    fs.writeFileSync(RESULTS_FILE, JSON.stringify({ date: new Date().toISOString(), gl: GL, maxScore: MAX_SCORE, total: TOTAL, partial: true, results }, null, 2));
  }
} finally {
  await browser.close();
  await srv.close();
}
fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
fs.writeFileSync(RESULTS_FILE, JSON.stringify({ date: new Date().toISOString(), gl: GL, maxScore: MAX_SCORE, total: TOTAL, results }, null, 2));
console.log('\n=== e2e summary ===');
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.config.padEnd(11)} ${r.rulingsChecked} ruling cards, ${r.failures.length} failure(s), ${r.seconds}s`);
const failed = results.filter((r) => !r.pass);
for (const r of failed) for (const f of r.failures) console.log(`  [${r.config}] ${f}`);
console.log(`details: ${path.relative(ROOT, RESULTS_FILE)}`);
process.exit(failed.length ? 1 : 0);
