// Full-screen and modal screens: start, intro/disclaimer, location intro/outro, exit confirm, menu, summary.
import { h } from '../dom.js';
import { t, tr, getLang, setLang, STRINGS } from '../i18n.js';
import { LOCATIONS, LOCATION_TITLES, CATALOG, CHECK_BONUS } from '../config.js';
import { getScript, getRuling, allSituations } from '../content.js';
import { progress, isDone, totalScore, hasSave, sitRecord } from '../progress.js';
import { openModal, setContent, btn } from './overlay.js';
import { verdictBadge } from './rulingCard.js';

const p = (text, cls) => (text ? h('p', { class: cls || '' }, text) : null);

/** Start screen. Resolves { lang, mode: 'new'|'continue' }. */
export function startScreen() {
  return new Promise((resolve) => {
    const m = openModal({ variant: 'screen', className: 'start', label: 'Yawmuk' });
    const render = () => {
      const lang = getLang();
      const langBtn = (l, label) => h('button', { type: 'button', class: `lang-btn${lang === l ? ' active' : ''}`, 'aria-pressed': lang === l ? 'true' : 'false', lang: l, onclick: () => { setLang(l); render(); } }, label);
      setContent(m, [
        h('div', { class: 'start-inner' },
          h('div', { class: 'logo', 'aria-hidden': 'true' }, '☾'),
          h('h1', { class: 'title' }, h('span', { lang: 'ar' }, 'يومك'), h('span', { class: 'title-en', lang: 'en' }, 'Yawmuk')),
          h('p', { class: 'tagline' }, t('tagline')),
          h('div', { class: 'lang-pick', role: 'group', 'aria-label': t('chooseLang') }, langBtn('ar', 'العربية'), langBtn('en', 'English')),
          h('div', { class: 'stack' },
            hasSave() ? btn(t('continue'), () => { m.close(); resolve({ lang: getLang(), mode: 'continue' }); }, 'primary big', { 'data-autofocus': true }) : null,
            btn(t('newGame'), () => { m.close(); resolve({ lang: getLang(), mode: 'new' }); }, hasSave() ? 'ghost big' : 'primary big', hasSave() ? {} : { 'data-autofocus': true })),
          h('p', { class: 'fine' }, t('status_ai_draft')))
      ]);
    };
    render();
  });
}

const asList = (v) => (Array.isArray(v) && v.length ? h('ul', { class: 'rc-list' }, v.map((x) => h('li', {}, x))) : typeof v === 'string' && v ? h('p', {}, v) : null);
const isTouch = () => document.body.classList.contains('touch');

/** Intro + how to play + the disclaimers (fiction, AI review, general info, disagreement). */
export function introScreen() {
  return new Promise((resolve) => {
    const m = openModal({ className: 'intro', label: t('introTitle'), onClose: resolve });
    setContent(m, [
      h('p', { class: 'eyebrow' }, t('gameTitle')),
      h('h2', {}, t('introTitle')),
      p(t('introBody')),
      asList(t('howFlow')),
      h('div', { class: 'notice' }, h('h3', {}, t('disclaimerTitle')),
        h('ul', { class: 'rc-list' }, ['disc_fiction', 'disc_ai', 'disc_general', 'disc_disagreement'].map((k) => (k in STRINGS ? h('li', {}, t(k)) : null)))),
      h('div', { class: 'controls-help' }, h('h3', {}, t('controlsTitle')), asList(isTouch() ? t('ctrlMobile') : t('ctrlDesktop')) || p(t('controlsBody'))),
      h('div', { class: 'row end' }, btn(STRINGS.discAccept ? t('discAccept') : t('iUnderstand'), () => m.close(), 'primary', { 'data-autofocus': true }))
    ]);
  });
}

export function locationIntro(loc) {
  const s = getScript(loc);
  return new Promise((resolve) => {
    const m = openModal({ className: 'loc-intro', label: tr(s?.title || LOCATION_TITLES[loc]), onClose: resolve, dismissible: true });
    const n = s?.situations?.length || 0;
    setContent(m, [
      h('p', { class: 'eyebrow' }, `${t('time')} ${s?.time_of_day || ''}`),
      h('h2', {}, tr(s?.title || LOCATION_TITLES[loc])),
      s?._fixture ? h('span', { class: 'badge fixture' }, t('fixtureBadge')) : null,
      p(tr(s?.intro)),
      n ? h('p', { class: 'muted' }, `${t('done')}: ${s.situations.filter((x) => isDone(x.key)).length}/${n}`) : p(t('noSituations'), 'muted'),
      h('div', { class: 'row end' }, btn(t('startExploring'), () => m.close(), 'primary', { 'data-autofocus': true }))
    ]);
  });
}

export function outroScreen(loc, nextLoc) {
  const s = getScript(loc);
  return new Promise((resolve) => {
    const m = openModal({ className: 'loc-intro', label: tr(s?.title), onClose: (r) => resolve(r ?? 'stay'), dismissible: true });
    setContent(m, [
      h('p', { class: 'eyebrow' }, tr(s?.title || LOCATION_TITLES[loc])),
      p(tr(s?.outro)),
      h('div', { class: 'row end wrap' },
        btn(t('stay'), () => m.close('stay'), 'ghost'),
        btn(nextLoc ? `${t('exitDoor')}: ${tr(getScript(nextLoc)?.title || LOCATION_TITLES[nextLoc])} ${getLang() === 'ar' ? '‹' : '›'}` : t('finishDay'), () => m.close('go'), 'primary', { 'data-autofocus': true }))
    ]);
  });
}

/** Exit with unfinished situations. Resolves 'go' | 'stay'. */
export function exitConfirm(loc) {
  const s = getScript(loc);
  const left = (s?.situations || []).filter((x) => !isDone(x.key));
  return new Promise((resolve) => {
    const m = openModal({ className: 'small', label: t('remaining'), dismissible: true, onClose: (r) => resolve(r ?? 'stay') });
    setContent(m, [
      h('h2', {}, t('remaining')),
      h('ul', { class: 'rc-list' }, left.map((x) => h('li', {}, tr(getRuling(x.ruling_id)?.title) || tr(CATALOG.find((c) => c.id === x.ruling_id)?.title) || x.ruling_id))),
      h('div', { class: 'row end wrap' }, btn(t('leaveAnyway'), () => m.close('go'), 'ghost'), btn(t('stay'), () => m.close('stay'), 'primary', { 'data-autofocus': true }))
    ]);
  });
}

/** Pause menu. handlers: { onJump(loc), onRestart(), onLang(), onSummary() } */
export function menuScreen(handlers) {
  const m = openModal({ className: 'menu', label: t('menu'), dismissible: true, onClose: handlers.onClose });
  const render = () => {
    const rows = LOCATIONS.map((loc) => {
      const s = getScript(loc);
      const sits = s?.situations || [];
      const d = sits.filter((x) => isDone(x.key)).length;
      return h('li', {},
        btn(h('span', { class: 'loc-row' }, h('span', {}, tr(s?.title || LOCATION_TITLES[loc])), h('span', { class: 'muted' }, `${s?.time_of_day || ''} · ${d}/${sits.length}${d === sits.length && sits.length ? ' ✓' : ''}`)),
          () => { m.close(); handlers.onJump(loc); }, `loc-btn${progress().location === loc ? ' current' : ''}`));
    });
    setContent(m, [
      h('h2', {}, t('menu')),
      h('div', { class: 'stack' },
        btn(t('resume'), () => m.close(), 'primary', { 'data-autofocus': true }),
        btn(t('language'), () => { handlers.onLang(); render(); }, 'ghost', { lang: getLang() === 'ar' ? 'en' : 'ar' })),
      h('h3', {}, t('locations')),
      h('ul', { class: 'loc-list' }, rows),
      h('div', { class: 'stack' },
        btn(t('summaryTitle'), () => { m.close(); handlers.onSummary(); }, 'ghost'),
        btn(t('restart'), () => { if (confirm(t('confirmRestart'))) { m.close(); handlers.onRestart(); } }, 'danger'))
    ]);
  };
  render();
  return m;
}

/** Final summary. Resolves 'again' | 'back'. */
export function summaryScreen() {
  const sits = allSituations();
  const done = sits.filter((s) => isDone(s.key));
  const max = sits.reduce((a, s) => a + Math.max(0, ...(s.choices || []).map((c) => c.points || 0)) + (s.check_question ? CHECK_BONUS : 0), 0);
  return new Promise((resolve) => {
    const m = openModal({ variant: 'screen', className: 'summary', label: t('summaryTitle'), onClose: (r) => resolve(r ?? 'back') });
    setContent(m, [h('div', { class: 'summary-inner' },
      h('p', { class: 'eyebrow' }, t('gameTitle')),
      h('h1', {}, t('summaryTitle')),
      p(STRINGS.endMessage ? t('endMessage') : null, 'lead'),
      p(STRINGS.tier_high ? t(max && totalScore() / max >= 0.75 ? 'tier_high' : max && totalScore() / max >= 0.45 ? 'tier_mid' : 'tier_low') : null, 'tier'),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, `${totalScore()}`), h('span', { class: 'muted' }, `${t('finalScore')} (${t('of')} ${max})`)),
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, `${done.length}/${sits.length}`), h('span', { class: 'muted' }, t('completed'))),
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, String(sits.filter((s) => { const r = sitRecord(s.key); const best = (s.choices || []).find((c) => c.quality === 'best'); return r && best && r.tried.includes(best.id) && r.best >= best.points; }).length)), h('span', { class: 'muted' }, t('bestChoices'))),
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, String(sits.filter((s) => sitRecord(s.key)?.check === true).length)), h('span', { class: 'muted' }, t('correctChecks')))),
      h('h2', {}, t('topicsLearned')),
      h('ul', { class: 'topics' }, sits.map((s) => {
        const r = getRuling(s.ruling_id);
        const title = tr(r?.title) || tr(CATALOG.find((c) => c.id === s.ruling_id)?.title) || s.ruling_id;
        return h('li', { class: isDone(s.key) ? 'done' : 'todo' },
          h('span', { class: 'check', 'aria-hidden': 'true' }, isDone(s.key) ? '✓' : '○'),
          h('span', { class: 'topic-title' }, title),
          verdictBadge(r?.verdict || 'unknown'));
      })),
      h('div', { class: 'notice scholar' }, h('h3', {}, t('referScholar')), p(t('scholarNote')), p(t('disc_ai'), 'muted')),
      h('div', { class: 'row center wrap' },
        btn(t('backToGame'), () => m.close('back'), 'ghost'),
        btn(t('playAgain'), () => m.close('again'), 'primary', { 'data-autofocus': true })))]);
  });
}
