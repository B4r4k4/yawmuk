// Safety tests (from the hackathon brief): abstention when there is no source, referral to a specialist,
// correct attribution, no fabricated Quran/hadith, honest review status, and the renderer never inventing text.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, LOCATIONS, loadRulings, loadScripts, readJson, walkStrings, nonEmptyStr } from './helpers/content.mjs';
import { installDomShim } from './helpers/dom-shim.mjs';

const rulings = loadRulings().map((x) => x.ruling);
const scripts = loadScripts();
const sources = readJson('content/sources.json');
const manual = readJson('tools/audit/manual_verifications.json');
const SIX_BOOKS = ['صحيح البخاري', 'صحيح مسلم', 'سنن أبي داود', 'جامع الترمذي', 'سنن الترمذي', 'سنن النسائي', 'سنن ابن ماجه'];
const MADHAHIB = { hanafi: ['حنف', 'hanafi'], maliki: ['مالك', 'maliki'], shafii: ['شافع', 'shafi'], hanbali: ['حنبل', 'hanbali'] };
const stripMarks = (s) => String(s).replace(/[ً-ْٰـۖ-ۭ]/g, '');

describe('Quran citations: attribution & sourcing', () => {
  for (const r of rulings) {
    test(`${r.id}: every ayah has surah/ayah, verbatim text, translation and a quran.com source`, () => {
      for (const [i, q] of r.quran.entries()) {
        const where = `quran[${i}] ${q.surah}:${q.ayah}`;
        assert.ok(Number.isInteger(q.surah) && q.surah >= 1 && q.surah <= 114, `${where}: surah number`);
        assert.ok(nonEmptyStr(q.surah_name_ar), `${where}: surah_name_ar`);
        assert.ok(nonEmptyStr(String(q.ayah ?? '')) && /^\d+(\s*[-–]\s*\d+)?$/.test(String(q.ayah).trim()), `${where}: ayah number/range`);
        assert.match(q.source_url || '', /^https:\/\//, `${where}: source_url must be https`);
        assert.ok(q.source_url.includes(`quran.com/${q.surah}/`) || q.source_url.includes(`quran.com/${q.surah}:`) || q.source_url.includes(`quran.com/${q.surah}?`), `${where}: source_url ${q.source_url} does not point to surah ${q.surah}`);
        if (!nonEmptyStr(q.text_ar)) assert.ok(nonEmptyStr(r.notes_for_reviewer), `${where}: empty text_ar must be explained in notes_for_reviewer`);
        assert.ok(nonEmptyStr(q.translation_en), `${where}: translation_en`);
      }
    });
  }

  test('every cited ayah is in content/sources.json and marked verified (verify.mjs)', () => {
    const map = Object.fromEntries(sources.filter((s) => s.type === 'quran').map((s) => [s.id, s]));
    const missing = [];
    for (const r of rulings) for (const q of r.quran) {
      const s = map[`quran:${q.surah}:${String(q.ayah).trim()}`];
      if (!s || s.verified !== true) missing.push(`${r.id} ${q.surah}:${q.ayah}`);
    }
    assert.deepEqual(missing, []);
  });
});

describe('Hadith citations: attribution, grade, no fabrication', () => {
  for (const r of rulings) {
    test(`${r.id}: every hadith has text, collection, number, narrator, grade and an https source`, () => {
      for (const [i, d] of r.hadith.entries()) {
        const where = `hadith[${i}] ${d.collection} ${d.number}`;
        assert.ok(nonEmptyStr(d.collection), `${where}: collection`);
        assert.ok(nonEmptyStr(String(d.number ?? '')), `${where}: number`);
        assert.ok(nonEmptyStr(d.grade), `${where}: grade`);
        assert.ok(nonEmptyStr(d.narrator), `${where}: narrator`);
        assert.match(d.source_url || '', /^https:\/\/(www\.)?(sunnah\.com|dorar\.net|islamweb\.net|hadithportal\.com|al-maktaba\.org|shamela\.ws|surahquran\.com)\//, `${where}: source_url ${d.source_url}`);
        if (!nonEmptyStr(d.text_ar)) assert.ok(nonEmptyStr(r.notes_for_reviewer), `${where}: empty text_ar must be explained in notes_for_reviewer`);
        assert.ok(nonEmptyStr(d.translation_en), `${where}: translation_en`);
        if (/البخاري|مسلم/.test(d.collection) && /^صحيح/.test(d.collection)) assert.match(d.grade, /صحيح/, `${where}: Bukhari/Muslim must be graded صحيح`);
      }
    });
  }

  test('six-book hadiths are in sources.json and machine-verified', () => {
    const map = Object.fromEntries(sources.filter((s) => s.type === 'hadith').map((s) => [s.id, s]));
    const bad = [];
    for (const r of rulings) for (const d of r.hadith) {
      if (!SIX_BOOKS.includes(d.collection)) continue;
      const s = map[`hadith:${d.collection.replace(/\s+/g, '-')}:${String(d.number).trim().match(/^\d+/)?.[0]}`];
      if (!s || s.verified !== true) bad.push(`${r.id} ${d.collection} ${d.number}`);
    }
    assert.deepEqual(bad, []);
  });

  test('hadiths outside the six books are documented in tools/audit/manual_verifications.json', () => {
    const bad = [];
    for (const r of rulings) for (const d of r.hadith) {
      if (SIX_BOOKS.includes(d.collection)) continue;
      const ok = manual.some((m) => m.ruling === r.id && nonEmptyStr(m.verified_how) && stripMarks(d.text_ar).includes(stripMarks(m.text_fragment)));
      if (!ok) bad.push(`${r.id}: ${d.collection} ${d.number}`);
    }
    assert.deepEqual(bad, []);
  });
});

describe('Madhhab positions, referral and review status', () => {
  for (const r of rulings) {
    test(`${r.id}: no empty madhhab entry without a reviewer note`, () => {
      const notes = (r.notes_for_reviewer || '').toLowerCase();
      for (const [m, keys] of Object.entries(MADHAHIB)) {
        const d = r.madhahib[m];
        const empty = !nonEmptyStr(d.position_ar) || !nonEmptyStr(d.position_en) || !nonEmptyStr(d.reference);
        if (empty) assert.ok(keys.some((k) => notes.includes(k)), `${m} has an empty field and notes_for_reviewer does not mention it`);
      }
    });

    test(`${r.id}: refer_to_scholar_when tells the player when to ask a specialist (ar + en)`, () => {
      assert.ok(nonEmptyStr(r.refer_to_scholar_when?.ar) && nonEmptyStr(r.refer_to_scholar_when?.en));
      // the card heads this field with "When to ask a scholar" / «متى تسأل عالماً؟» (checked in the renderer tests)
      assert.ok(r.refer_to_scholar_when.ar.trim().length >= 20 && r.refer_to_scholar_when.en.trim().length >= 20, 'referral text too short to be meaningful');
    });

    test(`${r.id}: review_status is honest (no scholar has reviewed yet)`, () => {
      assert.ok(['ai_draft', 'ai_verified'].includes(r.review_status), `unexpected review_status "${r.review_status}"`);
      assert.doesNotMatch(r.review_status, /scholar|human|approved|reviewed/i);
    });
  }

  test('low/medium-confidence and ai_draft rulings carry reviewer notes', () => {
    const bad = rulings.filter((r) => (r.confidence !== 'high' || r.review_status === 'ai_draft') && !nonEmptyStr(r.notes_for_reviewer)).map((r) => r.id);
    assert.deepEqual(bad, []);
  });
});

describe('Scripts never contain Quran or hadith text (story ≠ ruling)', () => {
  const PATTERNS = [
    [/[﴿﴾]/, 'Quran ornate brackets ﴿ ﴾'],
    [/قال\s+(رسول\s+الله|النبي|الرسول)/, '«قال رسول الله / قال النبي»'],
    [/(قال|يقول)\s+(الله\s+)?تعالى/, '«قال تعالى»'],
    [/صلى\s+الله\s+عليه\s+وسلم|ﷺ/, 'salawat formula (signals a hadith quote)'],
    [/عن\s+\S+\s+(رضي\s+الله\s+عنه|رضي\s+الله\s+عنها)/, 'isnad «عن فلان رضي الله عنه»'],
    [/\bthe\s+prophet\b[^.]{0,40}\bsaid\b/i, '"the Prophet said"'],
    [/\b(messenger\s+of\s+allah|rasul\s*allah)\b[^.]{0,40}\bsaid\b/i, '"the Messenger of Allah said"'],
    [/\ballah\s+(says|said)\b/i, '"Allah says"'],
    [/\b(qur'?an|koran)\s+says\b/i, '"the Quran says"'],
    [/\b(sahih\s+)?(bukhari|muslim)\s*(#|no\.?|number)?\s*\d{2,}/i, 'hadith reference number'],
    [/\b\d{1,3}:\d{1,3}\b(?![^\d]*\b(am|pm)\b)/i, 'surah:ayah reference']
  ];
  const files = [...LOCATIONS.map((l) => `content/script/${l}.json`), 'content/script/ui_strings.json'];
  for (const f of files) {
    test(`${f}`, () => {
      const hits = [];
      walkStrings(readJson(f), (s, p) => {
        for (const [re, what] of PATTERNS) {
          if (/time_of_day$/.test(p)) continue;
          if (re.test(s)) hits.push(`${p}: ${what}: "${s.slice(0, 80)}…"`);
        }
      });
      assert.deepEqual(hits, []);
    });
  }

  test('detector self-check: the patterns catch scripture-like text', () => {
    const samples = ['﴿وَأَحَلَّ اللَّهُ الْبَيْعَ﴾', 'قال رسول الله: ...', 'The Prophet (pbuh) said that ...', 'Allah says in the Quran', 'Sahih Bukhari 2083'];
    for (const s of samples) assert.ok(PATTERNS.some(([re]) => re.test(s)), `not detected: ${s}`);
  });
});

describe('Ruling card renderer (src/engine/ui/rulingCard.js) never invents religious text', () => {
  let render, setLang, t;
  before(async () => {
    installDomShim();
    ({ renderRulingCard: render } = await import('../src/engine/ui/rulingCard.js'));
    ({ setLang, t } = await import('../src/engine/i18n.js'));
  });
  const text = (el) => el.textContent;

  test('abstention: a missing ruling renders a "content pending" card with no Quran/hadith/madhhab blocks', () => {
    for (const lang of ['ar', 'en']) {
      setLang(lang);
      const card = render(null, 'home.mortgage');
      assert.ok(card.classList.contains('pending'));
      assert.equal(card.byTag('figure').length, 0);
      assert.equal(card.byTag('blockquote').length, 0);
      assert.equal(card.byClass('madhahib').length, 0);
      assert.ok(text(card).includes(t('pendingBody')));
      assert.equal(card.byClass('verdict')[0].getAttribute('data-verdict'), 'unknown');
    }
  });

  test('abstention: a citation with no verified text shows "not provided" instead of any text', () => {
    setLang('ar');
    const r = structuredClone(rulings[0]);
    delete r.common_ground; // Bible verses (figure > blockquote) are covered by their own test below
    r.quran = [{ surah: 2, surah_name_ar: 'البقرة', ayah: '275', text_ar: '', source_url: 'https://quran.com/2/275' }];
    r.hadith = [{ text_ar: '', collection: 'صحيح مسلم', number: '1598', grade: 'صحيح', source_url: 'https://sunnah.com/muslim:1598' }];
    const card = render(r, r.id);
    assert.equal(card.byTag('blockquote').length, 0, 'no quote may be rendered without text');
    assert.equal(card.byTag('figure').length, 2);
    for (const f of card.byTag('figure')) assert.ok(text(f).includes(t('notProvided')));
  });

  test('unsafe links (javascript:, data:) are never rendered', () => {
    setLang('en');
    const r = structuredClone(rulings[0]);
    r.quran = [{ ...r.quran[0], source_url: 'javascript:alert(1)' }];
    r.hadith = [{ ...(r.hadith[0] || {}), text_ar: 'x', source_url: 'data:text/html,hi' }];
    const card = render(r, r.id);
    for (const a of card.byTag('a')) assert.match(a.getAttribute('href'), /^https?:\/\//);
  });

  test('only an explicit human/scholar review is labelled "reviewed"', () => {
    setLang('en');
    const statusOf = (s) => render({ ...rulings[0], review_status: s }, rulings[0].id).byClass('status')[0];
    for (const s of ['ai_draft', 'ai_verified', 'pending_scholar_review', '']) assert.ok(!statusOf(s).classList.contains('ok'), `${s} shown as reviewed`);
    assert.ok(statusOf('scholar_reviewed').classList.contains('ok'));
  });

  test('optional newcomer_explainer / common_ground: hidden when absent, rendered verbatim when present', () => {
    for (const lang of ['ar', 'en']) {
      setLang(lang);
      const bare = structuredClone(rulings[0]);
      delete bare.newcomer_explainer; delete bare.common_ground;
      const c0 = render(bare, bare.id);
      assert.equal(c0.byClass('rc-plain').length, 0);
      assert.equal(c0.byClass('rc-common').length, 0);
      const empty = render({ ...bare, common_ground: { summary: { ar: '', en: '' }, bible: [], differences: { ar: '', en: '' } } }, bare.id);
      assert.equal(empty.byClass('rc-common').length, 0, 'empty common_ground must be hidden');
      const full = render({
        ...bare,
        newcomer_explainer: { ar: 'شرح مبسط', en: 'plain words' },
        common_ground: { summary: { ar: 'تلاق', en: 'shared' }, bible: [{ ref_en: 'Exodus 22:25', ref_ar: 'خروج 22: 25', text_en: 'KJV TEXT', text_ar: 'نص فاندايك', source_url: 'javascript:x' }], differences: { ar: 'فرق', en: 'differ' } }
      }, bare.id);
      assert.ok(text(full.byClass('rc-plain')[0]).includes(lang === 'ar' ? 'شرح مبسط' : 'plain words'));
      const cg = full.byClass('rc-common')[0];
      assert.ok(text(cg).includes(lang === 'ar' ? 'نص فاندايك' : 'KJV TEXT'), 'bible text verbatim in UI language');
      assert.ok(text(cg).includes(lang === 'ar' ? 'خروج 22: 25' : 'Exodus 22:25'));
      assert.equal(cg.byTag('a').length, 0, 'unsafe bible link not rendered');
      const ar = render({ ...bare, common_ground: { bible: [{ ref_ar: 'تثنية 23: 19', text_ar: '«لَا تُقْرِضْ أَخَاكَ بِرِبًا،', text_en: 'Thou shalt not lend upon usury', source_url: 'https://bible-api.com/x', source_url_ar: 'https://api.getbible.net/y' }] } }, bare.id).byClass('rc-common')[0];
      if (lang === 'ar') {
        assert.ok(!text(ar).includes('«'), 'unmatched quote stripped at display time');
        assert.ok(text(ar).includes('لَا تُقْرِضْ أَخَاكَ بِرِبًا'));
        assert.equal(ar.byTag('a')[0].getAttribute('href'), 'https://api.getbible.net/y', 'Arabic text links source_url_ar');
      } else assert.equal(ar.byTag('a')[0].getAttribute('href'), 'https://bible-api.com/x');
      assert.equal(full.byClass('ayah').length, bare.quran.length, 'bible verses are not counted as ayat');
    }
  });

  for (const r of rulings) {
    test(`${r.id}: card renders verbatim citations with attribution, 4 madhhabs and the referral (ar + en)`, () => {
      for (const lang of ['ar', 'en']) {
        setLang(lang);
        const card = render(r, r.id);
        const ayat = card.byClass('ayah'), ahadith = card.byClass('hadith').filter((e) => e.tagName === 'FIGURE');
        assert.equal(ayat.length, r.quran.length);
        assert.equal(ahadith.length, r.hadith.length);
        r.quran.forEach((q, i) => {
          assert.ok(text(ayat[i]).includes(q.text_ar), 'ayah text must be rendered verbatim');
          assert.ok(text(ayat[i]).includes(`${q.surah}:${q.ayah}`), 'ayah reference');
          assert.equal(ayat[i].byTag('a')[0]?.getAttribute('href'), new URL(q.source_url).href);
        });
        r.hadith.forEach((d, i) => {
          assert.ok(text(ahadith[i]).includes(d.text_ar.trim()), 'hadith text must be rendered verbatim');
          assert.ok(text(ahadith[i]).includes(d.collection) && text(ahadith[i]).includes(String(d.number)), 'hadith collection + number');
          assert.ok(text(ahadith[i]).includes(d.grade), 'hadith grade');
        });
        assert.equal(card.findAll((e) => e.getAttribute('role') === 'tabpanel').length, 4);
        assert.equal(card.byClass('rc-scholar').length, 1);
        assert.match(text(card.byClass('rc-scholar')[0].byTag('h3')[0]), /scholar|عالم|أهل العلم/i, 'referral heading must name a scholar');
        assert.ok(text(card).includes(r.refer_to_scholar_when[lang]));
        assert.ok(text(card).includes(t('disc_ai')) && text(card).includes(t('disc_general')), 'both disclaimers');
      }
    });
  }
});

describe('Disclaimers', () => {
  test('ui_strings.json carries the fiction / AI / general-info disclaimers in both languages', () => {
    const ui = readJson('content/script/ui_strings.json');
    const all = JSON.stringify(ui.disclaimers || {});
    assert.ok(ui.disclaimers && Object.keys(ui.disclaimers).length >= 3, 'disclaimers block');
    for (const v of Object.values(ui.disclaimers)) if (v && typeof v === 'object' && 'ar' in v) assert.ok(nonEmptyStr(v.ar) && nonEmptyStr(v.en));
    assert.match(all, /scholar/i);
  });
  test('README and the game state that rulings are pending scholarly review', () => {
    const readme = fs.existsSync(path.join(ROOT, 'README.md')) ? fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8') : '';
    assert.match(readme, /not (been )?reviewed by a (human )?scholar|pending (scholarly|scholar) review/i, 'README must carry the review-status disclaimer');
    assert.match(readme, /لم (تُ|ت)راجَ?ع|بانتظار مراجعة/, 'README (Arabic) must carry the review-status disclaimer');
  });
});

describe('Source log', () => {
  test('docs/SOURCES.md is generated from content/sources.json and up to date (npm run sources)', () => {
    const md = fs.readFileSync(path.join(ROOT, 'docs/SOURCES.md'), 'utf8');
    assert.ok(md.includes(`| **Total** | **${sources.length}** |`), 'entry count differs from content/sources.json: run npm run sources');
    for (const s of sources.filter((x) => x.type === 'quran' || x.type === 'hadith')) if (s.url) assert.ok(md.includes(s.url), `${s.id} missing from SOURCES.md`);
  });
});
