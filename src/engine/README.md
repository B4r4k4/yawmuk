# Yawmuk engine: guide for scene authors

This guide is for anyone writing `src/scenes/<location>.js`. The scene contract is defined in `docs/TEAM_BRIEF.md`. Hotspot IDs, NPC IDs and layouts come from `docs/hotspots.md`. This file covers the API the engine provides and the rules it enforces.

> **Rule 1:** your file is the only one you touch. Do not edit `src/engine/**`, `src/scenes/index.js` or `_placeholder.js`. If you need something from the engine, write it in your report.
> **Rule 2:** use procedural geometry only (Three.js primitives and canvas textures). No external model or image files, and nothing loaded over the network.

---

## 1. Quick start

```bash
npm install
npm run dev                                   # http://localhost:5173
# jump straight into your location (skips the start screen):
http://localhost:5173/?scene=home
http://localhost:5173/?scene=home&nointro=1&lang=en&debug=1
npm run build                                 # must stay error-free
```

| URL param | Effect |
|---|---|
| `scene=<location>` | Skip the start screen and load that location directly. |
| `nointro=1` | Skip the location intro card. |
| `lang=ar` / `lang=en` | Force the language. The default is Arabic (RTL). |
| `debug=1` | Draw every collider as a magenta box and every hotspot or exit radius as a cyan ring. Scene warnings appear as toasts, and the console logs mesh and triangle counts. |
| `fixtures=1` | Ignore `content/` and use the engine test fixtures. |
| `freeexit=1` | The exit works before all situations are done (for testing). |

Debug helpers are available in the browser console as `window.yawmuk`:

```js
yawmuk.goto('school')        // load a location (no intro card)
yawmuk.teleport('exam_desk') // put Adam on a hotspot ('exit' works too)
yawmuk.interact()            // same as pressing E
yawmuk.stats()               // { meshes, tris } of the active scene
yawmuk.scenes.active         // the validated scene: hotspots, colliders, npcs, exit, bounds, occluders…
yawmuk.contentIssues         // problems found in content/*.json
```

**Headless check:** the Chrome extension cannot reach localhost. Use local headless Chrome (`chrome --headless=new --remote-debugging-port=…`) and drive the page over CDP, or just run `npm run build`.

---

## 2. The contract

```js
// src/scenes/home.js
export default {
  id: 'home',
  title: { ar: 'المنزل', en: 'Home' },
  build(ctx) {
    // …create meshes, add them to ctx.group…
    return {
      group: ctx.group,                                   // THREE.Group (required; ctx.group is ready-made)
      spawn: { position: [0, 0, 3], yaw: 0 },             // where Adam appears; yaw 0 = facing -Z
      colliders: [{ min: [x, y, z], max: [x, y, z] }],    // extra AABBs (merged with addCollider/collide:true)
      hotspots: [{ id: 'laptop', position: [0, 0.85, -1.5], radius: 1.6, label: { ar: 'اللابتوب', en: 'Laptop' } }],
      npcs: [{ id: 'sara', position: [0.9, 0, -2.2], yaw: Math.PI, look: { skin: '#c68642', shirt: '#e8dcc4', hijab: true, hijabColor: '#5b7b5a' } }],
      exit: { position: [4.5, 0, 4.3], radius: 1.5 },
      lights: 'day',                                      // 'day' | 'evening' | 'night'
      sky: '#cfd9e6',                                     // optional: overrides the preset background colour
      fog: { color: '#cfd9e6', near: 30, far: 100 },      // optional: overrides the preset fog (any subset)
      cameraOccluders: [wallProxyMesh],                   // optional: Mesh/Group or array; extra camera blockers (see §4)
      update(dt, t) {},                                   // optional, every frame (dt seconds, t elapsed seconds)
      dispose() {}                                        // optional, free anything the engine can't see
    };
  }
};
```

### What the engine does with the result (you do not need to do these)

- **Hotspot markers.** For every hotspot that the location script uses, the engine places a glowing ring on the floor, a floating gem and a name label. Markers turn green once that hotspot's situation is done. **Do not draw your own marker.** Draw the object itself (the laptop, the fridge and so on).
  - `position[1]` is the object's height. The ring is always placed at y=0, and the gem floats at `max(2.1, y + 1.2)`. Set `markerHeight` on a hotspot to choose the gem height yourself.
  - Distance checks are 2D (XZ only). Interaction is possible when Adam is within `radius` (default 1.5).
  - A hotspot your scene defines but the script does not use gets no marker and only a warning.
  - If the script needs a hotspot your scene does not provide, it is **auto-placed** near spawn with a warning. The game stays playable, but treat this as a bug.
- **NPCs.** The engine builds each NPC with `makeNPC(look)`, places it, adds a 0.56 m collider (set `collide: false` to skip it) and adds a gentle idle animation (set `animate: false` to skip it). It shows the name from the script's `npc.name`, or your `name`; set `showName: false` to hide it. During a situation the speaking NPC turns to face Adam.
  - IDs starting with `bg_` are background extras. They never get a name label and never speak.
  - To use your own figure instead, pass `object: someObject3D`. The engine positions it but does not build one.
- **Exit.** The engine places a teal marker on the exit. **It stays locked (grey) until every situation in the location is done.** After that, the outro card leads to `next_location`. `next_location: null` leads to the final summary.
- **Bounds.** The player is clamped to the bounding box of your group plus colliders, with a 0.5 m margin. Even if you leave a gap in a wall, Adam cannot walk into the void.
- **Lighting.** There is one hemisphere light and one directional "sun" that casts shadows. The sun's 32×32 m shadow frustum follows Adam, so large outdoor maps keep crisp shadows near him. Preset fog and background colours are listed in `world.js` (`LIGHT_PRESETS`). Without `lights`, the preset comes from the script's `time_of_day` (17:00 or later is evening, 20:00 or later is night).
- **Disposal.** When the scene unloads, the engine traverses your group and disposes every geometry, material and texture **except** the shared ones (`ctx.mats.*`, `mats.color()` and the NPC parts, all marked `userData.shared = true`). Use `dispose()` only for things outside the group, such as extra lights added to `ctx.group`'s parent or timers.
- **Fault tolerance.** If your module fails to import, or `build()` throws, the engine logs the error and loads the placeholder room. The game never crashes because of a scene. If `update()` throws, it is disabled for that scene.

---

## 3. The `ctx` API

| Member | Signature | Notes |
|---|---|---|
| `THREE` | the `three` module | Use this. Do not import a second copy. |
| `group` | `THREE.Group` | The default parent for all helpers. Return it as `group`. |
| `mats` | object of shared `MeshStandardMaterial`s | See the list below. **Never mutate them.** Use `.clone()`, which the engine disposes for you, or `mats.color()`. |
| `mats.color(hex, opts?)` | `→ Material` | A cached shared material for any colour, e.g. `mats.color('#2f6f7e', { roughness: .5 })`. |
| `box(w,h,d, mat, x,y,z, opts?)` | `→ Mesh` | **(x,y,z) is the bottom centre**, so `y=0` sits on the floor. |
| `cyl(rTop,rBot,h, mat, x,y,z, opts?)` | `→ Mesh` | Bottom centre. `opts.segments` defaults to 12. |
| `sphere(r, mat, x,y,z, opts?)` | `→ Mesh` | (x,y,z) is the centre. |
| `ground(w,d, mat, x=0, z=0, y=0, opts?)` | `→ Mesh` | A horizontal plane that receives shadows. It is not a collider. |
| `wall(x1,z1, x2,z2, h=3, thick=0.2, mat, opts?)` | `→ Mesh` | A straight wall between two floor points. It **collides by default**. Keep walls axis-aligned: a diagonal wall's AABB is large. |
| `room({ w, d, h, x, z, floor, wall, ceiling, thick, doors })` | `→ { floor, walls }` | A floor plus 4 colliding walls. `doors: [{ side: 'n'\|'s'\|'e'\|'w', at: 0, width: 1.4, height: 2.2 }]`. n = −Z, s = +Z, e = +X, w = −X. `at` is the offset from the wall centre. |
| `addCollider(target)` | `→ {min,max}` | `target` can be an `Object3D` (its world AABB is used), a `THREE.Box3`, `{min:[…],max:[…]}` or `(minArr, maxArr)`. |
| `makeNPC(look)` | `→ Group` | See below. Use it directly for seated or decorative figures. For NPCs listed in the script, prefer the `npcs` array. |
| `makeLabel(text, opts?)` | `→ Sprite` | `text` is a string or `{ar,en}`. It re-renders when the language changes. `opts: { size=0.32 (world height in m), color, background (css \| false), depthTest=true }`. Labels are hidden behind walls by default; pass `depthTest: false` only for signs that must show through geometry. |
| `rand(seed)` | `→ () => [0,1)` | A deterministic PRNG for scattering decor. |
| `yawTo([x,z], [x,z])` | `→ yaw` | The yaw that makes something at A face B. |
| `script` | the location script JSON | Includes `situations[].hotspot`, `npc`, `time_of_day` and so on. |
| `location`, `lang`, `tr(obj)`, `debug`, `isMobile` | | `tr({ar,en})` returns the current language. On a phone (`isMobile`), lower the detail. |
| `colliders` | array | Raw access to the collider list used by `addCollider` and `collide:true`. |

**`opts` shared by `box`, `cyl`, `sphere`, `ground` and `wall`:** `{ collide: bool, cast: true, receive: true, rotY: radians, parent: Object3D, name }`. If you pass `collide: true`, the AABB is computed after `rotY`.

**`ctx.mats` palette:** `wall, wallWarm, wallBlue, wallGreen, ceiling, floor (wood), floorTile, carpet, concrete, sidewalk, asphalt, brick, roofTile, grass, leaf, trunk, water, dirt, wood, woodDark, woodLight, metal, steel, chrome, gold, glass (transparent), plastic, black, white, paper, screen (emissive blue), screenOff, lampGlow (emissive), fabricRed, fabricBlue, fabricGreen, fabricBeige, fabricGray, fabricPurple, paintWhite, paintYellow, paintRed, paintGreen, paintBlue`.

### `makeNPC(look)`

```js
makeNPC({
  skin: '#c68642', shirt: '#3a6ea5', pants: '#2f3542', shoes: '#1e1e1e', hair: '#2b1d14',  // hair:false = bald
  hijab: true, hijabColor: '#5b7b5a',  // full head covering with a face opening (hijab:'#hex' also works)
  kufi: true | '#hex', beard: true | '#hex', glasses: true,
  suit: true | '#hex', tie: '#hex',     // jacket + tie
  dress: true | '#hex',                 // long skirt / abaya to the floor
  height: 1.75, build: 1                // metres; width factor
})
```

- The feet are at y=0, and the figure **faces −Z when `rotation.y = 0`**, the same convention as `yaw`.
- Heights from `docs/hotspots.md`: men 1.75–1.85, women 1.62–1.70, elderly people a little shorter, children 1.1–1.2.
- `group.userData.parts = { legL, legR, armL, armR, head, body }` are pivot groups you can pose. For a seated figure, set `parts.legL.rotation.x = parts.legR.rotation.x = -Math.PI/2`, lower the figure about 0.4 m and set `animate: false`.

---

## 4. Conventions

- **Units:** metres. **Y is up. The floor is y=0.** +X is right and +Z is toward the camera at spawn when spawn yaw is 0.
- **Yaw:** radians around +Y. `0` faces −Z, `Math.PI` faces +Z, `Math.PI/2` faces −X and `-Math.PI/2` faces +X. `ctx.yawTo(from, to)` computes it for you.
- **Colliders:** axis-aligned boxes. The player is a circle with r = 0.3 in XZ. A collider only blocks the player if `max.y > 0.25` and `min.y < 1.7`, so rugs and overhead signs do not block. Leave walkways **at least 1.2 m** wide.
- **Camera:** third person, orbiting at 2.4–10 m. Camera occlusion uses a ray from the camera to Adam against your scene's **large opaque meshes** (bounding-sphere radius ≥ 0.9 m and ≤ 2000 triangles, because big merged meshes are too expensive to raycast every frame) plus anything you return in `cameraOccluders`. This is independent of collider height, so 1.1 m-tall colliders are fine. The ray honours `material.side`:
  - A normal `FrontSide` wall whose visible face points at the camera pulls the camera in front of it, as expected.
  - A **single-sided cut-away wall** (invisible from outside) never pulls the camera in. Use this "dollhouse" trick for interiors.
  - `DoubleSide` meshes always block. `BackSide` meshes and transparent materials (opacity < 0.6) never block.
  - **`cameraOccluders`** (in the build result) takes a Mesh, a Group (searched recursively) or an array. Use it for merged or instanced walls: return the wall mesh itself, or cheap invisible proxy boxes (`mesh.visible = false` still raycasts; it does not need to be in the group). Collider height has nothing to do with camera occlusion.
  - To exclude a mesh, set `mesh.userData.noCameraCollide = true` (good for big trees, roofs and canopies). To include a small mesh, set `mesh.userData.cameraCollide = true`. `InstancedMesh` is excluded unless `userData.cameraCollide = true`.
- **Text in the world:** only `makeLabel`. Do not bake text into canvas textures, because it would not switch language.

## 5. Performance budget (one scene, must run on a mid-range phone)

| Item | Budget |
|---|---|
| Triangles | ≤ 60k (aim for 15–30k). Use low-segment cylinders and spheres (8–12). |
| Draw calls (meshes) | ≤ 250. Merge or instance repeated props (`InstancedMesh`), and reuse geometries. |
| Lights | Use the engine's hemisphere and sun. Add **no shadow-casting lights**. Add at most 3 `PointLight`/`SpotLight` for mood, with `castShadow = false`. |
| Textures | Canvas textures only, ≤ 512 px. Dispose them in `dispose()` if they are not on a mesh in your group. |
| Footprint | Interiors 10–25 m. Outdoor maps ≤ 60 m across (the shadow frustum covers 32 m around Adam). |
| Per-frame `update` | Cheap. Do not allocate in the loop and do not create geometry per frame. |

Check with `?debug=1` (console) or `yawmuk.stats()`. Current scenes run between 85 and 250 meshes and 5k and 16k tris.

## 6. A minimal complete example

```js
// src/scenes/work.js — minimal but complete
export default {
  id: 'work',
  title: { ar: 'العمل', en: 'Work' },
  build(ctx) {
    const { mats, box, room, makeLabel } = ctx;
    room({ w: 18, d: 12, h: 3, floor: mats.carpet, wall: mats.wall, doors: [{ side: 's', at: 7, width: 1.6 }] });

    // coffee counter (collides) + machine (decor)
    box(2.4, 0.95, 0.7, mats.woodDark, -7.5, 0, -1, { collide: true });
    box(0.35, 0.45, 0.35, mats.steel, -7.5, 0.95, -1);

    // Adam's desk with two screens
    box(1.6, 0.75, 0.8, mats.white, -1, 0, 1.5, { collide: true });
    box(0.55, 0.32, 0.03, mats.screen, -1.3, 0.85, 1.25);
    box(0.55, 0.32, 0.03, mats.screen, -0.7, 0.85, 1.25);

    const sign = makeLabel({ ar: 'مخرج', en: 'EXIT' }, { size: 0.3, background: '#1e8449' });
    sign.position.set(7.5, 2.6, 5.8); ctx.group.add(sign);

    return {
      group: ctx.group,
      spawn: { position: [-7, 0, 5], yaw: -Math.PI / 2 },           // facing +X
      colliders: [],
      hotspots: [
        { id: 'coffee_machine', position: [-7.5, 1.1, -0.2], radius: 1.6 },
        { id: 'adam_desk', position: [-1, 0.8, 2.3], radius: 1.6 },
        { id: 'hr_desk', position: [6.5, 0.8, -3.2], radius: 1.8 }
      ],
      npcs: [
        { id: 'jake', position: [-6.7, 0, -0.2], yaw: ctx.yawTo([-6.7, -0.2], [-7, 5]), look: { skin: '#f1c27d', shirt: '#a83232', beard: '#c9a45c', build: 1.1 } },
        { id: 'bg_coworker1', position: [2, 0, -2], yaw: 0, look: { skin: '#5a3a22', shirt: '#c9a227', hijab: true, hijabColor: '#3a3a5a', height: 1.65 } }
      ],
      exit: { position: [7.5, 0, 5], radius: 1.5 },
      lights: 'day'
    };
  }
};
```

## 7. Checklist before you hand in

1. `?scene=<you>&debug=1` loads with **no** "auto-placed" or "not provided" toasts.
2. Every hotspot ID and NPC ID matches `content/script/<you>.json` and `docs/hotspots.md` exactly.
3. You can walk from spawn to each hotspot and then to the exit without getting stuck. Magenta boxes match the visible geometry.
4. The camera never ends up inside a wall that hides Adam. Test by orbiting with the mouse near walls.
5. `yawmuk.stats()` is within budget, and `npm run build` passes.
6. Switch the language (menu ☰ → English/العربية). Your labels switch with it.
7. Do a `goto` to another location and back three times. Memory should not grow, and the console should show no errors on dispose.

## 8. Engine architecture (for reference)

```
src/main.js                 boot → engine/game.js
src/engine/
  game.js                   flow controller: start → intro → location loop → summary; frame loop; window.yawmuk
  world.js                  renderer (pixelRatio ≤ 2, ACES, PCF soft shadows), camera, LIGHT_PRESETS, tick loop
  sceneManager.js           build/validate/normalise scenes, markers, NPCs, bounds, occluders, dispose
  sceneRegistry.js          lazy import.meta.glob of src/scenes/*.js (ignores index.js and _*.js) → placeholder fallback
  kit.js                    ctx helpers: box/cyl/sphere/ground/wall/room/addCollider, makeNPC, makeLabel, markers
  mats.js                   shared material palette
  player.js                 Adam: movement, circle-vs-AABB collision, follow/orbit camera, occlusion raycast
  input.js                  keyboard, mouse orbit + wheel zoom, touch joystick + interact button
  content.js                content/rulings + content/script via import.meta.glob (raw, JSON.parse in try/catch),
                            ui_strings.json overrides, fixtures fallback
  progress.js               localStorage (try/catch), best-score-per-situation, check bonus (+5)
  i18n.js                   ar/en strings, dir switching, tr()
  ui/                       overlay (modals, focus trap, toasts), hud, situation flow, ruling card, screens
  __fixtures__/             test data, used only when content/ is missing
src/scenes/_placeholder.js  auto-generated room: one station per script situation
```

Situation flow: setup and dialogue (bottom sheet) → choices (**shuffled each time**; 1–4 keys) → consequence and points → **ruling card** (from `content/rulings`, or a "content pending" card if missing) → check question (+5 if correct) → done, with "Try another choice". Score keeps the **best** points per situation, so replaying never lowers it.
