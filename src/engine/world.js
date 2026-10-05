// Renderer, camera, lighting presets and the frame loop.
import * as THREE from 'three';

export const LIGHT_PRESETS = {
  day: { bg: '#bfe0f2', fog: '#cfe6f2', fogNear: 35, fogFar: 110, hemiSky: '#e8f3ff', hemiGround: '#7a6a55', hemi: 1.15, sun: '#fff2dc', sunI: 2.4, sunDir: [0.55, 1, 0.35], exposure: 1.0 },
  evening: { bg: '#e9a873', fog: '#d99a72', fogNear: 28, fogFar: 95, hemiSky: '#ffd3a8', hemiGround: '#4b3a4a', hemi: 0.8, sun: '#ff9a5a', sunI: 1.9, sunDir: [0.9, 0.42, 0.25], exposure: 1.0 },
  night: { bg: '#0e1630', fog: '#121b36', fogNear: 20, fogFar: 75, hemiSky: '#5a6c9e', hemiGround: '#151824', hemi: 0.55, sun: '#a9bcff', sunI: 0.75, sunDir: [-0.4, 1, 0.3], exposure: 1.15 }
};

export function createWorld(canvas) {
  const isMobile = matchMedia('(pointer: coarse)').matches || /Mobi|Android/i.test(navigator.userAgent);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe6f2', 35, 110);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 4, 8);

  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.castShadow = true;
  const SM = isMobile ? 1024 : 2048;
  sun.shadow.mapSize.set(SM, SM);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  const SH = 16; // shadow frustum half-size (m), follows the player
  Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 0.5, far: 80 });
  scene.add(sun, sun.target);

  let sunDir = new THREE.Vector3(0.5, 1, 0.3).normalize();
  function applyLights(name) {
    const p = LIGHT_PRESETS[name] || LIGHT_PRESETS.day;
    scene.background = new THREE.Color(p.bg);
    scene.fog.color.set(p.fog); scene.fog.near = p.fogNear; scene.fog.far = p.fogFar;
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemi;
    sun.color.set(p.sun); sun.intensity = p.sunI;
    sunDir = new THREE.Vector3(...p.sunDir).normalize();
    renderer.toneMappingExposure = p.exposure;
    return p;
  }
  applyLights('day');

  const texel = (SH * 2) / SM;
  const tmp = new THREE.Vector3();
  /** Keep the single shadow frustum centred on `focus`, snapped to texels to avoid shimmering. */
  function followShadow(focus) {
    tmp.set(Math.round(focus.x / texel) * texel, 0, Math.round(focus.z / texel) * texel);
    sun.target.position.copy(tmp);
    sun.position.copy(tmp).addScaledVector(sunDir, 40);
    sun.target.updateMatrixWorld();
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 68 : 55; // wider FOV in portrait (phones)
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const tickers = new Set();
  const clock = new THREE.Clock();
  let elapsed = 0, running = true;
  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    tickers.forEach((fn) => { try { fn(dt, elapsed); } catch (e) { console.error('[tick]', e); } });
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; clock.getDelta(); });

  return {
    renderer, scene, camera, hemi, sun, isMobile,
    applyLights, followShadow,
    onTick: (fn) => { tickers.add(fn); return () => tickers.delete(fn); },
    time: () => elapsed
  };
}
