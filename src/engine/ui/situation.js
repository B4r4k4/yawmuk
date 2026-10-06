// Situation flow: setup + dialogue -> choices -> consequence(+points) -> ruling card -> check question -> done.
import { h } from '../dom.js';
import { t, tr } from '../i18n.js';
import { QUALITY } from '../config.js';
import { getRuling } from '../content.js';
import { recordChoice, recordCheck, markDone, sitRecord } from '../progress.js';
import { openModal, setContent, btn, tilt, prefersReducedMotion } from './overlay.js';
import { renderRulingCard, statusBadge } from './rulingCard.js';
import './strings.js';

function speakerName(speaker, sit, script) {
  if (!speaker || speaker === 'narrator') return null;
  if (speaker === 'adam') return t('adam');
  if (sit.npc?.id === speaker) return tr(sit.npc.name) || speaker;
  const other = (script?.situations || []).find((s) => s.npc?.id === speaker);
  if (other) return tr(other.npc.name);
  return speaker.charAt(0).toUpperCase() + speaker.slice(1);
}
function speakerRole(speaker, sit, script) {
  if (sit.npc?.id === speaker) return tr(sit.npc.role) || '';
  const other = (script?.situations || []).find((s) => s.npc?.id === speaker);
  return tr(other?.npc?.role) || '';
}

// Portrait palette: a stable hue per speaker id (no images; a monogram in the 8-point star frame).
const HUES = ['#2f8f74', '#b5793a', '#3f7cac', '#8a5a9e', '#a8553f', '#4b8a8c', '#7d8a3a'];
function hueFor(id) { let n = 0; for (const c of String(id)) n = (n * 31 + c.charCodeAt(0)) >>> 0; return HUES[n % HUES.length]; }
function portrait(speaker, name) {
  const letter = [...String(name || '?').trim()][0] || '?';
  return h('div', { class: 'portrait', style: { '--pc': speaker === 'adam' ? '#2a6f86' : hueFor(speaker) }, 'aria-hidden': 'true' },
    h('span', { class: 'portrait-star' }), h('span', { class: 'portrait-letter' }, letter));
}

/**
 * Word-by-word reveal. The full text is in the DOM from the start (screen readers and layout get the final text,
 * Arabic shaping never "jumps"); each word only fades in on a staggered delay. Returns { el, finish, typing() }.
 */
function typewriter(text) {
  const el = h('p', { class: 'line-text' });
  const parts = String(text || '').split(/(\s+)/);
  const words = parts.filter((p) => p && !/^\s+$/.test(p)).length;
  const reduce = prefersReducedMotion();
  // ~45 ms per word, the whole line capped at ~1.8 s
  const step = Math.min(45, 1800 / Math.max(1, words));
  let i = 0;
  for (const p of parts) {
    if (!p) continue;
    if (/^\s+$/.test(p)) el.append(p);
    else el.append(h('span', { class: 'w', style: { animationDelay: `${Math.round(i++ * step)}ms` } }, p));
  }
  const total = reduce ? 0 : Math.round(i * step) + 260;
  let done = total === 0;
  if (done) el.classList.add('instant'); else el.classList.add('typing');
  const timer = done ? 0 : setTimeout(() => { done = true; el.classList.remove('typing'); el.dispatchEvent(new Event('typed')); }, total);
  return {
    el,
    typing: () => !done,
    finish() { if (done) return; done = true; clearTimeout(timer); el.classList.remove('typing'); el.classList.add('instant'); el.dispatchEvent(new Event('typed')); }
  };
}

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const nextLabel = () => `${t('next')} ${document.documentElement.dir === 'rtl' ? '‹' : '›'}`;
const wait = (fn) => new Promise((resolve) => fn(resolve));

/** Number-key shortcuts for a list of buttons while `container` is in the DOM. */
function numberKeys(container, buttons) {
  const onKey = (e) => {
    if (!document.contains(container)) { document.removeEventListener('keydown', onKey); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= buttons.length && !buttons[n - 1].disabled) { e.preventDefault(); document.removeEventListener('keydown', onKey); buttons[n - 1].click(); }
  };
  document.addEventListener('keydown', onKey);
}

/** "+10 pts": the signed number is an LTR island so it never flips to "10+" in Arabic. */
const pointsEl = (n) => h('span', { class: `points ${n > 0 ? 'pos' : 'zero'}` }, h('bdi', { dir: 'ltr' }, `+${n}`), ` ${t('points')}`);

const QUALITY_ICON = { best: '✓', acceptable: '◐', wrong: '✕' };

/** The always-visible review status + action buttons under the ruling card (a real footer, never over the content). */
function rulingFooter(ruling, ...buttons) {
  return h('div', { class: 'row end sticky-actions' },
    h('div', { class: 'review-chip' }, statusBadge(ruling?.review_status || 'ai_draft', 'compact')),
    buttons);
}

/**
 * Run a situation. opts: { script, startAt: 'dialogue'|'choices'|'ruling', onPoints(total), onFaceNpc }
 * Resolves when the player closes the flow.
 */
export async function runSituation(sit, opts = {}) {
  const { script } = opts;
  const key = sit.key || sit.ruling_id;
  let startAt = opts.startAt || 'dialogue';

  // ---------------- dialogue phase (bottom sheet, scene stays visible)
  const sheet = openModal({ variant: 'sheet', className: 'dialogue', label: tr(sit.npc?.name) || t('whatDoYouDo') });
  let lastChoice = null;
  try {
    if (startAt === 'dialogue') {
      const lines = [];
      if (tr(sit.setup)) lines.push({ speaker: 'narrator', text: tr(sit.setup), setup: true });
      for (const d of sit.dialogue || []) lines.push({ speaker: d.speaker, text: tr(d) });
      for (let i = 0; i < lines.length; i++) {
        const L = lines[i];
        const name = speakerName(L.speaker, sit, script);
        const role = name && L.speaker !== 'adam' ? speakerRole(L.speaker, sit, script) : '';
        await wait((next) => {
          const tw = typewriter(L.text);
          const skip = h('button', { type: 'button', class: 'skip-line', onclick: () => tw.finish(), 'aria-label': t('skipLine') }, `${t('skip')} »`);
          tw.el.addEventListener('typed', () => skip.classList.add('gone'));
          if (!tw.typing()) skip.classList.add('gone');
          const nextBtn = btn(nextLabel(), next, 'primary', { 'data-autofocus': true });
          const isAdam = L.speaker === 'adam';
          const bubble = h('div', { class: 'bubble', onclick: () => tw.finish() }, tw.el);
          setContent(sheet, [
            h('div', { class: `line ${name ? 'speech' : 'narration'}${isAdam ? ' adam' : ''}`, 'data-speaker': L.speaker || 'narrator' },
              h('div', { class: 'line-head' },
                name ? portrait(L.speaker, name) : h('div', { class: 'portrait narr', 'aria-hidden': 'true' }, h('span', { class: 'portrait-letter' }, '❝')),
                h('div', { class: 'nameplate' },
                  h('div', { class: 'speaker' }, name || t('narratorLabel')),
                  role ? h('div', { class: 'role' }, role) : null),
                skip),
              bubble),
            h('div', { class: 'row end' },
              h('span', { class: 'progress-dots', 'aria-label': `${i + 1}/${lines.length}` },
                lines.map((_, j) => h('span', { class: `dot${j < i ? ' past' : j === i ? ' now' : ''}`, 'aria-hidden': 'true' })),
                h('span', { class: 'count', 'aria-hidden': 'true' }, `${i + 1}/${lines.length}`)),
              nextBtn)
          ]);
        });
      }
    }

    if (startAt === 'dialogue' || startAt === 'choices') {
      // Shuffled on every display: the 'best' option is often the longest, so a fixed order would give it away.
      const choices = shuffle(sit.choices || []);
      if (choices.length) {
        const rec = sitRecord(key);
        lastChoice = await wait((pick) => {
          const buttons = choices.map((c, i) => {
            const tried = rec?.tried?.includes(c.id);
            return tilt(h('button', { type: 'button', class: `choice${tried ? ' tried' : ''}`, style: { '--i': i }, onclick: () => pick(c), ...(i === 0 ? { 'data-autofocus': true } : {}) },
              h('span', { class: 'num', 'aria-hidden': 'true' }, String(i + 1)), h('span', {}, tr(c.label))), 3);
          });
          const wrap = h('div', { class: 'choices', role: 'group', 'aria-label': t('whatDoYouDo') }, buttons);
          setContent(sheet, [
            h('div', { class: 'choices-head' }, h('div', { class: 'speaker' }, t('whatDoYouDo')), h('span', { class: 'hint' }, t('choiceHint'))),
            wrap]);
          numberKeys(wrap, buttons);
        });
        recordChoice(key, lastChoice);
        opts.onPoints?.();
        const q = QUALITY[lastChoice.quality] || QUALITY.acceptable;
        await wait((next) => {
          setContent(sheet, [
            h('div', { class: `consequence q-${lastChoice.quality || 'acceptable'}` },
              h('div', { class: 'row' },
                h('span', { class: 'badge quality', style: { '--c': q.color } }, h('span', { class: 'v-icon', 'aria-hidden': 'true' }, QUALITY_ICON[lastChoice.quality] || '•'), h('span', {}, q[document.documentElement.lang] || q.en)),
                pointsEl(lastChoice.points)),
              h('p', { class: 'line-text' }, tr(lastChoice.consequence))),
            h('div', { class: 'row end' }, btn(t('seeRuling'), next, 'primary', { 'data-autofocus': true }))
          ]);
        });
      }
    }
  } finally {
    sheet.close();
  }

  // ---------------- ruling + check phase (full modal)
  const ruling = getRuling(sit.ruling_id);
  const modal = openModal({ className: 'ruling-modal', label: t('ruling') });
  let action = 'done';
  try {
    await wait((next) => {
      setContent(modal, [renderRulingCard(ruling, sit.ruling_id), rulingFooter(ruling, btn(nextLabel(), next, 'primary', { 'data-autofocus': true }))]);
      modal.box.scrollTop = 0;
    });

    const cq = sit.check_question;
    if (cq && Array.isArray(cq.options) && cq.options.length) {
      await wait((next) => {
        const fb = h('p', { class: 'feedback', role: 'status' });
        let answered = false;
        const doneBtn = btn(nextLabel(), next, 'primary', { disabled: true });
        const buttons = cq.options.map((o, i) => h('button', {
          type: 'button', class: 'choice', style: { '--i': i }, ...(i === 0 ? { 'data-autofocus': true } : {}),
          onclick: () => {
            if (answered) return; answered = true;
            const ok = !!o.correct;
            recordCheck(key, ok);
            opts.onPoints?.();
            buttons.forEach((b, j) => { b.disabled = true; if (cq.options[j].correct) b.classList.add('correct'); });
            if (!ok) buttons[i].classList.add('wrong');
            fb.textContent = ok ? t('correct') : t('incorrect');
            fb.className = `feedback ${ok ? 'ok' : 'bad'}`;
            doneBtn.disabled = false; doneBtn.focus();
          }
        }, h('span', { class: 'num', 'aria-hidden': 'true' }, String(i + 1)), h('span', {}, tr(o))));
        const wrap = h('div', { class: 'choices', role: 'group', 'aria-label': t('checkTitle') }, buttons);
        setContent(modal, [h('div', { class: 'check' }, h('p', { class: 'eyebrow' }, t('checkTitle')), h('h2', {}, tr(cq.q)), wrap, fb), h('div', { class: 'row end' }, doneBtn)]);
        numberKeys(wrap, buttons);
      });
    }
    markDone(key);
    opts.onPoints?.();

    action = await wait((done) => {
      const rec = sitRecord(key);
      const canRetry = (sit.choices || []).length > 1;
      const n = (sit.choices || []).length;
      setContent(modal, [h('div', { class: 'check finish' },
        h('div', { class: 'finish-mark', 'aria-hidden': 'true' }, h('span', {}, '✓')),
        h('p', { class: 'eyebrow' }, tr(sit.npc?.name) || ''),
        h('h2', {}, t('finishSituation')),
        lastChoice ? h('p', { class: 'finish-choice' }, h('span', {}, tr(lastChoice.label)), ' ', pointsEl(lastChoice.points)) : null,
        rec?.tried?.length ? h('div', { class: 'tried-meter', 'aria-label': `${rec.tried.length}/${n}` },
          Array.from({ length: n }, (_, j) => h('span', { class: `pip${j < rec.tried.length ? ' on' : ''}`, 'aria-hidden': 'true' })),
          h('span', { class: 'muted', 'aria-hidden': 'true' }, `${rec.tried.length}/${n}`)) : null),
      h('div', { class: 'row end wrap' },
        canRetry ? btn(t('tryAnother'), () => done('retry'), 'ghost') : null,
        btn(t('finishSituation'), () => done('done'), 'primary', { 'data-autofocus': true }))]);
    });
  } finally {
    modal.close();
  }
  if (action === 'retry') return runSituation(sit, { ...opts, startAt: 'choices' });
  return 'done';
}

/** Menu shown when the player re-triggers a completed hotspot. Resolves 'retry' | 'review' | null. */
export function revisitMenu(sit) {
  return new Promise((resolve) => {
    const m = openModal({ className: 'small', label: t('alreadyDone'), dismissible: true, onClose: (r) => resolve(r ?? null) });
    setContent(m, [
      h('p', { class: 'eyebrow' }, tr(sit.npc?.name) || ''),
      h('h2', {}, t('alreadyDone')),
      h('div', { class: 'stack' },
        btn(t('tryAnother'), () => m.close('retry'), 'primary', { 'data-autofocus': true }),
        btn(t('reviewRuling'), () => m.close('review'), 'ghost'),
        btn(t('close'), () => m.close(null), 'ghost'))
    ]);
  });
}

/** Ruling card alone (review mode). */
export function showRulingOnly(sit) {
  return new Promise((resolve) => {
    const m = openModal({ className: 'ruling-modal', label: t('ruling'), dismissible: true, onClose: () => resolve() });
    const r = getRuling(sit.ruling_id);
    setContent(m, [renderRulingCard(r, sit.ruling_id), rulingFooter(r, btn(t('close'), () => m.close(), 'primary', { 'data-autofocus': true }))]);
  });
}
