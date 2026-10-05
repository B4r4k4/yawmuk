# Phase 2 — Scene report: `school` (Scioto Valley Community College, Monday 18:30)

**File:** `src/scenes/school.js` (single file, no helpers). Default-exports `{ id:'school', title, build(ctx) }` per the TEAM_BRIEF contract.
**Build:** `npx vite build` passes (school chunk ≈ 24 kB / 9.7 kB gzip).
**Runtime check:** loaded `?scene=school&nointro=1` in headless Chrome over CDP, teleported to every hotspot and the exit, and took screenshots in both EN and AR. No scene errors. `isPlaceholder:false`. Every hotspot comes from the scene (none auto-placed). Reloading the scene through `yawmuk.goto('school')` works and resource counts stay the same.

## Layout (metres, floor y=0, ceiling 3 m)
| Area | Extent | Notes |
|---|---|---|
| Corridor | x −12…10, z −2…2 | Mint walls `#cfe3d8`, beige terrazzo floor `#d8cfbf`, deep-sage chair rail and baseboards. The first 2 m (x −12…−10) is an entrance vestibule. |
| Classroom 114 (left) | x −10…−2, z −9…−2 | White walls. 4×4 combo desks, whiteboard ("CS 1100 — Week 6 Quiz… individual work only"), projector and screen, teacher's desk, working wall clock (animated hands), two dusk windows. Interior glass band and an open door to the corridor. |
| Financial Aid office (right) | x −1…3, z 2…6 | Wide service opening with a sign above it. Wood counter with a teal stripe, service bell, brochure stand (orange/green/blue), desk with monitor and brochure piles, filing cabinet, plant, FAFSA and Scholarships posters, bulletin board. |
| Library corner (left, far end) | x 2…10, z −8…−2 | Warm cream walls, carpet, two bookshelf units (≈ 400 instanced books, coloured per instance), open study table with chairs and desk lamp, "LIBRARY · Quiet Study" sign. |
| Glass Study Room 2 | x 5.6…8.6, z −6.8…−3.8 | 3×3 m glass with an aluminium frame and frosted band. Door swung open inward. Round table, 4 chairs, 2 open laptops, papers, wall screen ("Group Project — Sprint 3"), warm pendant light. |

Corridor props: 16 blue lockers (`#3d5a80`, one InstancedMesh with a textured front face), a lit vending machine, a bench under the windows, bins, cork bulletin board, "Scioto Valley Community College" wall sign, Tutoring Center poster, and red EXIT signs. Windows and the glass doors use a canvas dusk view: a navy-to-orange sky, tree line, parking-lot lamp posts with yellow glow, and cars with red tail lights. All textures are generated on canvas. There are no external assets.

## Contract values
- **spawn** `[-9, 0, 0]`, yaw `-π/2` (faces +x down the corridor).
- **exit** `[9.5, 0, 0]`, r 1.5: glass double doors to the parking lot.
- **lights** `'evening'`. The scene also returns `sky:'#151b30'` and `fog:{color:'#1c2238', near:30, far:90}`, using the engine's optional overrides.
- **hotspots** (all `y=0` so the ring sits on the floor):
  - `exam_desk` `[-5.95, 0, -3.9]` r 1.6. The desk has an open laptop showing the quiz, a lit phone and Tyler's backpack. You can reach it from the back walkway of the classroom.
  - `aid_office` `[0.3, 0, 2.35]` r 1.6, `markerHeight 1.9`. This keeps the gem off Rosa's face and the label under the physical sign.
  - `study_room` `[7.05, 0, -3.0]` r 1.6, in front of the open glass door.
- **npcs**: `tyler [-5.22,0,-3.95]` (blue hoodie plus a red baseball cap added to the head part), `rosa [1,0,4.2]` (orange cardigan, hair bun), `dr_mitchell [6,0,-1.5]` (teal top, glasses, holds a blue folder). Background NPCs (no name label): `bg_hannah` and `bg_carlos` in the glass room, `bg_student_hijab` (navy hijab) at the lockers, and `bg_worker` (orange jacket with a reflective band) reading the bulletin board. The NPCs with extra items are passed as `object` built with `ctx.makeNPC`. The `look` data is also included.
- **colliders**: 64 AABBs (walls, desks, counter, shelves, tables, glass walls, lockers, vending machine, bench, bins).
- **Walkability**: there is a clear path from spawn to all three hotspots and the exit. Corridor clear width is ≥ 3.2 m, classroom aisles are 0.8 m, and the side aisle is 2 m.

## Performance and cleanup
- Almost all static boxes go into **one InstancedMesh per material** ("batches"). Books, lockers, desks, chairs, ceiling light panels and windows are instanced. The scene's own meshes come to about 60. `yawmuk.stats()` reports 202 meshes / ~7.9k tris in total, but most of those are the engine-built NPCs (about 20 meshes each) and the markers.
- 7 non-shadow PointLights: 3 cool lights in the corridor, 1 in the classroom, 1 neutral in the office, and 2 warm in the library and glass room. The ceiling plane faces down and casts shadows, so the low orange evening sun doesn't wash the interior. The outdoor views behind the glass doors also cast shadows, so no sun streaks come in through the doors.
- `update()` only sets the rotations of the 3 clock hands, with no per-frame allocations.
- `dispose()` releases every texture, material and geometry the scene created. Shared `ctx.mats` (glass, leaf) are only used, never changed or disposed.

## Camera (engine-specific note)
The engine pulls the camera in front of large **non-instanced** meshes by raycast (`sceneManager` occluders). All my walls are instanced, so I added one merged, **never-drawn** mesh named `cameraOccluders`. It uses a `colorWrite:false` DoubleSide material and contains the ceiling at y 2.95 plus every full-height wall. This gives a true interior third-person camera: it stays under the ceiling and inside the room you're in. Glass room walls are deliberately left out so the camera can look through them.

## Issues found in the engine (not fixed: outside my scope)
1. **`src/engine/game.js` ~line 201: `TypeError: t is not a function`** when the player enters the **exit** radius. In `world.onTick((dt, t) => …)` the parameter `t` (elapsed time) shadows the i18n `t()` used for `t('exitLocked')` / `t('exitDoor')` / `t('finishDay')`. The tick then throws every frame while you're near any exit, in any scene. Fix: rename the tick parameter (for example `(dt, time)`).
2. `makeLabel` defaults to `depthTest:false`, so hotspot and NPC name labels show through walls. For example, Tyler's label is visible from the corridor. This is cosmetic; the engine could use depthTest for NPC name labels.
3. `src/engine/README.md` did not exist when I finished. I built against `kit.js`, `mats.js` and `sceneManager.js` directly.
4. Tooling: Chrome (claude-in-chrome) could not reach `127.0.0.1:5183` ("connection refused"), and screenshots on the LAN IP are blocked by permissions. I verified with headless Chrome driven over CDP from a scratch script instead.
