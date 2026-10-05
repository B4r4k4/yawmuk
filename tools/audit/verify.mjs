#!/usr/bin/env node
// «يومك» — Automated verification of Qur'an, hadith and Bible (KJV + Van Dyck) texts in content/rulings/*.json
// (Bible checks: see checkBible() below — common_ground.bible[] vs bible-api.com / api.getbible.net kjv + arabicsv.)
//
// Usage:   node tools/audit/verify.mjs [--json] [--no-cache] [--quiet]
// Exit:    0 = all checks passed, 1 = at least one FAIL, 2 = network/setup error
//
// Qur'an:  every quran[] entry is re-fetched from api.quran.com (uthmani + Sahih International, id 20)
//          and from api.alquran.cloud (Tanzil quran-uthmani). PASS if text_ar equals quran.com after
//          removing purely orthographic Qur'anic annotation marks (tatweel, U+06D6–U+06ED, e.g. small
//          low meem / waqf signs) OR equals Tanzil exactly. Any difference in a letter or haraka = FAIL.
//          translation_en is compared to Sahih International (punctuation/footnote-insensitive) = FAIL if different.
// Hadith:  six books are checked against fawazahmed0/hadith-api (jsDelivr; same Arabic text as sunnah.com).
//          - the number must exist in the stated book (Muslim uses the Fuad Abd al-Baqi number)
//          - text_ar (split on "…"/"...") must be found inside that hadith's text. Two levels:
//            DIACRITIZED (exact incl. harakat) and SKELETON (letters only). Either miss = FAIL
//            (the message tells which level failed).
//          - if the grade/grader string cites al-Albani, his grade in hadith-api must appear in it (FAIL otherwise)
//          - Bukhari/Muslim entries must be graded صحيح
//          - sunnah.com source_url must point to the same book/number
//          Hadiths outside the six books cannot be checked automatically: they PASS only if listed in
//          tools/audit/manual_verifications.json with how they were verified by hand; otherwise FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const RULINGS_DIR = process.env.YAWMAK_RULINGS_DIR || path.join(ROOT, 'content', 'rulings');
const CACHE_DIR = path.join(HERE, '.cache');
const MANUAL = path.join(HERE, 'manual_verifications.json');
const args = new Set(process.argv.slice(2));
const USE_CACHE = !args.has('--no-cache');
const QUIET = args.has('--quiet');

const BOOKS = {
  'صحيح البخاري': 'bukhari', 'صحيح مسلم': 'muslim', 'سنن أبي داود': 'abudawud',
  'جامع الترمذي': 'tirmidhi', 'سنن الترمذي': 'tirmidhi', 'سنن النسائي': 'nasai', 'سنن ابن ماجه': 'ibnmajah',
};
const SUNNAH_SLUG = { bukhari: 'bukhari', muslim: 'muslim', abudawud: 'abudawud', tirmidhi: 'tirmidhi', nasai: 'nasai', ibnmajah: 'ibnmajah' };

// ---------- helpers ----------
async function fetchText(url, tries = 6) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      if (url.includes('bible-api.com')) await new Promise(res => setTimeout(res, 2500)); // bible-api.com rate-limits (HTTP 429)
      const r = await fetch(url, { headers: { 'User-Agent': 'yawmak-audit/1.0' } });
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} for ${url}`), { status: r.status });
      return await r.text();
    } catch (e) { last = e; await new Promise(res => setTimeout(res, (e.status === 429 ? 8000 : 800) * (i + 1))); }
  }
  throw last;
}
async function cachedJSON(key, url) {
  const f = path.join(CACHE_DIR, key.replace(/[^a-z0-9._-]/gi, '_'));
  if (USE_CACHE && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const txt = await fetchText(url);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(f, txt);
  return JSON.parse(txt);
}

const HARAKAT = /[ً-ٰٟۖ-ۭ࣓-ࣿ]/g;
const QURAN_MARKS = /[ـۖ-ۜ۞ۢۥۦ۩۪-ۭ]/g; // tatweel, waqf signs, small meem/waw/yeh, sajda/hizb marks
const PUNCT = /[‌-‏‪-‮؟،؛۔"'«»“”‘’().,:;!?\-–—\[\]{} *_]/g;

function nfc(s) { return (s || '').normalize('NFC'); }
function normQuranOrtho(s) { return nfc(s).replace(QURAN_MARKS, '').replace(/\s+/g, ' ').trim(); }
function normDiacritized(s) {
  return nfc(s).replace(/ـ/g, '').replace(PUNCT, ' ').replace(/\s+/g, ' ').trim();
}
function normSkeleton(s) {
  return nfc(s).replace(HARAKAT, '').replace(/ـ/g, '').replace(PUNCT, ' ')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/صلى الله عليه وسلم|صلي الله عليه وسلم|ﷺ/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function normEn(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function segments(text) {
  return nfc(text).split(/\.\.\.|…|\s\.\s\.\s\./).map(s => s.trim()).filter(s => normSkeleton(s).length >= 6);
}
function firstDiff(a, b) {
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return { at: i, ours: a.slice(Math.max(0, i - 8), i + 12), theirs: b.slice(Math.max(0, i - 8), i + 12) };
}
const ALBANI_MAP = {
  'sahih': ['صحيح'], 'hasan': ['حسن'], 'hasan sahih': ['حسن صحيح'], 'daif': ['ضعيف'],
  'sahih lighairihi': ['صحيح لغيره', 'صحيح بشواهده', 'صحيح'], 'hasan lighairihi': ['حسن لغيره'],
  'daif jiddan': ['ضعيف جدا', 'ضعيف جداً'], 'munkar': ['منكر'], 'mawdu': ['موضوع'],
  'sahih in chain': ['صحيح الإسناد', 'صحيح'], 'hasan in chain': ['حسن الإسناد', 'حسن'],
};

// ---------- load ----------
const results = []; // {level: PASS|WARN|FAIL, kind, ruling, ref, msg}
const add = (level, kind, ruling, ref, msg) => results.push({ level, kind, ruling, ref, msg });

const files = fs.readdirSync(RULINGS_DIR).filter(f => f.endsWith('.json')).sort();
const rulings = [];
for (const f of files) {
  let arr;
  try { arr = JSON.parse(fs.readFileSync(path.join(RULINGS_DIR, f), 'utf8')); }
  catch (e) { add('FAIL', 'json', f, '-', `invalid JSON: ${e.message}`); continue; }
  for (const r of arr) rulings.push({ file: f, r });
}
const manual = fs.existsSync(MANUAL) ? JSON.parse(fs.readFileSync(MANUAL, 'utf8')) : [];

// ---------- Qur'an ----------
async function checkQuran() {
  const keys = new Map();
  for (const { r } of rulings) for (const q of r.quran || []) {
    const k = `${q.surah}:${q.ayah}`;
    if (!keys.has(k)) keys.set(k, []);
    keys.get(k).push({ id: r.id, q });
  }
  for (const [k, uses] of keys) {
    let qc, tz;
    try {
      qc = await cachedJSON(`qc_${k}.json`, `https://api.quran.com/api/v4/verses/by_key/${k}?translations=20&fields=text_uthmani`);
      tz = await cachedJSON(`tz_${k}.json`, `https://api.alquran.cloud/v1/ayah/${k}/quran-uthmani`);
    } catch (e) { for (const u of uses) add('FAIL', 'quran-net', u.id, k, `could not fetch: ${e.message}`); continue; }
    const qcText = qc.verse?.text_uthmani || '';
    const tzText = tz.data?.text || '';
    const tzSurahName = tz.data?.surah?.name || '';
    const sahih = qc.verse?.translations?.[0]?.text || '';
    for (const { id, q } of uses) {
      const ours = nfc(q.text_ar);
      if (!ours) { add('FAIL', 'quran-text', id, k, 'text_ar empty'); continue; }
      const okQc = normQuranOrtho(ours) === normQuranOrtho(qcText);
      const okTz = ours === nfc(tzText).trim() || normQuranOrtho(ours) === normQuranOrtho(tzText);
      if (okQc || okTz) add('PASS', 'quran-text', id, k, okQc ? 'matches quran.com (orthographic marks normalised)' : 'matches Tanzil quran-uthmani');
      else {
        const d = firstDiff(normQuranOrtho(ours), normQuranOrtho(qcText));
        add('FAIL', 'quran-text', id, k, `text differs from quran.com at char ${d.at}: ours «${d.ours}» vs «${d.theirs}»`);
      }
      if (q.source_url !== `https://quran.com/${q.surah}/${q.ayah}` && !String(q.source_url || '').startsWith(`https://quran.com/${q.surah}/${q.ayah}`))
        add('FAIL', 'quran-url', id, k, `source_url ${q.source_url} does not point to ${k}`);
      if (q.surah_name_ar && normSkeleton(tzSurahName).replace(/^سورة\s*/, '') !== normSkeleton(q.surah_name_ar).replace(/^سورة\s*/, ''))
        add('FAIL', 'quran-surah-name', id, k, `surah_name_ar «${q.surah_name_ar}» vs «${tzSurahName}»`);
      if (q.translation_en) {
        if (normEn(q.translation_en) !== normEn(sahih))
          add('FAIL', 'quran-translation', id, k, `translation_en differs from Sahih International:\n      ours:   ${q.translation_en}\n      sahih:  ${sahih.replace(/<sup[^>]*>.*?<\/sup>/g, '')}`);
        else add('PASS', 'quran-translation', id, k, 'Sahih International');
      } else add('WARN', 'quran-translation', id, k, 'translation_en empty');
    }
  }
}

// ---------- Hadith ----------
const editions = {};
async function edition(book) {
  if (!editions[book]) {
    const ara = await cachedJSON(`ara-${book}.json`, `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${book}.min.json`);
    editions[book] = ara.hadiths;
  }
  return editions[book];
}
function parseNumber(n) { const m = String(n || '').match(/\d+/); return m ? Number(m[0]) : NaN; }

async function checkHadith() {
  for (const { r } of rulings) for (const h of r.hadith || []) {
    const ref = `${h.collection} ${h.number}`;
    const book = BOOKS[(h.collection || '').trim()];
    const text = h.text_ar || '';
    if (!text.trim()) { add('WARN', 'hadith-text', r.id, ref, 'text_ar empty (allowed only if explained in notes_for_reviewer)'); continue; }
    if (!book) {
      const m = manual.find(x => x.ruling === r.id && normSkeleton(text).includes(normSkeleton(x.text_fragment)));
      if (m) add('PASS', 'hadith-manual', r.id, ref, `outside six books — manually verified: ${m.verified_how}`);
      else add('FAIL', 'hadith-manual', r.id, ref, 'outside six books and not in manual_verifications.json');
      continue;
    }
    let hs;
    try { hs = await edition(book); } catch (e) { add('FAIL', 'hadith-net', r.id, ref, e.message); continue; }
    const num = parseNumber(h.number);
    const cands = book === 'muslim'
      ? hs.filter(x => Math.floor(parseFloat(x.arabicnumber)) === num)
      : hs.filter(x => Number(x.hadithnumber) === num);
    if (!cands.length) { add('FAIL', 'hadith-number', r.id, ref, `number ${num} not found in ${book}`); continue; }
    const segs = segments(text);
    let best = null;
    for (const c of cands) {
      const skel = normSkeleton(c.text), dia = normDiacritized(c.text);
      const skelOk = segs.every(s => skel.includes(normSkeleton(s)));
      const diaOk = segs.every(s => dia.includes(normDiacritized(s)));
      if (skelOk) { best = { c, diaOk }; if (diaOk) break; }
    }
    if (!best) {
      const missing = segs.find(s => !cands.some(c => normSkeleton(c.text).includes(normSkeleton(s))));
      add('FAIL', 'hadith-text', r.id, ref, `text not found in ${book} #${num}: «${(missing || '').slice(0, 80)}»`);
      continue;
    }
    add(best.diaOk ? 'PASS' : 'FAIL', 'hadith-text', r.id, ref,
      best.diaOk ? `matches ${book} #${best.c.arabicnumber ?? best.c.hadithnumber} (diacritized)` : `letters match ${book} #${num} but harakat differ`);
    // grade checks
    const gradeStr = `${h.grade || ''} ${h.grader || ''}`;
    if ((book === 'bukhari' || book === 'muslim') && !/صحيح/.test(h.grade || ''))
      add('FAIL', 'hadith-grade', r.id, ref, `a hadith in ${book} graded «${h.grade}»`);
    const alb = (best.c.grades || []).find(g => /albani/i.test(g.name));
    if (/الألباني/.test(gradeStr) && alb) {
      // only the grade attributed to al-Albani for THIS number is checked
      const want = ALBANI_MAP[alb.grade.toLowerCase().replace(/\bhadith\b/g, '').replace(/\s+/g, ' ').trim()] || [];
      const ok = want.some(w => gradeStr.includes(w));
      add(ok ? 'PASS' : 'FAIL', 'hadith-grade', r.id, ref, `al-Albani (hadith-api): ${alb.grade}; file: «${h.grade}» / «${(h.grader || '').slice(0, 120)}»`);
    } else if (best.c.grades?.length) {
      add('PASS', 'hadith-grade-info', r.id, ref, 'api grades: ' + best.c.grades.map(g => `${g.name}=${g.grade}`).join('; '));
    }
    // url consistency
    const urls = String(h.source_url || '').split(/\s*;\s*/).filter(Boolean);
    const sun = urls.find(u => u.includes('sunnah.com/'));
    if (sun) {
      const m = sun.match(/sunnah\.com\/([a-z]+):(\d+)/);
      if (!m || m[1] !== SUNNAH_SLUG[book] || Number(m[2]) !== num)
        add('FAIL', 'hadith-url', r.id, ref, `first sunnah.com url ${sun} does not match ${book}:${num}`);
    } else if (!urls.length) add('FAIL', 'hadith-url', r.id, ref, 'source_url empty');
  }
}

// ---------- Bible (common_ground.bible[]) ----------
// KJV: text_en must equal bible-api.com (?translation=kjv) OR api.getbible.net/v2/kjv after whitespace/quote
//      normalisation (LORD/Lord case unified — getbible prints "Lord"). Any other difference = FAIL.
// Van Dyck: text_ar must equal api.getbible.net/v2/arabicsv (Smith & Van Dyke) exactly after whitespace
//      normalisation; if only harakat/hamza differ the message says so, but it is still FAIL.
// Also: ref_ar must carry the same chapter:verse as ref_en, source_url must point to the same verse.
const BOOKS_EN = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
const normBibleEn = s => nfc(s).replace(/[’‘]/g, "'").replace(/\bLORD\b/g, 'Lord').replace(/\s+([,;:.?!])/g, '$1').replace(/\s+/g, ' ').trim();
const normBibleAr = s => nfc(s).replace(/\s+/g, ' ').trim();
async function checkBible() {
  const chapters = {};
  const chapter = async (tr, bookNr, ch) => {
    const k = `${tr}_${bookNr}_${ch}`;
    if (!chapters[k]) chapters[k] = await cachedJSON(`gb_${k}.json`, `https://api.getbible.net/v2/${tr}/${bookNr}/${ch}.json`);
    return chapters[k];
  };
  for (const { r } of rulings) for (const b of r.common_ground?.bible || []) {
    const ref = b.ref_en || '?';
    const m = String(b.ref_en).match(/^(.+?)\s+(\d+):(\d+)$/);
    const bookNr = m ? BOOKS_EN.indexOf(m[1].replace(/^Psalm$/, 'Psalms')) + 1 : 0;
    if (!m || !bookNr) { add('FAIL', 'bible-ref', r.id, ref, 'cannot parse ref_en'); continue; }
    const [ch, vs] = [Number(m[2]), Number(m[3])];
    const mAr = String(b.ref_ar || '').match(/(\d+)\s*:\s*(\d+)\s*$/);
    if (!mAr || Number(mAr[1]) !== ch || Number(mAr[2]) !== vs) add('FAIL', 'bible-ref', r.id, ref, `ref_ar «${b.ref_ar}» does not match ${ch}:${vs}`);
    let api, gbKjv, gbAr;
    try {
      api = await cachedJSON(`ba_${ref}.json`, `https://bible-api.com/${encodeURIComponent(m[1])}+${ch}:${vs}?translation=kjv`);
      gbKjv = (await chapter('kjv', bookNr, ch)).verses.find(v => v.verse === vs)?.text || '';
      gbAr = (await chapter('arabicsv', bookNr, ch)).verses.find(v => v.verse === vs)?.text || '';
    } catch (e) { add('FAIL', 'bible-net', r.id, ref, `could not fetch: ${e.message}`); continue; }
    const apiText = api.text || api.verses?.map(v => v.text).join(' ') || '';
    const en = normBibleEn(b.text_en);
    if (!en) add('FAIL', 'bible-kjv', r.id, ref, 'text_en empty');
    else if (en === normBibleEn(apiText)) add('PASS', 'bible-kjv', r.id, ref, 'matches bible-api.com KJV');
    else if (en === normBibleEn(gbKjv)) add('PASS', 'bible-kjv', r.id, ref, `matches getbible KJV (bible-api.com differs: «${firstDiff(en, normBibleEn(apiText)).theirs}»)`);
    else { const d = firstDiff(en, normBibleEn(apiText)); add('FAIL', 'bible-kjv', r.id, ref, `KJV differs at ${d.at}: ours «${d.ours}» vs «${d.theirs}»`); }
    const ar = normBibleAr(b.text_ar);
    if (!ar) add('FAIL', 'bible-vandyck', r.id, ref, 'text_ar empty');
    else if (ar === normBibleAr(gbAr)) add('PASS', 'bible-vandyck', r.id, ref, 'matches getbible arabicsv (Smith & Van Dyke) exactly');
    else {
      const skel = normSkeleton(ar) === normSkeleton(gbAr);
      const d = firstDiff(ar, normBibleAr(gbAr));
      add('FAIL', 'bible-vandyck', r.id, ref, `${skel ? 'letters match but harakat/hamza differ' : 'TEXT differs'} at ${d.at}: ours «${d.ours}» vs «${d.theirs}»`);
    }
    const okUrl = u => !u || u.includes(`/${bookNr}/${ch}.json`) || decodeURIComponent(u).replace(/\+/g, ' ').includes(`${m[1]} ${ch}:${vs}`);
    if (!okUrl(b.source_url)) add('FAIL', 'bible-url', r.id, ref, `source_url ${b.source_url} does not point to ${ref}`);
    if (b.source_url_ar && !okUrl(b.source_url_ar)) add('FAIL', 'bible-url', r.id, ref, `source_url_ar ${b.source_url_ar} does not point to ${ref}`);
  }
}

// Quotations in newcomer_explainer / common_ground: every «…» quote in the Arabic text must be a (letters-only)
// substring of a hadith, Bible text or Qur'an text_ar *in the same ruling*. Unmatched quote = WARN (manual review),
// because explainers may legitimately quote a short phrase in paraphrase.
function checkQuotes() {
  for (const { r } of rulings) {
    const pool = [...(r.hadith || []).map(h => h.text_ar), ...(r.quran || []).map(q => q.text_ar), ...(r.common_ground?.bible || []).map(b => b.text_ar)]
      .map(normSkeleton).join(' | ');
    const texts = [r.newcomer_explainer?.ar, r.common_ground?.summary?.ar, r.common_ground?.differences?.ar].filter(Boolean).join(' ');
    for (const q of texts.matchAll(/«([^»]{6,})»/g)) {
      const parts = q[1].split(/…|\.\.\./).map(normSkeleton).filter(p => p.length >= 4);
      if (parts.every(p => pool.includes(p))) add('PASS', 'quote', r.id, `«${q[1].slice(0, 30)}»`, 'quote found in this ruling\'s verified texts');
      else add('WARN', 'quote', r.id, `«${q[1].slice(0, 40)}»`, 'quote not found verbatim in this ruling\'s hadith/Qur\'an/Bible texts — check it is a paraphrase or a sourced statement');
    }
  }
}

// ---------- run ----------
try {
  await checkQuran();
  await checkHadith();
  await checkBible();
  checkQuotes();
} catch (e) { console.error('setup/network error:', e); process.exit(2); }

const fails = results.filter(x => x.level === 'FAIL');
const warns = results.filter(x => x.level === 'WARN');
if (args.has('--json')) console.log(JSON.stringify(results, null, 2));
else {
  console.log(`\n«يومك» verify — ${new Date().toISOString()}`);
  console.log(`rulings: ${rulings.length} | checks: ${results.length} | PASS ${results.filter(x => x.level === 'PASS').length} | WARN ${warns.length} | FAIL ${fails.length}\n`);
  for (const x of results) {
    if (QUIET && x.level === 'PASS') continue;
    console.log(`[${x.level}] ${x.kind.padEnd(18)} ${x.ruling.padEnd(34)} ${x.ref}\n      ${x.msg}`);
  }
  const qn = new Set(), hn = new Set();
  for (const x of results) if (x.level === 'PASS' && x.kind === 'quran-text') qn.add(x.ref);
  for (const x of results) if (x.level !== 'FAIL' && (x.kind === 'hadith-text' || x.kind === 'hadith-manual')) hn.add(x.ruling + '|' + x.ref);
  const bk = results.filter(x => x.kind === 'bible-kjv' && x.level === 'PASS').length;
  const bv = results.filter(x => x.kind === 'bible-vandyck' && x.level === 'PASS').length;
  console.log(`\nSummary: unique ayat verified ${qn.size}; hadith citations verified ${hn.size}; Bible citations verified KJV ${bk} / Van Dyck ${bv}; WARN ${warns.length}; FAIL ${fails.length}`);
}
process.exit(fails.length ? 1 : 0);
