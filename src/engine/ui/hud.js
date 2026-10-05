// HUD: location, time of day, score, situations done X/N, menu button, interaction prompt.
import { h } from '../dom.js';
import { t, tr, onLangChange } from '../i18n.js';

export function createHud(root, { onMenu }) {
  const loc = h('span', { class: 'hud-loc' });
  const time = h('span', { class: 'hud-time' });
  const score = h('span', { class: 'hud-score' });
  const done = h('span', { class: 'hud-done' });
  const menuBtn = h('button', { type: 'button', class: 'hud-menu', onclick: onMenu, 'aria-label': t('menu') }, '☰');
  const bar = h('div', { class: 'hud hidden' },
    menuBtn,
    h('div', { class: 'hud-chip' }, loc, h('span', { class: 'sep', 'aria-hidden': 'true' }, '·'), time),
    h('div', { class: 'hud-chip' }, h('span', { class: 'lbl' }, t('score')), score),
    h('div', { class: 'hud-chip' }, h('span', { class: 'lbl' }, t('done')), done));
  const prompt = h('div', { class: 'prompt', 'aria-live': 'polite' });
  root.append(bar, prompt);

  let last = {};
  function set(data) {
    last = { ...last, ...data };
    loc.textContent = tr(last.title) || '';
    time.textContent = last.time || '';
    score.textContent = String(last.score ?? 0);
    done.textContent = `${last.done ?? 0}/${last.total ?? 0}`;
  }
  onLangChange(() => {
    bar.querySelectorAll('.lbl')[0].textContent = t('score');
    bar.querySelectorAll('.lbl')[1].textContent = t('done');
    menuBtn.setAttribute('aria-label', t('menu'));
    set({});
  });
  function bump() { score.classList.remove('bump'); void score.offsetWidth; score.classList.add('bump'); }
  function show(v) { bar.classList.toggle('hidden', !v); if (!v) setPrompt(null); }
  function setPrompt(text) {
    if (!text) { prompt.classList.remove('show'); return; }
    prompt.replaceChildren(h('kbd', {}, 'E'), h('span', {}, text));
    prompt.classList.add('show');
  }
  return { set, show, setPrompt, bump };
}
