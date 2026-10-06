// Ruling Card renderer. Renders ONLY what is in content/rulings (never invents religious text).
// Any missing field is omitted or marked "not documented yet"; a missing ruling renders a "content pending" card.
// Layout: header (verdict seal + review status) -> "in plain words" callout -> collapsible sections (accordion).
import { h, link } from '../dom.js';
import { t, tr, trField, getLang } from '../i18n.js';
import { VERDICTS, CATALOG } from '../config.js';
import './strings.js';

const list = (arr) => (Array.isArray(arr) && arr.length ? h('ul', { class: 'rc-list' }, arr.map((x) => h('li', {}, String(x)))) : null);
// Content values (Arabic book titles, narrators, references with URLs) are often in the other script than the
// UI: isolate them with <bdi dir=auto> so the bidi algorithm does not scramble their punctuation and order.
const iso = (v) => (v == null || v === '' ? null : h('bdi', { dir: 'auto' }, String(v)));
const nonEmpty = (v) => v != null && v !== '' && !(Array.isArray(v) && !v.length);

/** Source link, visibly marked as external (icon via CSS) and announced as such. */
function srcLink(url) {
  const a = link(url, t('source'));
  if (!a) return null;
  try { a.setAttribute('title', `${new URL(a.getAttribute('href')).hostname} — ${t('externalLink')}`); } catch { /* */ }
  a.setAttribute('aria-label', `${t('source')} (${t('externalLink')})`);
  return a;
}

// Sections collapsed by default on narrow screens (long, secondary lists). Everything else starts open.
const COLLAPSED_ON_MOBILE = new Set(['contemporary', 'guidance', 'alternatives']);
const isNarrow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches;
let secSeq = 0;

/** A collapsible section: <section class="rc-section rc-<key>"><h3 class="rc-h"><button aria-expanded>…</button></h3><div class="rc-body">…</div></section> */
function section(titleKey, ...children) {
  const kids = children.flat().filter(Boolean);
  if (!kids.length) return null;
  return collapsible(`rc-section rc-${titleKey}`, t(titleKey), kids, COLLAPSED_ON_MOBILE.has(titleKey) && isNarrow());
}

function collapsible(cls, title, kids, collapsed = false, attrs = {}) {
  const id = `rcs${++secSeq}`;
  const body = h('div', { class: 'rc-body', id }, kids);
  const btn = h('button', { type: 'button', class: 'rc-toggle', 'aria-expanded': collapsed ? 'false' : 'true', 'aria-controls': id },
    h('span', { class: 'rc-h-text' }, title), h('span', { class: 'rc-chev', 'aria-hidden': 'true' }));
  const sec = h('section', { class: `${cls}${collapsed ? ' collapsed' : ''}`, ...attrs }, h('h3', { class: 'rc-h' }, btn), body);
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    sec.classList.toggle('collapsed', !open);
  });
  return sec;
}

// Verdict glyphs: shape + text always accompany the colour (never colour alone).
const VERDICT_ICON = { haram: '✕', makruh: '!', mubah: '✓', halal: '✓', mustahab: '★', wajib: '◆', disputed: '⇄', depends: '⋯', unknown: '…' };

export function verdictBadge(verdict) {
  const key = VERDICTS[verdict] ? verdict : 'unknown';
  const v = VERDICTS[key];
  return h('span', { class: 'badge verdict', style: { '--c': v.color }, 'data-verdict': verdict || 'unknown' },
    h('span', { class: 'v-icon', 'aria-hidden': 'true' }, VERDICT_ICON[key] || '•'), h('span', { class: 'v-text' }, v[getLang()]));
}

/** Big verdict seal for the card header: icon in an 8-point star + "Overall ruling" label + verdict. */
function verdictSeal(verdict) {
  const key = VERDICTS[verdict] ? verdict : 'unknown';
  const v = VERDICTS[key];
  return h('div', { class: 'rc-seal', style: { '--c': v.color }, 'data-verdict': verdict || 'unknown' },
    h('span', { class: 'seal-star', 'aria-hidden': 'true' }, h('span', { class: 'seal-icon' }, VERDICT_ICON[key] || '•')),
    h('span', { class: 'seal-text' }, h('span', { class: 'seal-label' }, t('verdictLabel')), verdictBadge(verdict)));
}

/** { reviewed, label } for a review_status. Only an explicit HUMAN/scholar review counts as reviewed. */
export function statusInfo(status) {
  const s = String(status || 'ai_draft');
  const reviewed = /scholar|human/i.test(s) && /review|approved|verified/i.test(s) && !/pending|^ai/i.test(s);
  const label = reviewed ? t('status_reviewed') : s === 'ai_verified' ? t('status_ai_verified') : t('status_ai_draft');
  return { reviewed, label, raw: s };
}

export function statusBadge(status, extraClass = '') {
  const { reviewed, label, raw } = statusInfo(status);
  return h('span', { class: `badge status ${reviewed ? 'ok' : 'draft'}${extraClass ? ` ${extraClass}` : ''}`, title: raw },
    h('span', { class: 'st-icon', 'aria-hidden': 'true' }, reviewed ? '✓' : '◷'), h('span', {}, label));
}

function quranBlock(q) {
  const ref = [q.surah_name_ar, nonEmpty(q.surah) ? `${q.surah}:${q.ayah ?? ''}` : null].filter(Boolean).join(' · ');
  return h('figure', { class: 'ayah' },
    q.text_ar ? h('blockquote', { class: 'quran-text', lang: 'ar', dir: 'rtl' }, /[﴾﴿]/.test(q.text_ar) ? q.text_ar : `﴿${q.text_ar}﴾`) : h('p', { class: 'muted' }, t('notProvided')),
    getLang() === 'en' && q.translation_en ? h('p', { class: 'translation', lang: 'en', dir: 'ltr' }, q.translation_en) : null,
    h('figcaption', { class: 'ref' }, h('span', { class: 'ref-meta' }, iso(ref)), srcLink(q.source_url))
  );
}

function gradeClass(g) {
  const s = String(g || '');
  if (/ضعيف|da['ʿ’]?if|weak/i.test(s)) return 'weak';
  if (/حسن|hasan/i.test(s) && !/صحيح|sahih/i.test(s)) return 'good';
  if (/صحيح|sahih|متفق|agreed/i.test(s)) return 'strong';
  return 'neutral';
}

function hadithBlock(d) {
  const meta = [d.collection, d.number ? `#${d.number}` : null].filter(Boolean).join(' ');
  return h('figure', { class: 'hadith' },
    d.text_ar ? h('blockquote', { class: 'hadith-text', lang: 'ar', dir: 'rtl' }, /^[«"“]/.test(d.text_ar.trim()) ? d.text_ar : `«${d.text_ar}»`) : h('p', { class: 'muted' }, t('notProvided')),
    getLang() === 'en' && d.translation_en ? h('p', { class: 'translation', lang: 'en', dir: 'ltr' }, d.translation_en) : null,
    h('figcaption', { class: 'ref' },
      h('span', { class: 'ref-meta' }, iso(meta), d.narrator ? h('span', {}, ` · ${t('narrator')}: `, iso(d.narrator)) : null),
      d.grade ? h('span', { class: `grade chip g-${gradeClass(d.grade)}` }, h('span', { class: 'chip-k' }, `${t('grade')}: `), iso(`${d.grade}${d.grader ? ` (${d.grader})` : ''}`)) : null,
      srcLink(d.source_url))
  );
}

let tabSeq = 0;
function madhahibBlock(m) {
  const keys = ['hanafi', 'maliki', 'shafii', 'hanbali'];
  const uid = `mt${++tabSeq}`;
  const tabs = [], panels = [];
  keys.forEach((k, i) => {
    const d = m?.[k] || {};
    const pos = trField(d, 'position');
    const tab = h('button', { type: 'button', role: 'tab', id: `${uid}-t-${k}`, 'aria-controls': `${uid}-p-${k}`, 'aria-selected': i === 0 ? 'true' : 'false', tabindex: i === 0 ? '0' : '-1', class: 'tab' }, t(k));
    const panel = h('div', { role: 'tabpanel', id: `${uid}-p-${k}`, 'aria-labelledby': tab.id, class: `tabpanel${i === 0 ? ' active' : ''}`, tabindex: '0' },
      h('h4', { class: 'madhhab-name' }, t(k)),
      pos ? h('p', {}, pos) : h('p', { class: 'muted' }, t('notProvided')),
      d.reference ? h('p', { class: 'ref' }, `${t('reference')}: `, iso(d.reference)) : null);
    tabs.push(tab); panels.push(panel);
  });
  const select = (i) => {
    tabs.forEach((tb, j) => { tb.setAttribute('aria-selected', j === i ? 'true' : 'false'); tb.tabIndex = j === i ? 0 : -1; panels[j].classList.toggle('active', j === i); });
    tabs[i].focus();
  };
  tabs.forEach((tb, i) => {
    tb.addEventListener('click', () => select(i));
    tb.addEventListener('keydown', (e) => {
      const rtl = document.documentElement.dir === 'rtl';
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight', back = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); select((i + 1) % 4); }
      if (e.key === back) { e.preventDefault(); select((i + 3) % 4); }
      if (e.key === 'Home') { e.preventDefault(); select(0); }
      if (e.key === 'End') { e.preventDefault(); select(3); }
    });
  });
  return h('div', { class: 'madhahib' }, h('div', { class: 'tablist', role: 'tablist', 'aria-label': t('madhahib') }, tabs), h('div', { class: 'tabpanels' }, panels));
}

function contemporaryBlock(c) {
  return h('div', { class: 'council' },
    h('div', { class: 'council-head' }, h('strong', {}, iso(c.body || '—')), c.decision_ref ? h('span', { class: 'ref' }, ' · ', iso(c.decision_ref)) : null),
    trField(c, 'position') ? h('p', {}, trField(c, 'position')) : null,
    srcLink(c.source_url));
}

/** "In plain words" — newcomer_explainer {ar,en}. Hidden when absent. Always open (the heart of the card). */
function plainWordsBlock(r) {
  const txt = tr(r.newcomer_explainer);
  if (!nonEmpty(txt)) return null;
  return h('section', { class: 'rc-section rc-plain' }, h('h3', { class: 'rc-h' }, h('span', { class: 'rc-h-text' }, t('plainWords'))), h('p', { class: 'plain' }, txt));
}

/** Build the ruling card element. ruling may be null -> "content pending". */
export function renderRulingCard(ruling, rulingId) {
  if (!ruling) {
    const cat = CATALOG.find((c) => c.id === rulingId);
    return h('article', { class: 'ruling-card pending' },
      h('header', { class: 'rc-header' },
        h('p', { class: 'eyebrow' }, t('ruling')),
        h('h2', { class: 'rc-title' }, cat ? tr(cat.title) : rulingId || '—'),
        h('div', { class: 'rc-head-row' }, verdictSeal('unknown'), h('div', { class: 'badges' }, statusBadge('ai_draft')))),
      h('section', { class: 'rc-section' }, h('h3', { class: 'rc-h' }, h('span', { class: 'rc-h-text' }, t('pendingTitle'))), h('p', {}, t('pendingBody'))));
  }
  const r = ruling;
  const guidance = tr(r.practical_guidance);
  const alts = tr(r.halal_alternatives);
  const conf = r.confidence ? h('span', { class: 'badge conf' }, `${t('confidence')}: ${t(`conf_${r.confidence}`)}`) : null;
  return h('article', { class: `ruling-card${r._fixture ? ' fixture' : ''}`, 'data-ruling': r.id },
    h('header', { class: 'rc-header' },
      h('p', { class: 'eyebrow' }, t('ruling')),
      h('h2', { class: 'rc-title' }, tr(r.title) || r.id),
      h('div', { class: 'rc-head-row' },
        verdictSeal(r.verdict),
        h('div', { class: 'badges' }, statusBadge(r.review_status), conf,
          r._fixture ? h('span', { class: 'badge fixture' }, t('fixtureBadge')) : null))),
    plainWordsBlock(r),
    nonEmpty(tr(r.question)) ? section('question', h('p', { class: 'question' }, tr(r.question))) : null,
    nonEmpty(tr(r.summary)) ? section('summary', h('p', { class: 'summary' }, tr(r.summary))) : null,
    section('quran', (r.quran || []).filter(Boolean).map(quranBlock)),
    section('hadith', (r.hadith || []).filter(Boolean).map(hadithBlock)),
    r.madhahib ? section('madhahib', madhahibBlock(r.madhahib)) : null,
    section('contemporary', (r.contemporary || []).filter(Boolean).map(contemporaryBlock)),
    section('guidance', list(Array.isArray(guidance) ? guidance : guidance ? [guidance] : [])),
    section('alternatives', list(Array.isArray(alts) ? alts : alts ? [alts] : [])),
    nonEmpty(tr(r.refer_to_scholar_when)) ? collapsible('rc-section rc-scholar', t('referScholar'), [h('p', {}, tr(r.refer_to_scholar_when))]) : null,
    h('div', { class: 'rc-foot' }, h('p', {}, t('disc_general')), h('p', {}, t('disc_ai')))
  );
}
