// Situation flow: setup + dialogue -> choices -> consequence(+points) -> ruling card -> check question -> done.
import { h } from '../dom.js';
import { t, tr } from '../i18n.js';
import { QUALITY } from '../config.js';
import { getRuling } from '../content.js';
import { recordChoice, recordCheck, markDone, sitRecord } from '../progress.js';
import { openModal, setContent, btn } from './overlay.js';
import { renderRulingCard } from './rulingCard.js';

function speakerName(speaker, sit, script) {
  if (!speaker || speaker === 'narrator') return null;
  if (speaker === 'adam') return t('adam');
  if (sit.npc?.id === speaker) return tr(sit.npc.name) || speaker;
  const other = (script?.situations || []).find((s) => s.npc?.id === speaker);
  if (other) return tr(other.npc.name);
  return speaker.charAt(0).toUpperCase() + speaker.slice(1);
}

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const nextLabel = () => `${t('next')} ${document.documentElement.dir === 'rtl' ? '‹' : '›'}`;
const wait = (fn) => new Promise((resolve) => fn(resolve));

/** Number-key shortcuts for a list of buttons while `container` is in the DOM. */
function numberKeys(container, buttons) {
  const onKey = (e) => {
    if (!document.contains(container)) { document.removeEventListener('keydown', onKey); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= buttons.length) { e.preventDefault(); document.removeEventListener('keydown', onKey); buttons[n - 1].click(); }
  };
  document.addEventListener('keydown', onKey);
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
        await wait((next) => {
          const nextBtn = btn(nextLabel(), next, 'primary', { 'data-autofocus': true });
          setContent(sheet, [
            h('div', { class: `line ${name ? 'speech' : 'narration'} ${L.speaker === 'adam' ? 'adam' : ''}` },
              name ? h('div', { class: 'speaker' }, name) : null,
              h('p', { class: 'line-text' }, L.text)),
            h('div', { class: 'row end' }, h('span', { class: 'progress-dots', 'aria-hidden': 'true' }, `${i + 1}/${lines.length}`), nextBtn)
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
            return h('button', { type: 'button', class: `choice${tried ? ' tried' : ''}`, onclick: () => pick(c), ...(i === 0 ? { 'data-autofocus': true } : {}) },
              h('span', { class: 'num', 'aria-hidden': 'true' }, String(i + 1)), h('span', {}, tr(c.label)));
          });
          const wrap = h('div', { class: 'choices', role: 'group', 'aria-label': t('whatDoYouDo') }, buttons);
          setContent(sheet, [h('div', { class: 'speaker' }, t('whatDoYouDo')), wrap]);
          numberKeys(wrap, buttons);
        });
        recordChoice(key, lastChoice);
        opts.onPoints?.();
        const q = QUALITY[lastChoice.quality] || QUALITY.acceptable;
        await wait((next) => {
          setContent(sheet, [
            h('div', { class: 'consequence' },
              h('div', { class: 'row' },
                h('span', { class: 'badge', style: { '--c': q.color } }, q[document.documentElement.lang] || q.en),
                h('span', { class: `points ${lastChoice.points > 0 ? 'pos' : 'zero'}` }, `+${lastChoice.points} ${t('points')}`)),
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
      setContent(modal, [renderRulingCard(ruling, sit.ruling_id), h('div', { class: 'row end sticky-actions' }, btn(nextLabel(), next, 'primary', { 'data-autofocus': true }))]);
      // focus the card heading area for screen readers but keep the button reachable
      modal.box.scrollTop = 0;
    });

    const cq = sit.check_question;
    if (cq && Array.isArray(cq.options) && cq.options.length) {
      await wait((next) => {
        const fb = h('p', { class: 'feedback', role: 'status' });
        let answered = false;
        const doneBtn = btn(nextLabel(), next, 'primary', { disabled: true });
        const buttons = cq.options.map((o, i) => h('button', {
          type: 'button', class: 'choice', ...(i === 0 ? { 'data-autofocus': true } : {}),
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
      setContent(modal, [h('div', { class: 'check' },
        h('p', { class: 'eyebrow' }, tr(sit.npc?.name) || ''),
        h('h2', {}, t('finishSituation') + ' ✓'),
        lastChoice ? h('p', {}, `${tr(lastChoice.label)} → +${lastChoice.points} ${t('points')}`) : null,
        rec?.tried?.length ? h('p', { class: 'muted' }, `${rec.tried.length}/${(sit.choices || []).length}`) : null),
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
    setContent(m, [renderRulingCard(getRuling(sit.ruling_id), sit.ruling_id), h('div', { class: 'row end sticky-actions' }, btn(t('close'), () => m.close(), 'primary', { 'data-autofocus': true }))]);
  });
}
