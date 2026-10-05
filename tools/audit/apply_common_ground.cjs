// Sets `newcomer_explainer` and `common_ground` {summary, differences} on every ruling in content/rulings/*.json
// from tools/audit/common_ground_data.json. Idempotent; no other field is touched.
// Project-owner decision 2026-10-06: NO Bible/Torah/Gospel text or reference. There is no `bible` field; any
// `bible` key in the data, or any scriptural reference in the written texts or in any other ruling field
// (checked with scripture_guard.cjs, Qur'an/hadith excluded), aborts the run before anything is written.
const fs = require('fs');
const path = require('path');
const { findScripture, scanRuling } = require('./scripture_guard.cjs');

const root = path.join(__dirname, '..', '..');
const dir = path.join(root, 'content', 'rulings');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'common_ground_data.json'), 'utf8'));
if (data.verses) throw new Error('common_ground_data.json must not contain a verses table (decision 2026-10-06)');

const clean = (o, where) => {
  for (const k of ['ar', 'en']) {
    if (typeof o?.[k] !== 'string' || !o[k].trim()) throw new Error(`${where}.${k} is empty`);
    const hit = findScripture(o[k]);
    if (hit) throw new Error(`${where}.${k} contains a scriptural reference («${hit}») — not allowed (decision 2026-10-06)`);
  }
  return { ar: o.ar, en: o.en };
};

const seen = new Set();
const out = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const file = path.join(dir, f);
  const before = fs.readFileSync(file, 'utf8');
  const arr = JSON.parse(before);
  for (const r of arr) {
    const src = data.rulings[r.id];
    if (!src) throw new Error(`no common-ground data for ${r.id}`);
    if (src.common_ground && 'bible' in src.common_ground) throw new Error(`${r.id}: data still has a bible field`);
    seen.add(r.id);
    r.newcomer_explainer = clean(src.newcomer_explainer, `${r.id}.newcomer_explainer`);
    r.common_ground = {
      summary: clean(src.common_ground.summary, `${r.id}.summary`),
      differences: clean(src.common_ground.differences, `${r.id}.differences`),
    };
    const hits = scanRuling(r);
    if (hits.length) throw new Error(`${r.id}: scriptural reference in ${hits.map((h) => `${h.path} («${h.match}»)`).join(', ')}`);
  }
  out.push([file, before, JSON.stringify(arr, null, 2) + '\n']);
}
const missing = Object.keys(data.rulings).filter((id) => !seen.has(id));
if (missing.length) throw new Error('data for unknown ruling ids: ' + missing.join(', '));
let changed = 0;
for (const [file, before, after] of out) {
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
  JSON.parse(fs.readFileSync(file, 'utf8')); // validity check
}
console.log(`rulings updated: ${seen.size}; files written: ${changed}`);
