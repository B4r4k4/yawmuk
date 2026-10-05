// Adds `newcomer_explainer` and `common_ground` to every ruling in content/rulings/*.json
// (TEAM_BRIEF update 2026-10-05). Idempotent: the two fields are (re)set from
// tools/audit/common_ground_data.json on every run; no other field is touched.
// Bible texts come only from the `verses` table of the data file (KJV + Smith & Van Dyck,
// fetched and cross-checked — see docs/research/common_ground.md).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const dir = path.join(root, 'content', 'rulings');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'common_ground_data.json'), 'utf8'));

const nonEmpty = (o, where) => {
  for (const k of ['ar', 'en']) {
    if (typeof o?.[k] !== 'string' || !o[k].trim()) throw new Error(`${where}.${k} is empty`);
  }
  return { ar: o.ar, en: o.en };
};

const seen = new Set();
let changed = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const file = path.join(dir, f);
  const before = fs.readFileSync(file, 'utf8');
  const arr = JSON.parse(before);
  for (const r of arr) {
    const src = data.rulings[r.id];
    if (!src) throw new Error(`no common-ground data for ${r.id}`);
    seen.add(r.id);
    r.newcomer_explainer = nonEmpty(src.newcomer_explainer, `${r.id}.newcomer_explainer`);
    r.common_ground = {
      summary: nonEmpty(src.common_ground.summary, `${r.id}.summary`),
      bible: src.common_ground.bible.map((ref) => {
        const v = data.verses[ref];
        if (!v) throw new Error(`${r.id}: verse ${ref} is not in the verified verses table`);
        return {
          ref_en: v.ref_en,
          ref_ar: v.ref_ar,
          text_en: v.text_en,
          text_ar: v.text_ar,
          source_url: v.source_url,
          source_url_ar: v.source_url_ar
        };
      }),
      differences: nonEmpty(src.common_ground.differences, `${r.id}.differences`)
    };
  }
  const after = JSON.stringify(arr, null, 2) + '\n';
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
  JSON.parse(fs.readFileSync(file, 'utf8')); // validity check
}
const missing = Object.keys(data.rulings).filter((id) => !seen.has(id));
if (missing.length) throw new Error('data for unknown ruling ids: ' + missing.join(', '));
console.log(`rulings updated: ${seen.size}; files written: ${changed}`);
