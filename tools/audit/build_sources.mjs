#!/usr/bin/env node
// Builds content/sources.json (unified source registry) from content/rulings/*.json.
// Inputs: verify.mjs results (run inline via --json), tools/audit/.cache/links.json (from links.mjs --json),
//         tools/audit/manual_verifications.json, and the MANUAL_CONTEMPORARY list below (sources the auditor read directly).
// Run:   node tools/audit/links.mjs --json > tools/audit/.cache/links.json ; node tools/audit/build_sources.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIR = path.join(ROOT, 'content', 'rulings');
const CHECKED_AT = '2026-10-05';

let verify = [];
try { verify = JSON.parse(execFileSync(process.execPath, [path.join(HERE, 'verify.mjs'), '--json'], { encoding: 'utf8', maxBuffer: 1 << 26 })); }
catch (e) { verify = JSON.parse(e.stdout || '[]'); }
const links = fs.existsSync(path.join(HERE, '.cache', 'links.json')) ? JSON.parse(fs.readFileSync(path.join(HERE, '.cache', 'links.json'), 'utf8')) : [];
const linkStatus = u => links.find(l => l.url === u)?.level;

// Contemporary sources the auditor opened and read directly on 2026-10-05 (match on decision_ref/body substring).
const MANUAL_CONTEMPORARY = [
  { m: /127/, b: /مجمع الفقه الإسلامي الدولي/, how: 'Auditor read the official IIFA page (ar/2114, en/32854): resolution 127 on competition cards, Doha Jan 2003; text matches. Arabic page numbers it (14/1), English page (1/14).' },
  { m: /210/, b: /مجمع الفقه/, how: 'Auditor read iifa-aifi.org/en/33099: Resolution 210 (6/22), Kuwait, 22-25 March 2015; wine-food ban, solvent-alcohol permission and gelatin deferral match.' },
  { m: /هيوستن|2014/, b: /AMJA/, how: 'Auditor read the AMJA Resident Fatwa Committee resolution (Houston, 15-17 Sep 2014); company tiers match (Mubarak Mortgage and Neeyah added).' },
  { m: /المؤتمر السنوي التاسع/, b: /AMJA/, how: 'Auditor extracted the PDF text: 9th annual AMJA conference on foods/medicines; beef/lamb ban, poultry concession, gelatin and alcohol clauses match.' },
  { m: /22801/, b: /AMJA/, how: 'Auditor read amjaonline.org fatwa 22801 (Dr. Salah Al-Sawy, 6 Aug 2007); content matches.' },
  { m: /78565/, b: /AMJA/, how: 'Auditor read amjaonline.org fatwa 78565 (Dr. Main Khalid Al-Qudah, 14 Apr 2009); content matches.' },
];

const reg = new Map();
const add = (id, obj, rulingId) => {
  if (!reg.has(id)) reg.set(id, { id, ...obj, used_in: [], checked_at: CHECKED_AT });
  const e = reg.get(id);
  if (!e.used_in.includes(rulingId)) e.used_in.push(rulingId);
};
const slug = s => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60);

for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
  for (const r of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) {
    for (const q of r.quran || []) {
      const k = `${q.surah}:${q.ayah}`;
      const res = verify.filter(v => v.kind === 'quran-text' && v.ref === k);
      const ok = res.length && res.every(v => v.level === 'PASS');
      add(`quran:${k}`, {
        type: 'quran', citation: `القرآن الكريم، سورة ${q.surah_name_ar} (${q.surah})، الآية ${q.ayah} — رسم عثماني؛ الترجمة: Sahih International`,
        url: `https://quran.com/${q.surah}/${q.ayah}`, verified: !!ok,
        verified_how: ok ? `verify.mjs: text_ar re-fetched from api.quran.com v4 (text_uthmani) and api.alquran.cloud (Tanzil quran-uthmani) and matched (${res[0].msg}); translation_en matched Sahih International (quran.com resource 20).` : 'verify.mjs FAILED or not run',
      }, r.id);
    }
    for (const h of r.hadith || []) {
      const ref = `${h.collection} ${h.number}`;
      const res = verify.filter(v => v.ruling === r.id && v.ref === ref && /^hadith/.test(v.kind));
      const ok = res.length && res.every(v => v.level === 'PASS');
      const how = res.map(v => v.msg).join(' | ');
      add(`hadith:${slug(h.collection)}:${String(h.number).match(/[\d/]+/)?.[0] || slug(String(h.number))}`, {
        type: 'hadith', citation: `${h.collection}، رقم ${h.number} — عن ${h.narrator}؛ الدرجة: ${h.grade} (${h.grader})`,
        url: String(h.source_url).split(/\s*;\s*/)[0], verified: !!ok,
        verified_how: ok ? `verify.mjs: ${how}. Text source: fawazahmed0/hadith-api (same Arabic text as sunnah.com, which blocks automated access with 403).` : `NOT verified: ${how}`,
      }, r.id);
    }
    for (const [m, v] of Object.entries(r.madhahib || {})) {
      add(`madhhab:${m}:${r.id}`, {
        type: 'madhhab', citation: `${m} — ${v.reference}`,
        url: (v.reference.match(/https?:\/\/[^\s;,()«»"؛،]+/) || [''])[0], verified: false,
        verified_how: 'Attribution reviewed by the auditor for consistency with the well-known position of the school (and the Kuwaiti Fiqh Encyclopedia where cited); NOT matched against a printed edition page by page. Requires a human scholar.',
      }, r.id);
    }
    for (const c of r.contemporary || []) {
      const man = MANUAL_CONTEMPORARY.find(x => x.m.test(c.decision_ref) && x.b.test(c.body));
      const urls = String(c.source_url || '').split(/\s*;\s*/).filter(Boolean);
      const st = urls.map(linkStatus);
      add(`contemporary:${slug(c.body).slice(0, 30)}:${slug(c.decision_ref).slice(0, 40)}`, {
        type: 'contemporary', citation: `${c.body} — ${c.decision_ref}`, url: urls[0] || '',
        verified: !!man,
        verified_how: man ? man.how : `Not read in full by the auditor; summary taken from the researcher. Link check: ${st.map((s, i) => `${urls[i]} → ${s || 'unchecked'}`).join('; ') || 'no url'}.`,
      }, r.id);
    }
  }
}
// manual non-six-book hadith records (keep their "how")
const manual = JSON.parse(fs.readFileSync(path.join(HERE, 'manual_verifications.json'), 'utf8'));
for (const e of reg.values()) if (e.type === 'hadith' && e.verified) {
  const m = manual.find(x => e.used_in.includes(x.ruling) && e.citation.includes(x.citation.split(' ')[0]));
  if (m) e.verified_how = `Manual (auditor): ${m.verified_how}`;
}
// Christian-practice facts mentioned in common_ground (type 'other'). No scriptural sources exist in the project (decision 2026-10-06).
const CHRISTIAN_FACTS = [
  { id: 'other:ccc-2413', test: /التعليم الكاثوليكي|Catholic teaching/, citation: 'Catechism of the Catholic Church §2413 (games of chance / wagers)', url: 'https://www.vatican.va/archive/ENG0015/__P8D.HTM',
    how: 'Auditor: the general statement in the ruling (games of chance are not unjust in themselves unless they deprive people of what they need) matches the well-known text of CCC 2413 (a catechism, not scripture); researcher confirmed via web search. Not re-fetched in this audit.' },
  { id: 'other:umc-gambling', test: /الميثودية|Methodist/, citation: 'United Methodist Church — Social Principles / Book of Resolutions: "Gambling is a menace to society…"', url: 'https://www.umc.org/en/content/ask-the-umc-what-is-the-united-methodist-position-on-gambling',
    how: 'Researcher confirmed via web search (umc.org); auditor did not re-fetch. Phrase is the standard Social Principles wording.' },
  { id: 'other:billy-graham-rule', test: /بيلي غراهام|Billy Graham/, citation: '"Billy Graham rule" (Modesto Manifesto, 1948)', url: 'https://www.christianhistoryinstitute.org/',
    how: 'Researcher confirmed via web search; general historical fact, not re-fetched by the auditor.' },
];
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')))
  for (const r of JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) {
    const t = JSON.stringify(r.common_ground || {});
    for (const c of CHRISTIAN_FACTS) if (c.test.test(t))
      add(c.id, { type: 'other', citation: c.citation, url: c.url, verified: false, verified_how: c.how }, r.id);
  }
const out = [...reg.values()];
fs.writeFileSync(path.join(ROOT, 'content', 'sources.json'), JSON.stringify(out, null, 2) + '\n');
const by = t => out.filter(x => x.type === t);
console.log(`sources: ${out.length}`, ['quran', 'hadith', 'madhhab', 'contemporary', 'other'].map(t => `${t} ${by(t).length} (verified ${by(t).filter(x => x.verified).length})`).join(' | '));
