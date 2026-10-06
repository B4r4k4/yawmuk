// Golden-hour backdrop (key art: public/brand/imagery/keyart-town-golden-hour.jpg).
// A sky dome (gradient + sun disc + painterly clouds, one ShaderMaterial) and the far field: three rings of hazy
// hills, a small city skyline and a sea strip with a sun glint (one vertex-coloured mesh + one sea mesh).
// 3 draw calls in total; nothing here reads the DOM, so scenes can build it headless (tests run in Node).
// The visual sun sits on the horizon down `sunAz` while the light (GOLDEN.sunDir) stays ~20° up so shadows are
// long but still land on the ground; the two azimuths are allowed to differ (the art does the same).
import * as THREE from 'three';

/** Shared golden-hour constants (world.js builds the `golden` light preset from these). */
export const GOLDEN = {
  sunDir: [0.79, 0.36, 0.5],     // towards the sun light (elevation ~21°, from +X/+Z: lights the north-row facades)
  sunAz: 0.14,                   // azimuth (rad, from +X towards +Z) of the visible sun disc: down the avenue's east end
  sunEl: 0.035,                  // elevation (rad) of the visible disc: resting on the horizon
  horizon: '#e98d4e',            // = fog colour, so fogged ground melts into the sky
  low: '#f0a663',
  mid: '#f1c491',
  zenith: '#8daccb',
  sun: '#ffb050',
  cloudLit: '#ffae68',
  cloudShade: '#a5696c',
  haze: '#e98d4e'
};

const VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
}`;

const FRAG = /* glsl */`
uniform vec3 uZenith, uMid, uLow, uHorizon, uSun, uCloudLit, uCloudShade;
uniform vec3 uSunDir;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.07 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float e = d.y, h = max(e, 0.0);
  vec3 s = normalize(uSunDir);
  float cs = max(dot(d, s), 0.0);
  // vertical gradient: deep orange horizon -> peach -> pale cream -> soft blue zenith
  vec3 col = mix(uHorizon, uLow, smoothstep(0.0, 0.09, h));
  col = mix(col, uMid, smoothstep(0.07, 0.3, h));
  col = mix(col, uZenith, smoothstep(0.22, 0.85, h));
  // warm glow around the sun, strongest low on the horizon
  float side = pow(cs, 3.0);
  col += uSun * (0.35 * side * (1.0 - smoothstep(0.0, 0.45, h)) + 0.7 * pow(cs, 30.0) + 2.5 * pow(cs, 400.0));
  // painterly cloud streaks (horizontally stretched fbm), lit warm from below / from the sun side
  vec3 q = vec3(d.x * 2.6, e * 19.0, d.z * 2.6);
  float n = fbm(q);
  float nUp = fbm(q + vec3(0.0, 0.55, 0.0));
  float band = smoothstep(0.03, 0.08, e) * (1.0 - smoothstep(0.26, 0.5, e));
  float cov = smoothstep(0.5, 0.7, n) * band;
  float under = clamp((n - nUp) * 3.0 + 0.45, 0.0, 1.0);     // denser above than below -> lit underside
  vec3 cloud = mix(uCloudShade, uCloudLit, clamp(under * 0.7 + side * 0.6, 0.0, 1.0));
  cloud += uSun * pow(cs, 8.0) * 0.6 * under;
  col = mix(col, cloud, cov * 0.92);
  // the sun disc (HDR so bloom catches it), slightly behind the lowest cloud wisps
  float disc = smoothstep(0.99955, 0.99968, dot(d, s));
  col = mix(col, uSun * 7.0 + vec3(1.5, 1.2, 0.6), disc * (1.0 - cov * 0.6));
  // below the horizon: the haze colour (= fog colour)
  col = mix(col, uHorizon, 1.0 - smoothstep(-0.03, 0.0, e));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Deterministic PRNG (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** GLSL-style smoothstep (edges may be reversed). */
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
/** Angular distance between two azimuths (rad, 0..PI). */
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * Build the golden-hour backdrop. Returns a THREE.Group (add it to the scene root, NOT to the scene's bounds
 * group). opts: { quality, seaWidth (rad half-angle of the sea sector), seed }. `group.userData.seaSector`
 * describes where the sea is, so scenes can keep that view open: { az, half, inner }.
 */
export function createGoldenSky({ quality = 'high', seaHalf = 0.62, seaInner = 64, seed = 11 } = {}) {
  const C = (hex) => new THREE.Color(hex);
  const group = new THREE.Group();
  group.name = 'backdrop:golden';
  const sunAz = GOLDEN.sunAz;
  const sunVis = new THREE.Vector3(Math.cos(sunAz) * Math.cos(GOLDEN.sunEl), Math.sin(GOLDEN.sunEl), Math.sin(sunAz) * Math.cos(GOLDEN.sunEl));

  // ---------------------------------------------------------------- sky dome (drawn first, behind everything)
  const domeMat = new THREE.ShaderMaterial({
    name: 'goldenSky',
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uZenith: { value: C(GOLDEN.zenith) }, uMid: { value: C(GOLDEN.mid) }, uLow: { value: C(GOLDEN.low) }, uHorizon: { value: C(GOLDEN.horizon) },
      uSun: { value: C(GOLDEN.sun) }, uCloudLit: { value: C(GOLDEN.cloudLit) }, uCloudShade: { value: C(GOLDEN.cloudShade) },
      uSunDir: { value: sunVis.clone() }
    },
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), domeMat);
  dome.name = 'golden:dome';
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.matrixAutoUpdate = false;
  group.add(dome);

  // ---------------------------------------------------------------- far field: hills + skyline (fog:false, haze baked in)
  const R = rng(seed);
  const P = [], Cl = [];
  const haze = C(GOLDEN.haze);
  const tmp = new THREE.Color();
  const tri = (a, b, c, ca, cb, cc) => { P.push(...a, ...b, ...c); Cl.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b); };
  // three rings, far = palest; the near/mid rings dip away where the sea is
  const rings = [
    { r: 232, h: 26, top: '#b6929c', seaDip: 0.35 },
    { r: 192, h: 17, top: '#94809e', seaDip: 0 },
    { r: 152, h: 10, top: '#76708f', seaDip: 0 }
  ];
  const SEG = quality === 'low' ? 72 : 120;
  rings.forEach((ring, k) => {
    const ph = R() * 10, ph2 = R() * 10;
    const top = C(ring.top);
    let prev = null;
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const sea = angDist(a, sunAz);
      const dip = THREE.MathUtils.lerp(ring.seaDip, 1, sstep(seaHalf + 0.02, seaHalf + 0.38, sea));
      let hgt = ring.h * (0.55 + 0.3 * Math.sin(a * 3 + ph) + 0.18 * Math.sin(a * 7.3 + ph2) + 0.08 * Math.sin(a * 17 + k));
      hgt = Math.max(0.5, hgt) * dip;
      // warmer/hazier towards the sun, cooler away from it
      const warm = Math.pow(Math.max(0, Math.cos(a - sunAz)), 2);
      tmp.copy(top).lerp(haze, 0.15 + warm * 0.45);
      const cTop = tmp.clone();
      const x = Math.cos(a) * ring.r, z = Math.sin(a) * ring.r;
      const cur = { b: [x, -1, z], t: [x, hgt, z], c: cTop };
      if (prev) { tri(prev.b, cur.b, cur.t, haze, haze, cur.c); tri(prev.b, cur.t, prev.t, haze, cur.c, prev.c); }
      prev = cur;
    }
  });
  // city skyline on the far shore, to the left of the sun (blocky towers, hazy blue-grey)
  const cityAz = sunAz - seaHalf * 0.72, cityR = 176;
  const cityTop = C('#7f7c9c'), cityLit = C('#c08f86');
  const nB = quality === 'low' ? 16 : 26;
  for (let i = 0; i < nB; i++) {
    const t = i / (nB - 1);
    const a = cityAz - 0.13 + t * 0.26 + (R() - 0.5) * 0.01;
    const r = cityR + (R() - 0.5) * 14;
    const w = 3 + R() * 5, dpt = 4 + R() * 3;
    const centre = 1 - Math.abs(t - 0.45) * 1.7;
    const hgt = 3 + R() * 5 + Math.max(0, centre) * (5 + R() * 11);
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    // a box facing the origin: front face + the side that looks at the sun
    const fx = -Math.cos(a), fz = -Math.sin(a);           // towards the origin
    const sx = -fz, sz = fx;                              // tangent
    const c0 = [cx - sx * w / 2 + fx * dpt / 2, cz - sz * w / 2 + fz * dpt / 2];
    const c1 = [cx + sx * w / 2 + fx * dpt / 2, cz + sz * w / 2 + fz * dpt / 2];
    const c2 = [cx + sx * w / 2 - fx * dpt / 2, cz + sz * w / 2 - fz * dpt / 2];
    const c3 = [cx - sx * w / 2 - fx * dpt / 2, cz - sz * w / 2 - fz * dpt / 2];
    const topC = cityTop.clone().lerp(haze, 0.32 + R() * 0.15);
    const sideC = topC.clone().lerp(cityLit, 0.45);
    const face = (p, q, cT) => { const a0 = [p[0], -1, p[1]], b0 = [q[0], -1, q[1]], b1 = [q[0], hgt, q[1]], a1 = [p[0], hgt, p[1]]; tri(a0, b0, b1, haze, haze, cT); tri(a0, b1, a1, haze, cT, cT); };
    face(c0, c1, topC); face(c1, c2, sideC); face(c3, c0, sideC);
    tri([c0[0], hgt, c0[1]], [c1[0], hgt, c1[1]], [c2[0], hgt, c2[1]], topC, topC, topC);
    tri([c0[0], hgt, c0[1]], [c2[0], hgt, c2[1]], [c3[0], hgt, c3[1]], topC, topC, topC);
  }
  const farGeo = new THREE.BufferGeometry();
  farGeo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  farGeo.setAttribute('color', new THREE.Float32BufferAttribute(Cl, 3));
  farGeo.computeBoundingSphere();
  const far = new THREE.Mesh(farGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  far.name = 'golden:far';
  far.matrixAutoUpdate = false;
  group.add(far);

  // ---------------------------------------------------------------- sea strip with a sun-glint streak (HDR via material colour)
  const GAIN = 1.7;
  const seaGeo = new THREE.BufferGeometry();
  const SP = [], SC = [];
  const AS = 56, RS = 8, r0 = seaInner, r1 = 226;
  const seaBase = C('#c99a8e'), seaFar = C('#e8b48c'), glint = C('#fff0c0');
  const col = (a, r) => {
    const da = angDist(a, sunAz);
    const edge = sstep(seaHalf, seaHalf * 0.7, da);          // fade into the haze at the sides
    const near = sstep(r0, r0 + 16, r);                       // ... and at the shore
    const g = Math.exp(-Math.pow(da / (0.025 + 0.05 * (1 - (r - r0) / (r1 - r0))), 2)) * (0.35 + 0.65 * (r - r0) / (r1 - r0));
    const c = seaBase.clone().lerp(seaFar, (r - r0) / (r1 - r0));
    c.lerp(haze, 1 - edge * near);
    c.multiplyScalar(1 / GAIN).lerp(glint, Math.min(1, g * 1.1));
    return c;
  };
  for (let i = 0; i < AS; i++) {
    const a0 = sunAz - seaHalf + (i / AS) * seaHalf * 2, a1 = sunAz - seaHalf + ((i + 1) / AS) * seaHalf * 2;
    for (let j = 0; j < RS; j++) {
      const ra = r0 + (j / RS) * (r1 - r0), rb = r0 + ((j + 1) / RS) * (r1 - r0);
      const v = [[a0, ra], [a1, ra], [a1, rb], [a0, rb]];
      const pts = v.map(([a, r]) => [Math.cos(a) * r, 0.03, Math.sin(a) * r]);
      const cs = v.map(([a, r]) => col(a, r));
      for (const k of [0, 2, 1, 0, 3, 2]) { SP.push(...pts[k]); SC.push(cs[k].r, cs[k].g, cs[k].b); }
    }
  }
  seaGeo.setAttribute('position', new THREE.Float32BufferAttribute(SP, 3));
  seaGeo.setAttribute('color', new THREE.Float32BufferAttribute(SC, 3));
  seaGeo.computeBoundingSphere();
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, color: new THREE.Color(GAIN, GAIN, GAIN) }));
  sea.name = 'golden:sea';
  sea.matrixAutoUpdate = false;
  group.add(sea);

  group.traverse((o) => { if (o.isMesh) { o.userData.noCameraCollide = true; o.castShadow = false; o.receiveShadow = false; o.updateMatrix(); } });
  group.userData.seaSector = { az: sunAz, half: seaHalf, inner: seaInner };
  group.userData.dispose = () => group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return group;
}
