// Content loader: rulings + scripts from /content via import.meta.glob (eager, as raw text so a
// malformed JSON file can never break the build — it is reported and skipped instead).
import { LOCATIONS, LOCATION_TITLES, VERDICTS, QUALITY } from './config.js';
import { applyUiStrings } from './i18n.js';
import { fixtureScripts, fixtureRulings } from './__fixtures__/fixtures.js';

const rawRulings = import.meta.glob('../../content/rulings/*.json', { eager: true, query: '?raw', import: 'default' });
const rawScripts = import.meta.glob('../../content/script/*.json', { eager: true, query: '?raw', import: 'default' });

export const contentIssues = []; // human-readable problems, shown in console (and ?debug=1 overlay)

function issue(msg) { contentIssues.push(msg); console.warn('[content]', msg); }

function parse(path, raw) {
  try { return JSON.parse(raw.replace(/^﻿/, '')); } catch (e) { issue(`${path}: invalid JSON (${e.message})`); return null; }
}

const params = new URLSearchParams(location.search);
const forceFixtures = params.get('fixtures') === '1';

// ---------- rulings ----------
const rulings = {};
if (!forceFixtures) {
  for (const [path, raw] of Object.entries(rawRulings)) {
    const data = parse(path, raw);
    if (!data) continue;
    const list = Array.isArray(data) ? data : Array.isArray(data.rulings) ? data.rulings : [data];
    for (const r of list) {
      if (!r || typeof r.id !== 'string') { issue(`${path}: ruling without string "id" skipped`); continue; }
      if (rulings[r.id]) issue(`${path}: duplicate ruling id ${r.id} (later one wins)`);
      rulings[r.id] = r;
    }
  }
}

// ---------- UI strings (content/script/ui_strings.json — optional) ----------
export let uiStrings = null;
for (const [path, raw] of Object.entries(rawScripts)) {
  if (!path.endsWith("/ui_strings.json")) continue;
  const ui = parse(path, raw);
  if (!ui) continue;
  uiStrings = applyUiStrings(ui);
  for (const [k, v] of Object.entries(ui.ruling_card?.verdicts || {})) if (VERDICTS[k] && v) Object.assign(VERDICTS[k], v);
  for (const k of Object.keys(QUALITY)) if (ui.result?.[k]) Object.assign(QUALITY[k], ui.result[k]);
  for (const [k, v] of Object.entries(ui.locations || {})) if (LOCATION_TITLES[k] && v) Object.assign(LOCATION_TITLES[k], v);
}

// ---------- scripts ----------
function normalizeScript(s, loc, path) {
  const out = { ...s };
  out.location = loc;
  out.title = s.title || LOCATION_TITLES[loc];
  out.situations = (Array.isArray(s.situations) ? s.situations : []).filter((sit, i) => {
    if (!sit || typeof sit !== 'object') { issue(`${path}: situation #${i} is not an object`); return false; }
    if (!sit.ruling_id) issue(`${path}: situation #${i} has no ruling_id`);
    if (!sit.hotspot) { sit.hotspot = `auto_${i + 1}`; issue(`${path}: situation #${i} has no hotspot; using ${sit.hotspot}`); }
    if (!Array.isArray(sit.dialogue)) sit.dialogue = [];
    if (!Array.isArray(sit.choices)) sit.choices = [];
    sit.choices.forEach((c, j) => { if (!c.id) c.id = String.fromCharCode(97 + j); if (typeof c.points !== 'number') c.points = Number(c.points) || 0; });
    sit.key = sit.ruling_id || `${loc}#${i}`; // progress key
    return true;
  });
  if (out.next_location !== null && out.next_location !== undefined && out.next_location !== 'end' && !LOCATIONS.includes(out.next_location)) {
    issue(`${path}: unknown next_location "${out.next_location}"`);
  }
  return out;
}

const scripts = {};
if (!forceFixtures) {
  for (const [path, raw] of Object.entries(rawScripts)) {
    if (path.endsWith("/ui_strings.json")) continue;
    const data = parse(path, raw);
    if (!data) continue;
    const loc = data.location || path.split('/').pop().replace(/\.json$/, '');
    if (!LOCATIONS.includes(loc)) { issue(`${path}: unknown location "${loc}"`); continue; }
    scripts[loc] = normalizeScript(data, loc, path);
  }
}
for (const loc of LOCATIONS) {
  if (!scripts[loc]) scripts[loc] = normalizeScript(structuredClone(fixtureScripts[loc]), loc, `fixture:${loc}`);
}

export const usingFixtures = {
  scripts: LOCATIONS.filter((l) => scripts[l]._fixture),
  rulingsReal: Object.keys(rulings).length
};

/** Script for a location (real, or fixture when the real one is missing). Never null for known locations. */
export function getScript(loc) { return scripts[loc] || null; }

/** Ruling by id: real → fixture → null (caller renders a "content pending" card for null). */
export function getRuling(id) {
  if (!id) return null;
  return rulings[id] || (Object.keys(rulings).length === 0 || forceFixtures ? fixtureRulings[id] : null) || null;
}

/** Next location after `loc` (script.next_location, else catalog order). null = end of day. */
export function nextLocation(loc) {
  const s = scripts[loc];
  if (s && s.next_location === null) return null;
  if (s && (s.next_location === 'end')) return null;
  if (s && LOCATIONS.includes(s.next_location)) return s.next_location;
  const i = LOCATIONS.indexOf(loc);
  return i >= 0 && i < LOCATIONS.length - 1 ? LOCATIONS[i + 1] : null;
}

/** All situations across all locations, in play order. */
export function allSituations() {
  return LOCATIONS.flatMap((loc) => (scripts[loc]?.situations || []).map((s) => ({ ...s, location: loc })));
}

if (usingFixtures.scripts.length) console.info('[content] using fixture scripts for:', usingFixtures.scripts.join(', '));
