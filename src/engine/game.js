// Game controller: boot, screens, location sequence, exploration loop, situations, summary.
import * as THREE from 'three';
import { createWorld } from './world.js';
import { createMats } from './mats.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createSceneManager, countStats } from './sceneManager.js';
import { createHud } from './ui/hud.js';
import { setUiRoot, toast } from './ui/overlay.js';
import { startScreen, introScreen, locationIntro, outroScreen, exitConfirm, menuScreen, summaryScreen } from './ui/screens.js';
import { runSituation, revisitMenu, showRulingOnly } from './ui/situation.js';
import { getScript, nextLocation, allSituations, contentIssues, usingFixtures } from './content.js';
import { loadProgress, progress, setLocation, isDone, totalScore, resetProgress, setLangPref, setFlag } from './progress.js';
import { LOCATIONS, LOCATION_TITLES } from './config.js';
import { setLang, getLang, tr, t } from './i18n.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';
const ALLOW_EARLY_EXIT = params.get('freeexit') === '1'; // testing aid: leave a location before finishing it

export async function startGame() {
  const canvas = document.getElementById('stage');
  const ui = document.getElementById('ui');
  const fadeEl = document.getElementById('fade');
  setUiRoot(ui);
  loadProgress();
  setLang(params.get('lang') || progress().lang || 'ar');

  const world = createWorld(canvas);
  const mats = createMats();
  const input = createInput(canvas, ui);
  const player = createPlayer(world, input);
  const scenes = createSceneManager(world, mats);
  let mode = 'boot'; // boot | attract | play | ui | loading
  let menu = null;
  let near = null; // hotspot object or exit currently in range
  const TOTAL = allSituations().length;

  const hud = createHud(ui, { onMenu: () => openMenu() });
  input.state.onMenu = () => { if (mode === 'play') openMenu(); };
  input.state.onInteract = () => { if (mode === 'play') interact(); };

  const doneCount = () => allSituations().filter((s) => isDone(s.key)).length;
  function refreshHud() {
    const loc = scenes.active?.location;
    const s = loc ? getScript(loc) : null;
    hud.set({ title: s?.title || LOCATION_TITLES[loc], time: s?.time_of_day || '', score: totalScore(), done: doneCount(), total: TOTAL });
  }

  function setMode(m) {
    mode = m;
    const playing = m === 'play';
    input.setEnabled(playing);
    hud.show(playing || m === 'ui');
    if (!playing) { hud.setPrompt(null); input.setInteractVisible(false); }
  }

  const fade = (on) => new Promise((r) => { fadeEl.classList.toggle('on', on); setTimeout(r, on ? 380 : 50); });

  // ------------------------------------------------------------ locations
  async function enterLocation(loc, { intro = true } = {}) {
    if (!LOCATIONS.includes(loc)) loc = LOCATIONS[0];
    setMode('loading');
    near = null;
    await fade(true);
    const script = getScript(loc);
    const warns = [];
    const active = await scenes.load(loc, script, (m) => warns.push(m));
    player.setColliders(active.colliders, active.bounds);
    player.setCameraOccluders(active.occluders);
    player.teleport(active.spawn.position, active.spawn.yaw);
    setLocation(loc);
    refreshHud();
    updateMarkers();
    if (DEBUG) {
      warns.forEach((w) => toast(`⚠ ${w}`, 6000, 'warn'));
      console.info(`[scene:${loc}]`, active.isPlaceholder ? 'placeholder' : 'scene file', countStats(active.root));
    } else if (warns.length && !active.isPlaceholder) {
      console.warn(`[scene:${loc}] ${warns.length} warning(s); open with ?debug=1 to see them as toasts`);
    }
    document.body.classList.add('ready');
    await fade(false);
    if (intro) { setMode('ui'); await locationIntro(loc); }
    setMode('play');
  }

  // ------------------------------------------------------------ interaction
  function sitsAt(hsId) { return (getScript(scenes.active.location)?.situations || []).filter((s) => s.hotspot === hsId); }

  async function interact() {
    const a = scenes.active; if (!a || !near) return;
    if (near === a.exit) return tryExit();
    const sits = sitsAt(near.id);
    if (!sits.length) return;
    const script = getScript(a.location);
    const pending = sits.find((s) => !isDone(s.key));
    const wasComplete = locationComplete(a.location);
    setMode('ui');
    const npc = a.npcs[(pending || sits[0]).npc?.id];
    const restoreYaw = npc?.rotation.y;
    if (npc) {
      npc.rotation.y = Math.atan2(-(player.pos.x - npc.position.x), -(player.pos.z - npc.position.z));
      player.faceTowards([npc.position.x, 0, npc.position.z]);
    }
    try {
      const onPoints = () => { refreshHud(); hud.bump(); };
      if (pending) {
        await runSituation(pending, { script, onPoints });
      } else {
        const sit = sits[sits.length - 1];
        const choice = await revisitMenu(sit);
        if (choice === 'retry') await runSituation(sit, { script, onPoints, startAt: 'choices' });
        else if (choice === 'review') await showRulingOnly(sit);
      }
    } catch (e) {
      console.error('[situation] flow error', e);
      toast(String(e.message || e), 5000, 'warn');
    } finally {
      if (npc) npc.rotation.y = restoreYaw;
      refreshHud();
      updateMarkers();
      setMode('play');
      if (!wasComplete && locationComplete(a.location)) toast(t('exitReady'), 3500);
    }
  }

  function locationComplete(loc) { return (getScript(loc)?.situations || []).every((x) => isDone(x.key)); }

  function updateMarkers() {
    const a = scenes.active; if (!a) return;
    for (const hs of a.hotspots) {
      if (!hs.marker) continue;
      const all = sitsAt(hs.id);
      hs.marker.setColor(all.length && all.every((s) => isDone(s.key)) ? '#7ddc8a' : '#ffd34d');
    }
    a.exit.marker.setColor(locationComplete(a.location) || ALLOW_EARLY_EXIT ? '#6fe3c1' : '#7d8b8c');
  }

  async function tryExit() {
    const loc = scenes.active.location;
    const next = nextLocation(loc);
    const s = getScript(loc);
    const left = (s?.situations || []).filter((x) => !isDone(x.key));
    if (left.length && !ALLOW_EARLY_EXIT) {
      // exit opens only after every situation here is done (docs/hotspots.md); the menu still allows jumping.
      toast(t('exitLocked'), 2600);
      return;
    }
    setMode('ui');
    if (left.length) {
      const r = await exitConfirm(loc);
      if (r !== 'go') return setMode('play');
    }
    const r = await outroScreen(loc, next);
    if (r !== 'go') return setMode('play');
    if (next) await enterLocation(next);
    else await showSummary();
  }

  async function showSummary() {
    setMode('ui');
    setFlag('finished', true);
    const r = await summaryScreen();
    if (r === 'again') { resetProgress(); await enterLocation(LOCATIONS[0]); }
    else setMode('play');
  }

  function openMenu() {
    if (menu && document.contains(menu.el)) return;
    setMode('ui');
    menu = menuScreen({
      onClose: () => { menu = null; if (mode === 'ui') setMode('play'); },
      onJump: (loc) => enterLocation(loc),
      onLang: () => { setLang(getLang() === 'ar' ? 'en' : 'ar'); setLangPref(getLang()); refreshHud(); near = null; },
      onSummary: () => showSummary(),
      onRestart: () => { resetProgress(); enterLocation(LOCATIONS[0]); }
    });
  }

  // ------------------------------------------------------------ frame loop
  world.onTick((dt, time) => {
    const a = scenes.active;
    if (mode === 'play') {
      player.update(dt, time);
      // proximity
      let best = null, bestD = Infinity;
      if (a) {
        for (const hs of a.hotspots) {
          if (!hs.active) continue;
          const d = Math.hypot(player.pos.x - hs.position[0], player.pos.z - hs.position[2]);
          if (d < hs.radius && d < bestD) { best = hs; bestD = d; }
        }
        const de = Math.hypot(player.pos.x - a.exit.position[0], player.pos.z - a.exit.position[2]);
        if (de < a.exit.radius && de < bestD) best = a.exit;
      }
      if (best !== near) {
        near = best;
        if (!near) { hud.setPrompt(null); input.setInteractVisible(false); }
        else {
          let label;
          if (near === a.exit) label = !locationComplete(a.location) && !ALLOW_EARLY_EXIT ? t('exitLocked') : nextLocation(a.location) ? `${t('exitDoor')}: ${tr(getScript(nextLocation(a.location))?.title)}` : t('finishDay');
          else {
            const s = sitsAt(near.id);
            const sit = s.find((x) => !isDone(x.key)) || s[0];
            label = tr(near.label) || tr(sit?.npc?.name) || t('interact');
            if (s.length && s.every((x) => isDone(x.key))) label += ' ✓';
          }
          hud.setPrompt(label);
          input.setInteractVisible(true, label);
        }
      }
    } else if (mode === 'attract' && a) {
      const r = 9, ang = time * 0.08;
      world.camera.position.set(a.spawn.position[0] + Math.sin(ang) * r, 5.5, a.spawn.position[2] + Math.cos(ang) * r);
      world.camera.lookAt(a.spawn.position[0], 1.2, a.spawn.position[2]);
    }
    if (a) { a.update(dt, time, near); world.followShadow(mode === 'attract' ? new THREE.Vector3(...a.spawn.position) : player.pos); }
  });

  // ------------------------------------------------------------ debug / test API
  const api = {
    world, scenes, player, progress, THREE,
    goto: (loc) => enterLocation(loc, { intro: false }),
    teleport: (hotspotId) => {
      const a = scenes.active; const hs = a?.hotspots.find((x) => x.id === hotspotId) || (hotspotId === 'exit' ? a?.exit : null);
      if (hs) player.teleport([hs.position[0], 0, hs.position[2] + 0.01], player.yaw);
      return !!hs;
    },
    interact: () => interact(),
    /** Free camera for inspecting a scene: yawmuk.inspect([x,y,z] camera, [x,y,z] target). yawmuk.resume() to play. */
    inspect: (from, to = [0, 1, 0]) => { setMode('inspect'); world.camera.position.set(...from); world.camera.lookAt(...to); },
    resume: () => setMode('play'),
    get mode() { return mode; },
    get near() { return near?.id || (near ? 'exit' : null); },
    stats: () => scenes.active && countStats(scenes.active.root),
    contentIssues, usingFixtures
  };
  window.yawmuk = api;

  // ------------------------------------------------------------ boot sequence
  const jump = params.get('scene');
  if (jump && LOCATIONS.includes(jump)) {
    if (!params.get('lang') && !progress().lang) setLang('ar');
    setFlag('introSeen', true);
    await enterLocation(jump, { intro: params.get('nointro') !== '1' });
    return api;
  }
  // attract mode: show the current/first location behind the start screen
  const bootLoc = progress().location && LOCATIONS.includes(progress().location) ? progress().location : LOCATIONS[0];
  const active = await scenes.load(bootLoc, getScript(bootLoc), () => {});
  player.setColliders(active.colliders, active.bounds);
  player.teleport(active.spawn.position, active.spawn.yaw);
  setMode('attract');
  document.body.classList.add('ready');
  const choice = await startScreen();
  setLangPref(choice.lang);
  if (choice.mode === 'new') {
    resetProgress();
    setLangPref(choice.lang);
    await introScreen();
    setFlag('introSeen', true);
    await enterLocation(LOCATIONS[0]);
  } else {
    if (!progress().introSeen) { await introScreen(); setFlag('introSeen', true); }
    await enterLocation(bootLoc);
  }
  return api;
}
