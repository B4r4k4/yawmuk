# Phase 2 — Scene report: `street` (night, 21:00)

**Files (scene agent owns only these):**
- `src/scenes/street.js` — default-exported scene `{ id:'street', title, build(ctx) }`
- `src/scenes/street/batcher.js` — merges static primitives into one mesh per material bucket
- `src/scenes/street/textures.js` — canvas-generated textures (asphalt, sidewalk, lot, tiles, products, scratch-offs, cooler, jackpot screen, price sign, store sign, bus ad, light pool, steam puff)

## Layout (metres, +x right, +z toward the road)
| zone | extent |
|---|---|
| lot / gas station | z −11.5…2.5 |
| near sidewalk | z 2.5…5.5 (curb 5.5–5.7) |
| road (2 lanes, double yellow, crosswalk at x≈−0.8) | z 5.7…13.7 |
| far sidewalk + storefronts (backdrop, not walkable) | z 13.9…26 |
| mart (glass front, door x −1.6…0) | x −4…4, z −10…−4 |
| canopy with 2 pump islands | x −5.4…3.8, z −2.9…1.9 |
| bus shelter + bench | x −11.6…−8.4, z 2.5…4.1 |
| parking (3 stalls) | x 6…14.4, z −6.6…−1.6 |

Contents: night-wet asphalt/sidewalk/lot (low roughness), lane paint, curbs, manhole with animated steam; 7 street lamps (instanced), 3 of them with warm PointLights + additive light-pool decals under all lamps/canopy/store front; red-white fuel canopy with emissive under-panels, pumps with glowing displays, price pylon; mart with emissive sign, cooler, shelves, counter with ticket machine, register, glossy scratch-off case and dispenser, pulsing gold JACKPOT $900 MILLION screen hanging above the register; bus shelter (glass, lit ad panel, schedule, metal bench, oversized brown wallet with a card peeking out); police cruiser at the curb (black/white, flashing red/blue light bar, dimmed); Omar's dark-green hatchback with headlights on (the exit); a parked maroon sedan and a silver car across the street; light-blue e-bike (torus wheels, battery, headlight); 6 storefronts across the street with neon signs, lit shop windows, awnings and random lit upper windows; houses behind the lot; pines (instanced, snow-dusted tops), grey old-snow piles, planter, dumpster, fences, hydrant, trash can, ice chest, propane cage.

## Contract data
- **spawn** `[-13,0,4]`, yaw −π/2 (faces +x, as in hotspots.md)
- **hotspots**: `bus_bench [-10,0.5,3]` r1.7 · `gas_station_counter [0,1,-7]` r1.8 (markerHeight 1.95, below the jackpot screen) · `ebike [8,0.6,1]` r1.8
- **npcs**: `officer_daniels [-8,0,4.5]` (hi-vis vest, cap, belt) · `omar [1.2,0,-6]` (1.88 m, grey beanie, beard) · `denise [9,0,2]` (mustard coat, red scarf) · `bg_raj [0,0,-8]` (red station shirt) · `bg_bilal [7.3,0,0.35]` (moved 0.25 m off the bike's collider; headphones round the neck). Each entry has `look` **and** `object` (built with `ctx.makeNPC(look)` plus small accessories), so the engine shows the accessories. If `object` is ignored, `look` still works.
- **exit** `[11.2,0,-3.4]` r1.6, beside Omar's car at x 12.1–13.9, z −6…−2 (the brief gives `[12,0,-2]`; moved about 1.5 m so it is not inside the car's collider)
- **lights** `'night'`; 5 PointLights in total (3 lamps, canopy, mart interior), none casting shadows
- **colliders** 41 AABBs. The invisible boundary is 1 m tall so the follow-camera ignores it (x ±15.3, z 5.55 curb line, z −8.3 back fence). The mart walls are tall, so the camera stays inside the store. The mart roof and fuel canopy have camera-only slabs (min y above 1.7, so the player ignores them): the camera stays under the canopy and roof, and those roofs never block the view from above.

## Budget / performance
- Scene meshes: **31** (7 InstancedMesh, ~7.5k tris), plus engine NPCs/markers. Static props are merged into 5 vertex-coloured buckets.
- `update()` allocates nothing per frame. It animates the police light bar colours, the jackpot pulse and 4 steam sprites.
- `dispose()` disposes all scene-owned materials, textures, accessory geometries and InstancedMeshes. The engine's `disposeTree` covers the merged geometries.
- Only `ctx.THREE` and `ctx.makeNPC` are used (falls back to `look` only if `makeNPC` is missing). `ctx.rand` is used if present. No engine or package files were edited.

## Verification
- `npx vite build`: **passes** (street chunk 26.6 kB).
- Headless Node check, with stubbed canvas and the real `kit.js` + `mats.js`: `build()`, `update()` and `dispose()` run without errors. The 3 hotspot ids and 5 NPC ids match hotspots.md. Spawn, exit and NPCs are not inside any collider. A 0.2 m grid flood-fill from the spawn reaches all 3 hotspots and the exit (player radius 0.3).
- **Browser screenshot NOT done.** The Chrome extension's browser got `ERR_CONNECTION_REFUSED` on every attempt: localhost, 127.0.0.1 and the LAN IP, with and without sandbox. The other scene agents' tabs in that browser showed the same error page. curl from this machine got HTTP 200, so the browser seems to run outside this host's network. The dev server has been stopped. Visual tuning (light intensities 38/60/14, pool colours) is untested and should be checked in a real browser: `?scene=street&debug=1&nointro=1`.

## Notes for the supervisor
- Some canvas textures contain short English text: "JACKPOT $900 MILLION" (quoted in the script's setup) and the fuel prices. hotspots.md says not to put text in the scene except through `makeLabel`. Remove them if that rule is strict.
- `src/engine/README.md` did not exist while this scene was being written. Only the documented contract fields plus `object` and `markerHeight` (both read by `sceneManager.js`) were used.
