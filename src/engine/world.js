// Renderer, camera, lighting presets (HDRI image-based lighting + sun), post-processing, quality tiers, frame loop.
//
// Quality tiers (auto-detected; override with ?quality=low|medium|high or world.setQuality(tier), persisted):
//   low    — phones / software GPUs: no post-processing (renderer tone mapping + native MSAA), shadow map 1024,
//            pixel ratio ≤ 1.5, simple environment
//   medium — integrated GPUs: half-resolution N8AO, bloom, SMAA, shadow map 2048, pixel ratio ≤ 1.5
//   high   — discrete GPUs: full N8AO, bloom, SMAA, vignette, shadow map 2048 (PCF soft), pixel ratio ≤ 2
//   medium/high also get the "miniature" tilt-shift blur and a warm split-tone grade (golden-hour key art).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  EffectComposer, RenderPass, EffectPass, CopyPass, BloomEffect, SMAAEffect, SMAAPreset, VignetteEffect,
  ToneMappingEffect, ToneMappingMode, HueSaturationEffect, BrightnessContrastEffect, TiltShiftEffect, KernelSize,
  Effect, BlendFunction
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { loadEnvironment } from './assets.js';
import { events } from './events.js';
import { GOLDEN } from './goldenSky.js';

// Sky/fog colours, sun and image-based lighting per preset. `hdri` = catalog id of the environment map
// (public/assets/env/hdri); `env` = its intensity. Scenes can override the HDRI with `environment` in build().
export const LIGHT_PRESETS = {
  day: { bg: '#bfe0f2', fog: '#cfe6f2', fogNear: 35, fogFar: 110, hemiSky: '#e8f3ff', hemiGround: '#7a6a55', hemi: 0.25, sun: '#fff2dc', sunI: 2.4, sunDir: [0.55, 1, 0.35], exposure: 0.92, hdri: 'hdri_snow_day', env: 0.5 },
  evening: { bg: '#e9a873', fog: '#d99a72', fogNear: 28, fogFar: 95, hemiSky: '#ffd3a8', hemiGround: '#4b3a4a', hemi: 0.25, sun: '#ff9a5a', sunI: 2.0, sunDir: [0.9, 0.42, 0.25], exposure: 0.95, hdri: 'hdri_suburb_dusk', env: 0.5 },
  // golden hour (the key art): low warm sun from one side -> long shadows, peach haze, olive bounce light.
  // Default for every scene via config.LIGHTING; shadowHalf widens the shadow frustum for the long shadows.
  golden: { bg: GOLDEN.horizon, fog: GOLDEN.horizon, fogNear: 42, fogFar: 160, hemiSky: '#ffcf9a', hemiGround: '#4c5a2a', hemi: 0.3, sun: '#ffb26b', sunI: 3.5, sunDir: GOLDEN.sunDir, exposure: 0.92, hdri: 'hdri_suburb_dusk', env: 0.42, shadowHalf: 20 },
  night: { bg: '#0e1630', fog: '#121b36', fogNear: 20, fogFar: 75, hemiSky: '#5a6c9e', hemiGround: '#151824', hemi: 0.3, sun: '#a9bcff', sunI: 0.8, sunDir: [-0.4, 1, 0.3], exposure: 1.1, hdri: 'hdri_city_night', env: 0.55 }
};
/** Named environments scenes may request with `environment: { hdri: 'studio' }` (or any catalog id/path). */
export const HDRIS = { snow_day: 'hdri_snow_day', suburb_day: 'hdri_suburb_day', suburb_dusk: 'hdri_suburb_dusk', city_night: 'hdri_city_night', ballroom: 'hdri_ballroom', studio: 'hdri_studio' };

/** Layer for world labels: drawn after tone mapping/bloom so their colours stay crisp (still depth-tested). */
export const OVERLAY_LAYER = 1;

export const QUALITY_TIERS = {
  low: { post: false, ao: false, bloom: false, shadow: 1024, pixelRatio: 1.25, smaa: false, lightCharacters: true },
  medium: { post: true, ao: 'half', bloom: true, shadow: 2048, pixelRatio: 1.5, smaa: true },
  high: { post: true, ao: 'full', bloom: true, shadow: 2048, pixelRatio: 2, smaa: true, vignette: true, tiltShift: 'medium' }
};
QUALITY_TIERS.medium.tiltShift = 'small';

/** Warm split-tone grade (after tone mapping): cool-violet shadows, honey highlights — no LUT file needed. */
class WarmGradeEffect extends Effect {
  constructor({ amount = 1 } = {}) {
    super('WarmGradeEffect', `
uniform float amount;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = mix(vec3(0.95, 0.94, 1.05), vec3(1.06, 1.0, 0.9), smoothstep(0.08, 0.7, l));
  outputColor = vec4(mix(c, c * tint, amount), inputColor.a);
}`, { blendFunction: BlendFunction.NORMAL, uniforms: new Map([['amount', new THREE.Uniform(amount)]]) });
  }
}
const QKEY = 'yawmuk.quality';

function detectTier(renderer, isMobile) {
  if (isMobile) return 'low';
  let gpu = '';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch { /* ignore */ }
  if (/swiftshader|llvmpipe|software|basic render|mesa offscreen/i.test(gpu)) return 'low';
  if (/intel|uhd|iris|mali|adreno|powervr|apple gpu/i.test(gpu) && !/arc/i.test(gpu)) return 'medium';
  return 'high';
}

export function createWorld(canvas) {
  const params = new URLSearchParams(location.search);
  const isMobile = matchMedia('(pointer: coarse)').matches || /Mobi|Android/i.test(navigator.userAgent);
  let saved = null;
  try { saved = localStorage.getItem(QKEY); } catch { /* storage may be blocked */ }
  const forced = ['low', 'medium', 'high'].includes(params.get('quality')) ? params.get('quality') : ['low', 'medium', 'high'].includes(saved) ? saved : null;
  const preTier = forced || (isMobile ? 'low' : null);
  // native MSAA only on the low tier (the post-processing tiers use SMAA)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: preTier === 'low', powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false; // count every pass of a frame (reset once per frame below)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let tier = forced || detectTier(renderer, isMobile);
  const auto = !forced;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe6f2', 35, 110);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 4, 8);
  const overlayCam = new THREE.PerspectiveCamera();

  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.castShadow = true;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  let SH = 16; // shadow frustum half-size (m), follows the player (presets may widen it: golden's long shadows)
  const setShadowHalf = (h) => {
    SH = h;
    Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 0.5, far: 90 });
    sun.shadow.camera.updateProjectionMatrix();
  };
  setShadowHalf(16);
  scene.add(sun, sun.target);

  // ---------------------------------------------------------------- environment (IBL)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  roomEnv.userData.shared = true;
  scene.environment = roomEnv;
  let envToken = 0;
  /** Use an HDRI (catalog id / short name / path) as image-based lighting; falls back to RoomEnvironment. */
  async function setEnvironment(id, intensity = 0.7, { background = false, blur = 0.25 } = {}) {
    const my = ++envToken;
    scene.environmentIntensity = intensity;
    if (!id) { scene.environment = roomEnv; return roomEnv; }
    try {
      const tex = await loadEnvironment(renderer, HDRIS[id] || id);
      if (my !== envToken) return tex;
      scene.environment = tex;
      if (background) { scene.background = tex; scene.backgroundBlurriness = blur; scene.backgroundIntensity = intensity; }
      return tex;
    } catch (e) {
      console.warn('[world] HDRI failed, using RoomEnvironment', e?.message || e);
      if (my === envToken) scene.environment = roomEnv;
      return roomEnv;
    }
  }

  let sunDir = new THREE.Vector3(0.5, 1, 0.3).normalize();
  let preset = LIGHT_PRESETS.day;
  /** Apply a lighting preset (sync part) and start loading its HDRI (returns a promise). */
  function applyLights(name, env = null) {
    const p = LIGHT_PRESETS[name] || LIGHT_PRESETS.day;
    preset = p;
    scene.background = new THREE.Color(p.bg);
    scene.backgroundBlurriness = 0;
    scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemi;
    sun.color.set(p.sun); sun.intensity = p.sunI;
    sunDir = new THREE.Vector3(...p.sunDir).normalize();
    if ((p.shadowHalf || 16) !== SH) setShadowHalf(p.shadowHalf || 16);
    renderer.toneMappingExposure = p.exposure;
    if (toneFx) toneFx.exposure = p.exposure;
    const e = env && typeof env === 'object' ? env : {};
    return setEnvironment(e.hdri ?? p.hdri, e.intensity ?? p.env, { background: !!e.background, blur: e.blur ?? 0.25 });
  }

  const texel = () => (SH * 2) / sun.shadow.mapSize.x;
  const tmp = new THREE.Vector3();
  /** Keep the single shadow frustum centred on `focus`, snapped to texels to avoid shimmering. */
  function followShadow(focus) {
    const t = texel();
    tmp.set(Math.round(focus.x / t) * t, 0, Math.round(focus.z / t) * t);
    sun.target.position.copy(tmp);
    sun.position.copy(tmp).addScaledVector(sunDir, 45);
    sun.target.updateMatrixWorld();
  }

  // ---------------------------------------------------------------- post-processing
  let composer = null, aoPass = null, bloomFx = null, toneFx = null, fxPass = null;
  function buildComposer() {
    disposeComposer();
    const Q = QUALITY_TIERS[tier];
    if (!Q.post) { renderer.toneMapping = THREE.ACESFilmicToneMapping; camera.layers.enable(OVERLAY_LAYER); return; }
    renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the effect pass
    camera.layers.disable(OVERLAY_LAYER);
    composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, stencilBuffer: false });
    composer.addPass(new RenderPass(scene, camera));
    if (Q.ao) {
      aoPass = new N8AOPostPass(scene, camera, 1, 1);
      Object.assign(aoPass.configuration, {
        aoRadius: 1.2, distanceFalloff: 0.6, intensity: 2.2, color: new THREE.Color('#000000'),
        halfRes: Q.ao === 'half', gammaCorrection: false, screenSpaceRadius: false, aoSamples: Q.ao === 'half' ? 8 : 16, denoiseSamples: Q.ao === 'half' ? 4 : 8, denoiseRadius: 12
      });
      aoPass.setQualityMode(Q.ao === 'half' ? 'Performance' : 'Low');
      composer.addPass(aoPass);
    }
    const fx = [];
    // tilt-shift first: it mixes in a blurred copy of the effect pass input, so effects added after it (bloom)
    // still apply everywhere. Sharp band = the player's slice of the screen, blur grows to the top and bottom.
    if (Q.tiltShift) fx.push(new TiltShiftEffect({ offset: -0.08, focusArea: 0.72, feather: 0.4, kernelSize: Q.tiltShift === 'small' ? KernelSize.VERY_SMALL : KernelSize.SMALL, resolutionScale: 0.5 }));
    if (Q.bloom) { bloomFx = new BloomEffect({ luminanceThreshold: 0.86, luminanceSmoothing: 0.25, intensity: 0.8, mipmapBlur: true, radius: 0.65 }); fx.push(bloomFx); }
    toneFx = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    toneFx.exposure = preset.exposure;
    fx.push(toneFx);
    fx.push(new WarmGradeEffect());
    fx.push(new HueSaturationEffect({ saturation: 0.16 }));
    fx.push(new BrightnessContrastEffect({ contrast: 0.1 }));
    if (Q.vignette) fx.push(new VignetteEffect({ offset: 0.32, darkness: 0.38 }));
    if (Q.smaa) fx.push(new SMAAEffect({ preset: SMAAPreset.MEDIUM }));
    // keep the scene depth in the buffer the overlay draws into: RenderPass -> (AO) -> effects must swap an even number of times
    if (!Q.ao) composer.addPass(new CopyPass());
    fxPass = new EffectPass(camera, ...fx);
    composer.addPass(fxPass);
    const overlay = new RenderPass(scene, overlayCam);
    overlay.clear = false; overlay.ignoreBackground = true; overlay.skipShadowMapUpdate = true;
    composer.addPass(overlay);
    composer.addPass(new CopyPass());
    resize();
  }
  function disposeComposer() {
    if (composer) composer.dispose();
    composer = null; aoPass = null; bloomFx = null; toneFx = null; fxPass = null;
  }

  function applyTier() {
    const Q = QUALITY_TIERS[tier];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pixelRatio));
    if (sun.shadow.mapSize.x !== Q.shadow) {
      sun.shadow.mapSize.set(Q.shadow, Q.shadow);
      sun.shadow.map?.dispose(); sun.shadow.map = null;
    }
    buildComposer();
    document.documentElement.dataset.quality = tier;
    events.emit('quality:apply', { tier, ...Q });
  }

  /** Switch the quality tier at runtime ('low'|'medium'|'high'); persists unless { persist:false }. */
  function setQuality(t, { persist = true } = {}) {
    if (!QUALITY_TIERS[t]) return tier;
    tier = t;
    if (persist) { try { localStorage.setItem(QKEY, t); } catch { /* ignore */ } }
    applyTier();
    events.emit('quality', { tier, auto: !persist && auto });
    return tier;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 68 : 55; // wider FOV in portrait (phones)
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  applyTier();
  resize();
  applyLights('day', { hdri: null }); // boot: neutral room environment until a scene picks its HDRI

  // ---------------------------------------------------------------- frame loop (+ adaptive downgrade when auto)
  const tickers = new Set();
  const clock = new THREE.Clock();
  let elapsed = 0, running = true;
  let slow = 0, frames = 0, acc = 0;
  const stats = { fps: 0, frameMs: 0 };
  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    elapsed += dt;
    tickers.forEach((fn) => { try { fn(dt, elapsed); } catch (e) { console.error('[tick]', e); } });
    renderer.info.reset();
    if (composer) {
      overlayCam.copy(camera); overlayCam.layers.set(OVERLAY_LAYER);
      composer.render(dt);
    } else renderer.render(scene, camera);
    frames++; acc += raw;
    if (acc >= 1) {
      stats.fps = frames / acc; stats.frameMs = (acc / frames) * 1000;
      // auto tier: 4 consecutive seconds under 28 fps -> step down once per tier
      if (auto && !document.hidden && stats.fps < 28 && tier !== 'low') { if (++slow >= 4) { slow = 0; setQuality(tier === 'high' ? 'medium' : 'low', { persist: false }); } } else slow = 0;
      frames = 0; acc = 0;
    }
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; clock.getDelta(); });

  return {
    renderer, scene, camera, hemi, sun, isMobile,
    applyLights, setEnvironment, followShadow, setQuality,
    get quality() { return tier; }, get qualityAuto() { return auto; }, stats,
    get composer() { return composer; },
    onTick: (fn) => { tickers.add(fn); return () => tickers.delete(fn); },
    time: () => elapsed
  };
}
