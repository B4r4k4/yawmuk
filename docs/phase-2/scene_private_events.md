# Scene report — `private_events` (the neighborhood: condolence, birthday, wedding)

**Files:** `src/scenes/private_events.js` (scene, default export per contract), `src/scenes/private_events/kit.js` (canvas textures, unit geometries, instance batchers; not picked up by the registry glob since it lives in a sub-folder).

## Layout (metres; +x right, +z toward camera at spawn)
- **Street:** 7 m asphalt road from z=+31 to a turning circle (r=6.8, ≈14 m diameter) centred at z=−8.5, ring sidewalk, straight sidewalks + curbs, faded centre dashes, patchy snow on yellowed winter lawns (canvas-noise grass), bare trees (instanced trunk + limbs), snow-capped evergreens framing the edges, mailboxes, 4 street lamps, hedges.
- **Houses (6):** gabled, siding-textured, snow-dusted roofs, shutters, framed windows, doors and stoops. They include Harris (`#8fa3b5`), Adam (white with a green door) and Garcia (`#f2d98b`), plus 3 filler houses.
- **Zone 1, Harris porch** (left, porch at x −8.5…−6.3, z 3.4…8.6): a white porch with railings and posts, a white wreath on the door, a rocking chair with a grey cushion, and a side table with a foil-covered dish. Five muted bouquets (white, cream and soft yellow) sit on the steps and the porch. There are no bright colours here.
- **Zone 2, Garcia yard** (right, x 5.4…10.5, z −1.6…5.5): a white picket fence with a 2.4 m gate. The party table has a canvas-striped cloth, a green cake with 5 candles and flames, plates and cups, and a dark-red gift bag with a gold band and handle. There is a green dinosaur bounce house (head, eyes and back spikes) and 19 green, white and gold balloons that bob gently. Pennant bunting runs from the eaves to the gate posts.
- **Zone 3, community hall** (end of the cul-de-sac, x −6…6, z −25…−17, brick texture `#a0522d`): double doors swung open and warm glowing windows. Outside are a white flower-arch (half-torus with blooms), planters with white flowers, and string-light swags across the façade and the approach. The sign shows the couple's names through `makeLabel` with `depthTest: true` ("زفاف يوسف ومريم" / "Yusuf & Mariam"), on a gold-framed board. Inside are 4 round white-and-gold tables with chairs, a welcome table, pendant lights, a floral backdrop, and a dim multicolour dance floor at the back. There are 2 warm point lights. A parking lot with 2 cars sits on the east side.

## Contract values
| field | value |
|---|---|
| spawn | `[5,0,12]`, yaw 0 (looks −z, in front of Adam's house) |
| hotspots | `harris_porch [-5.45,0,6]` r1.8 · `garcia_yard [6.55,0,1.15]` r1.8 · `wedding_hall [0,0,-14.9]` r1.9 (all with bilingual labels) |
| npcs | `margaret [-7.25,0.4,6.55]` (on the porch, facing the road) · `maria [6.35,0,2.75]` (by the table, facing the gate) · `yusuf [1.45,0,-15.3]` (grey suit, white rose, facing the approach) + bg: `bg_mariam`, `bg_imam_hamza` (kufi and thobe, brown jacket), `bg_jake`, `bg_emily` (inside by the welcome table), `bg_khadija`, `bg_leo` (bounces on the castle in `update`), `bg_kid_1` |
| exit | `[0,0,-20.8]` r1.5 (inside the hall) |
| lights | `'day'` |
| colliders | 61 AABBs: houses, porch, fences, table, castle, hall walls (door gap 2.6 m), hall roof (keeps the orbit camera inside), tables, trees, lamps, cars, plus invisible boundary walls |

## Budget / performance
- **27 meshes in the scene group (16 InstancedMesh, 1,168 instances), about 49k triangles.** The engine adds the NPC figures on top (10 NPCs).
- The only per-frame work is the balloon and string matrix rewrite (19 + 19 instances, preallocated temps, no allocations) and Leo's y-bounce.
- `dispose()` frees every geometry, material, canvas texture and light the scene created, and engine `disposeTree` also covers them. Shared `mats.*` are never mutated.

## Verification
- `npx vite build` passes (the scene chunk is 24 kB).
- Headless Node harness (real `build()`, real `mats`, stubbed canvas/NPC/label):
  - Build, `update()` and `dispose()` run without errors, and there are no NaN instance matrices.
  - A grid flood fill from spawn with player radius 0.32 reaches all 3 hotspots and the exit.
  - The walkable area is sealed (x −9.8…13, z −25.8…16.4). This check found and fixed one boundary gap in the east corner.
- **No in-browser screenshot was possible.** Chrome returned `ERR_CONNECTION_REFUSED` for `127.0.0.1:5186`/`localhost:5186`, even though curl from the shell got HTTP 200. Screenshots on the LAN IP were refused by the extension ("permission denied for this domain"). Visual tuning still needs a pass in a browser: the hall point-light intensity (22) and the sign label size are the most likely to need adjusting. The dev server was stopped.

## Deviations from hotspots.md (please review)
1. **The cul-de-sac centre moved to z=−8.5 and the hall to z −17…−25.** In the spec the circle (centre z −14, r 7) overlapped the hall at z −16 and the Garcia yard. As a result, `wedding_hall` is at z −14.9 instead of −13, Yusuf at −15.3 instead of −12, and the exit at −20.8 instead of −19. The ordering and relationships are kept.
2. **`harris_porch` is at x −5.45 (spec −6.5).** It sits at the foot of the porch steps so the player can stand on the walk. The porch deck is a collider, and Margaret stands on it at y=0.4.
3. **Sky colour `#cfd9e6` is not set.** The scene has no access to `world.scene`, and the `'day'` preset background is used.
4. **`hijabColor` is passed as `hijab: '<color>'`**, which is what `makeNPC` supports.
5. **`bg_kids` is reduced to one extra child (`bg_kid_1`)** to limit NPC mesh count.
