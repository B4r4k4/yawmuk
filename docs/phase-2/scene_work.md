# Scene report — `work` (Buckeye Freight Tech office)

**File:** `src/scenes/work.js` (default export `{ id:'work', title, build(ctx) }`, self-contained, no helper files).

## Layout (interior x −9…9, z −6…6, ceiling 3 m, `lights: 'day'`)
- **West:** elevator (spawn `[-6.6,0,4.7]`, yaw −π/2 facing +x), kitchenette on a wood-floor zone: oak base cabinets, quartz top, sage backsplash, upper cabinets, sink, mini fridge, **coffee machine** (black body, chrome front, blue LED, bean hopper) with carafe, 4 colored mugs, fruit bowl; high table + 2 stools.
- **North (teal accent wall `#2f6f7e`):** quiet-room door with "Quiet Room / غرفة هادئة" label, a shoe bench with shoes and a folded green prayer rug; wall clock showing 10:00; two whiteboards (flowchart + sprint board with sticky notes, canvas-drawn, no text); freight-tracking dashboard TV (map + KPIs, animated truck dot); "Buckeye Freight Tech" sign (depth-tested label).
- **Centre:** 2 rows × 6 bench stations with dual angled monitors (code-editor canvas screens), keyboards, mice, black chairs, fabric dividers, random mugs/notebooks/desk plants. **Adam's desk** is the front-row west end: one monitor shows a green spreadsheet, plus teal mug, notepad, and a **black gift box with silver ribbon and bow**.
- **NE corner:** glass HR office (x 5…9, z −6…−2.8, opacity 0.22 glass, aluminum frames, frosted band), door gap x 6.2…7.6 on its south side; Linda's desk with a monitor turned toward the visitor showing a 401(k) form with a pie chart, colored files, plant, photo frame, filing cabinet, two chairs, and a poster.
- **East:** floor-to-ceiling windows with mullions over a winter Columbus skyline (52 textured instanced buildings 12 m below, snowy ground, river, and street, all fogged by the day preset).
- **South:** lounge (terracotta sofa, rug, coffee table, floor lamp) and the stairwell **EXIT** door with a green emissive sign (exit `[7.5,0,5]`, r 1.5).
- Plants in white pots at the row ends, the windows, the elevator, the HR corner and the lounge.

## Contract data
- Hotspots: `coffee_machine [-8.6,0.95,-1]` r1.9, `adam_desk [-1,0.78,1.5]` r1.9, `hr_desk [6.5,0.78,-4]` r1.8 (each with `markerHeight` ~1.35–1.4 so the gem sits below the ceiling and the ring circles the object at counter/desk height).
- NPCs (data; engine renders them): `jake [-7.55,0,-0.25]` (red flannel, blond beard, broad), `mike [-0.2,0,2.45]` (navy suit, light-blue tie), `linda [6.55,0,-4.85]` (burgundy blazer, black short hair, faces the glass door). `bg_coworker1` / `bg_coworker2` are seated in the second row: built with `ctx.makeNPC` when available (posed sitting, typing animation, headphones for coworker2) and passed via `object` with `animate:false`. If `makeNPC` is missing, they fall back to plain `look` data.
- Colliders: 39 AABBs (walls, window wall, glass partitions, desks, chairs, counter, table, sofa, plants, credenza, cabinet).

## Performance
- 23 meshes / ~9.3k triangles. Static geometry is batched into InstancedMeshes with per-instance color (matte boxes, gloss boxes, cylinders, pots, foliage, glow, light strips, glass, screens, skyline), totalling 485 instances.
- 9 small canvas textures. Ceiling and light strips are down-facing single-sided planes, so they disappear when the third-person camera is above 3 m.
- `update()` does no allocation: truck dot on the TV, coffee steam puffs, and coworkers typing / turning their heads.
- `dispose()` frees every geometry, material, texture and InstancedMesh it created. Engine labels are left to the engine's `disposeLabel`.

## Verification
- `npx vite build` passes (work chunk ~22 kB).
- Node smoke test (built the scene with real three.js and a stubbed canvas): build, update and dispose all ran without errors. A grid BFS with a 0.3 m player radius from spawn reached every hotspot (closest approach 0.7–0.8 m) and the exit.
- Browser check **not done**: the Chrome extension tab got `chrome-error://` for localhost, 127.0.0.1 and the LAN IP on my port, so there are no screenshots. Please do a visual pass with `?scene=work&debug=1&nointro=1`.

## Notes for the supervisor
- No `src/engine/README.md` existed while I worked. I used only `ctx.THREE` and `ctx.group`, plus optional `ctx.makeNPC` / `ctx.makeLabel` behind guards.
- Jake was moved about 0.85 m closer to the machine (from `[-6.7,-0.2]`) so he stands "at" it. Spawn was moved about 0.4 m inward so the camera is less cramped against the elevator wall.
