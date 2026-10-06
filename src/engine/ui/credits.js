// Credits / حقوق: built at build time from public/assets/LICENSES.md (+ public/assets/characters/LICENSES.md when present).
// CC-BY lines are shown verbatim (asset names and authors stay in English); CC0 sources get a general thanks.
import { h, safeUrl } from '../dom.js';
import { t } from '../i18n.js';
import { openModal, setContent, btn } from './overlay.js';
import './strings.js';

const RAW = import.meta.glob('../../../public/assets/**/LICENSES.md', { query: '?raw', import: 'default', eager: true });
const fileText = (suffix) => Object.entries(RAW).find(([p]) => p.endsWith(suffix))?.[1] || '';

/** Bullet lines ("- …") under the markdown heading that matches `re`, until the next heading. */
function bulletsUnder(md, re) {
  const out = [];
  let on = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(line)) { on = re.test(line); continue; }
    if (on && /^\s*[-*]\s+/.test(line)) out.push(line.replace(/^\s*[-*]\s+/, '').trim());
  }
  return out;
}
/** Every non-heading, non-empty line of a markdown file (for the character pack licence, whatever its layout). */
function plainLines(md) {
  return md.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^#{1,6}\s/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));
}

/** The line verbatim, with its URLs made clickable (text content unchanged). Backticks are dropped. */
function lineEl(text) {
  const clean = text.replace(/`/g, '');
  const parts = clean.split(/(https?:\/\/[^\s)]+)/);
  return h('li', { dir: 'ltr', lang: 'en' }, parts.map((p) => {
    const href = /^https?:\/\//.test(p) ? safeUrl(p) : null;
    return href ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, p) : p;
  }));
}

export function creditsData() {
  const main = fileText('/public/assets/LICENSES.md');
  const chars = fileText('/public/assets/characters/LICENSES.md');
  return {
    ccby: bulletsUnder(main, /attribution|CC-BY/i),
    characters: chars ? plainLines(chars) : []
  };
}

/** Credits modal. Resolves when closed. */
export function creditsScreen() {
  return new Promise((resolve) => {
    const d = creditsData();
    const m = openModal({ className: 'credits', label: t('creditsTitle'), dismissible: true, onClose: () => resolve() });
    setContent(m, [
      h('p', { class: 'eyebrow' }, t('gameTitle')),
      h('h2', {}, t('creditsTitle')),
      h('p', {}, t('creditsIntro')),
      d.ccby.length ? h('section', { class: 'credits-sec' }, h('h3', {}, t('creditsCcBy')), h('ul', { class: 'credits-list' }, d.ccby.map(lineEl))) : null,
      d.characters.length ? h('section', { class: 'credits-sec' }, h('h3', {}, t('creditsCharacters')), h('ul', { class: 'credits-list' }, d.characters.map(lineEl))) : null,
      h('section', { class: 'credits-sec' }, h('h3', {}, t('creditsCc0Title')), h('p', {}, t('creditsCc0'))),
      h('section', { class: 'credits-sec' }, h('h3', {}, t('creditsFontsTitle')), h('p', {}, t('creditsFonts'))),
      h('div', { class: 'row end' }, btn(t('close'), () => m.close(), 'primary', { 'data-autofocus': true }))
    ]);
  });
}
