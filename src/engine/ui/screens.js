// Full-screen and modal screens: start, intro/disclaimer, location intro/outro, exit confirm, menu, summary.
import { h, link } from '../dom.js';
import { t, tr, getLang, setLang, STRINGS } from '../i18n.js';
import { LOCATIONS, LOCATION_TITLES, CATALOG, CHECK_BONUS, THEMES } from '../config.js';
import { getScript, getRuling, allSituations, uiStrings } from '../content.js';
import { progress, isDone, totalScore, hasSave, sitRecord } from '../progress.js';
import { openModal, setContent, btn, tilt } from './overlay.js';
import { verdictBadge, statusBadge } from './rulingCard.js';
import { applyExtraUi } from './strings.js';
import { hideLoader } from './loading.js';
import { creditsScreen } from './credits.js';

applyExtraUi(uiStrings);

const p = (text, cls) => (text ? h('p', { class: cls || '' }, text) : null);

/** Start screen. Resolves { lang, mode: 'new'|'continue' }. */
export function startScreen() {
  return new Promise((resolve) => {
    hideLoader();
    const m = openModal({ variant: 'screen', className: 'start', label: 'Yawmuk' });
    m.el.classList.add('overlay-start');
    const render = () => {
      const lang = getLang();
      const langBtn = (l, label) => h('button', { type: 'button', class: `lang-btn${lang === l ? ' active' : ''}`, 'aria-pressed': lang === l ? 'true' : 'false', lang: l, onclick: () => { setLang(l); render(); } }, label);
      setContent(m, [
        h('div', { class: 'start-inner' },
          h('div', { class: 'lockup' },
            h('div', { class: 'emblem', 'aria-hidden': 'true' }, h('span', { class: 'emblem-star' }), h('span', { class: 'emblem-star inner' }), h('span', { class: 'emblem-dot' })),
            h('h1', { class: 'title' }, h('span', { class: 'title-ar', lang: 'ar' }, 'يومك'), h('span', { class: 'title-en', lang: 'en' }, 'Yawmuk'))),
          h('p', { class: 'tagline' }, t('tagline')),
          tilt(h('div', { class: 'start-card' },
            h('div', { class: 'lang-pick', role: 'group', 'aria-label': t('chooseLang') }, langBtn('ar', 'العربية'), langBtn('en', 'English')),
            h('div', { class: 'stack' },
              hasSave() ? btn(t('continue'), () => { m.close(); resolve({ lang: getLang(), mode: 'continue' }); }, 'primary big', { 'data-autofocus': true }) : null,
              btn(t('newGame'), () => { m.close(); resolve({ lang: getLang(), mode: 'new' }); }, hasSave() ? 'ghost big' : 'primary big', hasSave() ? {} : { 'data-autofocus': true }))), 2),
          h('p', { class: 'fine' }, statusBadge('ai_draft')),
          h('button', { type: 'button', class: 'credits-link', onclick: () => creditsScreen() }, t('creditsTitle')))
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
    const idx = LOCATIONS.indexOf(loc);
    setContent(m, [
      h('div', { class: 'stop-row' },
        h('p', { class: 'eyebrow' }, `${t('stopOf')} ${idx + 1}/${LOCATIONS.length}`),
        s?.time_of_day ? h('span', { class: 'time-chip' }, h('span', { class: 'clock', 'aria-hidden': 'true' }), h('bdi', {}, s.time_of_day)) : null),
      h('ol', { class: 'stops', 'aria-hidden': 'true' }, LOCATIONS.map((l, j) => h('li', { class: j < idx ? 'past' : j === idx ? 'now' : '' }))),
      h('h2', { class: 'loc-title' }, tr(s?.title || LOCATION_TITLES[loc])),
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
        btn(allSituations().every((s) => isDone(s.key)) ? t('summaryTitle') : t('progressTitle'), () => { m.close(); handlers.onSummary(); }, 'ghost'),
        btn(t('creditsTitle'), () => creditsScreen(), 'ghost credits-btn'),
        btn(t('restart'), () => { if (confirm(t('confirmRestart'))) { m.close(); handlers.onRestart(); } }, 'danger'))
    ]);
  };
  render();
  return m;
}

const titleOf = (s) => tr(getRuling(s.ruling_id)?.title) || tr(CATALOG.find((c) => c.id === s.ruling_id)?.title) || s.ruling_id;

/** What Adam learned: completed topics, each with its "in plain words" line when the ruling has one. */
function learnedList(done) {
  if (!done.length) return p(t('nothingYet'), 'muted');
  return h('ul', { class: 'topics' }, done.map((s) => {
    const r = getRuling(s.ruling_id);
    const plain = tr(r?.newcomer_explainer);
    const first = typeof plain === 'string' ? (plain.match(/^[^.!?؟۔]+[.!?؟۔]?/) || [plain])[0] : '';
    return h('li', { class: 'done' },
      h('span', { class: 'check', 'aria-hidden': 'true' }, '✓'),
      h('span', { class: 'topic-title' }, titleOf(s), first ? h('small', { class: 'topic-plain' }, first) : null),
      verdictBadge(r?.verdict || 'unknown'));
  }));
}

/** Suggest the next topic: an unfinished situation in the theme the player explored most; else any unfinished one. */
export function suggestNext(sits) {
  const todo = sits.filter((s) => !isDone(s.key));
  if (!todo.length) return null;
  const themes = Object.entries(THEMES).map(([k, th]) => ({ k, th, done: th.ids.filter((id) => sits.some((s) => s.ruling_id === id && isDone(s.key))).length }));
  themes.sort((a, b) => b.done - a.done);
  for (const { k, th } of themes) {
    const pick = todo.find((s) => th.ids.includes(s.ruling_id));
    if (pick) return { sit: pick, theme: k };
  }
  return { sit: todo[0], theme: null };
}

/** Index into ui_strings end.next_topics suggested by the theme the player explored most. */
export function suggestTopicIndex(sits, count) {
  if (!count) return -1;
  const scores = Object.values(THEMES).map((th) => ({ th, n: th.ids.filter((id) => sits.some((s) => s.ruling_id === id && isDone(s.key))).length }));
  scores.sort((x, y) => y.n - x.n);
  const idx = scores[0]?.n ? scores[0].th.nextTopic ?? 0 : 0;
  return Math.min(idx, count - 1);
}

function nextTopicBlock(sits, onGo) {
  const topics = t('nextTopics');
  const list = Array.isArray(topics) ? topics.filter(Boolean) : [];
  const i = suggestTopicIndex(sits, list.length);
  const sug = suggestNext(sits); // an unexplored situation still in the game, if any
  return h('div', { class: 'notice next-topic' },
    h('h3', {}, t('nextTopic')),
    i >= 0 ? h('p', { class: 'next-title' }, list[i]) : null,
    sug ? h('div', { class: 'still' },
      h('p', { class: 'muted' }, t('stillToExplore')),
      h('p', { class: 'next-title' }, titleOf(sug.sit), ' ', h('span', { class: 'muted' }, `(${tr(getScript(sug.sit.location)?.title || LOCATION_TITLES[sug.sit.location])})`)),
      h('div', { class: 'row' }, btn(t('goThereNow'), () => onGo(sug.sit.location), 'ghost'))) : (i < 0 ? p(t('nextTopicAllDone')) : null));
}

/** Referral to a local mosque / Islamic center. The search link carries only a generic query — no player data. */
function referralBlock() {
  const q = encodeURIComponent(String(t('referralQuery') || 'mosque near me'));
  return h('div', { class: 'notice learn-more' }, h('h3', {}, t('learnMoreTitle')), p(t('learnMoreBody')),
    h('div', { class: 'row' }, link(`https://www.google.com/maps/search/${q}`, t('referralButton'))));
}

/** Final summary. Resolves 'again' | 'back' | 'goto:<location>'. Stores/asks nothing about the player's beliefs.
 * Before all situations are done it is a "progress so far" view (no end-of-week title, no score verdict). */
export function summaryScreen() {
  const sits = allSituations();
  const done = sits.filter((s) => isDone(s.key));
  const final = sits.length > 0 && done.length === sits.length;
  const max = sits.reduce((a, s) => a + Math.max(0, ...(s.choices || []).map((c) => c.points || 0)) + (s.check_question ? CHECK_BONUS : 0), 0);
  return new Promise((resolve) => {
    const m = openModal({ variant: 'screen', className: 'summary', label: final ? t('summaryTitle') : t('progressTitle'), onClose: (r) => resolve(r ?? 'back') });
    setContent(m, [h('div', { class: 'summary-inner' },
      h('p', { class: 'eyebrow' }, t('gameTitle')),
      h('h1', {}, final ? t('summaryTitle') : t('progressTitle')),
      p(final ? (STRINGS.endMessage ? t('endMessage') : null) : t('progressMessage'), 'lead'),
      p(final && STRINGS.tier_high ? t(max && totalScore() / max >= 0.75 ? 'tier_high' : max && totalScore() / max >= 0.45 ? 'tier_mid' : 'tier_low') : null, 'tier'),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, `${totalScore()}`), h('span', { class: 'muted' }, `${final ? t('finalScore') : t('progressScore')} (${t('of')} ${max})`)),
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, `${done.length}/${sits.length}`), h('span', { class: 'muted' }, t('completed'))),
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, String(sits.filter((s) => { const r = sitRecord(s.key); const best = (s.choices || []).find((c) => c.quality === 'best'); return r && best && r.tried.includes(best.id) && r.best >= best.points; }).length)), h('span', { class: 'muted' }, t('bestChoices'))),
        h('div', { class: 'stat' }, h('span', { class: 'big-num' }, String(sits.filter((s) => sitRecord(s.key)?.check === true).length)), h('span', { class: 'muted' }, t('correctChecks')))),
      h('h2', {}, t('adamLearned')),
      Array.isArray(t('summaryPoints')) && t('summaryPoints').length ? h('ul', { class: 'rc-list learned-points' }, t('summaryPoints').map((x) => h('li', {}, x))) : null,
      learnedList(done),
      nextTopicBlock(sits, (loc) => m.close(`goto:${loc}`)),
      referralBlock(),
      h('div', { class: 'notice scholar' }, h('h3', {}, t('aboutRulings')), p(t('scholarNote')), p(t('disc_ai'), 'muted')),
      h('div', { class: 'row center wrap' },
        btn(t('backToGame'), () => m.close('back'), 'ghost'),
        btn(t('playAgain'), () => m.close('again'), 'primary', { 'data-autofocus': true })))]);
  });
}
