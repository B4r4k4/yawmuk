# Scene report — `home` (البيت، صباح الاثنين 07:00)

**Files:** `src/scenes/home.js` (scene), `src/scenes/home/batch.js` (static-geometry batcher), `src/scenes/home/textures.js` (canvas textures).
The subfolder is not picked up by the registry glob (`../scenes/*.js`), so it is only used as helper imports.

## What was built
A 12 × 9 m open-plan ground floor of a modest rented house in Columbus on a snowy winter morning. The layout follows `docs/hotspots.md`:
- **Kitchen (back-left):** an L-shaped dark-wood counter with a light counter top, a sink under the window, a cooktop with a red kettle, oven, upper cabinets, a range hood, a white subway-tile backsplash, herbs on the sill and floating shelves with jars.
  - **Fridge (hotspot):** it stands in the NW corner with its door **open 60°**. Inside are a lit back panel, shelves of coloured items and door bins.
  - **On the counter next to it:** a colourful candy bag, a small brown vanilla bottle and a wrapped chicken tray.
- **Dining (centre):** a 1.6 × 0.9 oak table with four chairs. One chair is pulled out, where Sara got up from. On the table are two mugs (one steaming), toast and dates. A green pendant lamp with a warm point light hangs above it.
  - **Laptop (hotspot):** it faces the player. Its emissive screen shows a house listing with a green "pre-approved" badge, drawn with shapes only and no text.
- **Living (right):** a grey-blue sofa with cushions and a throw, a floor lamp, a coffee table and a red-orange geometric rug. There is a TV on a stand against the east wall, a fiddle-leaf fig and a radiator under the east window.
  - **Bookshelf:** the **green Mushaf sits alone on a small stand on the top shelf**, with no text.
- **Prayer corner (NE):** a prayer rug whose mihrab arch points at the north wall (qibla), a tasbih and folded kufi on a low stand, framed geometric art and a snake plant.
- **Entry (front):** a closed wooden front door (the exit), a shoe rack with shoes, an entry mat and a coat rack with winter coats. A staircase runs along the south wall.
  - **Mail table (hotspot):** it sits next to the stairs with a mirror above. On it are white envelopes, a glossy **red store envelope**, a key bowl and a succulent.
  - There is also a study desk under the west window with textbooks and a lamp, for Adam's night classes, and a wall clock showing about 07:00.
- **Outside, seen through the windows:** snow ground, snow-capped pines, a white fence, two neighbour houses, a snowman, bushes, a porch step and a shovelled path. Falling snow is one `THREE.Points` object.
- **Ambient `update()`:** the steam puffs rise, the curtains sway slightly, snow falls, and Khadija and Bilal hold their props up. Bilal holds a phone with a glowing screen; Khadija holds the candy bag. Nothing is allocated per frame.

### Camera-friendly "dollhouse" walls
- Walls are **one-sided, inward-facing planes**. Everything mounted on the south wall (door, trim, mirror, art) is also one-sided quads. When the follow/attract camera is outside a wall, that wall disappears and the room stays visible.
- Wall colliders are 1.1 m tall, under the engine's 1.2 m camera-collider threshold. They still block the player, but they never pull the camera into Adam's face. The same 1.1 m cap is applied to every furniture collider.
- There is no ceiling. The engine's sun shines in, and the walls don't cast shadows, so the room reads bright and morning-like.

## Contract output
| item | value |
|---|---|
| spawn | `[0,0,3]`, yaw 0 (looking −z into the house) |
| hotspots | `laptop [0.12,0.85,-1.42] r1.8`, `fridge [-5.0,1.0,-3.3] r1.9`, `mail_table [-2.0,0.9,3.95] r1.7` (bilingual labels) |
| npcs | `sara [0.9,0,-2.2]`, `khadija [-4.4,0,-3.0]`, `bilal [-1.2,0,3.4]`. Looks follow hotspots.md (hijab colours, glasses, heights). Khadija and Bilal are passed as `object` built with `ctx.makeNPC` plus props (candy bag; headphones round the neck and a phone), with a fallback to `look` data if `makeNPC` is missing. |
| exit | `[4.5,0,4.0]` r1.5 (front door) |
| lights | `'day'`, plus 4 local point lights (pendant, window fill, fridge, floor lamp) without shadows |
| colliders | 32 AABBs: 4 walls plus the furniture |

## Performance
- **Meshes:** 19 meshes plus 1 `Points` for the scene itself. Static props are merged into 10 vertex-coloured batches by material: walls, matte, satin, metal, glow, glass, tile, art, outside, plus the floor.
- **Whole scene at runtime:** the engine reported **85 meshes and about 14.7k triangles**, which includes the engine's NPCs, markers and labels.
- **Textures:** 6 canvas textures — floor planks, subway tiles, rug, prayer rug, star art and laptop screen.
- **`dispose()`:** it releases every geometry, material and texture the scene creates. The engine's own tree disposal is harmless on top of that.

## Verification
- `npx vite build`: passes.
- **Headless Chrome check:** the Chrome-extension browser could not reach *any* localhost dev server (an error page on every port, other agents' too). So I drove local headless Chrome over CDP with `npm run dev`-equivalent `vite --port 5191`, loading `?scene=home&nointro=1`.
  - The scene loaded as the real file (`isPlaceholder: false`) with all 3 hotspots and 3 NPCs. There were no console errors or warnings and no auto-placed hotspots.
  - I took screenshots from spawn, from above, and of the kitchen, living room, laptop and entry, and fixed the problems they showed: floating south-wall frames, a dark mirror, Sara clipping a chair, the top-cap band across the spawn view, and a dark south wall.
- **Walkability:** a flood-fill over the live collider list (player radius 0.3, 0.1 m grid) from spawn. Closest reachable distance vs. radius: laptop 1.08/1.8, fridge 0/1.9, mail_table 0.15/1.7, exit 0/1.5. Everything is reachable.
- The dev server I started has been stopped.

## Notes / suggestions for the lead
- **Desk vs. laptop:** the task brief mentioned "a laptop on a desk", but `hotspots.md` (binding) puts the laptop on the dining table, so that's where it is. The extra desk holds textbooks only, to avoid a second laptop.
- **Mail table vs. door:** hotspots.md puts the mail table at x≈−2 while the door is at x=4.5. I kept the coordinates and made the table "by the stairs / entry".
- **Engine (not my code):**
  - `makeNPC` hijab faces look a little odd from some angles.
  - `src/engine/README.md` did not exist while I worked, so I used `ctx.makeNPC`/`ctx.rand` (from `kit.js`) only with fallbacks and created my own materials.

---

## Update 2026-10-05: premise change (the Reed family is Christian; Omar is the Muslim friend)
I re-read the scene after the Phase-3 QA edit, which removed the fridge point light so the scene keeps 3 point lights. Then I applied the `home` items from "CHANGES FOR SCENE AGENTS" in `docs/hotspots.md` and the new `content/script/home.json`:
- **Removed:** the prayer rug, the Mushaf and its stand, the tasbih and the kufi. No family member wears a hijab. `prayerRug()` is gone from `home/textures.js`.
- **Bookshelf:** a brown leather Bible (`#6b4423`, 0.16×0.04×0.22) lies on the top shelf next to two framed family photos. A small honey-wood cross (`#a0763f`, 0.30 and 0.18 bars) hangs on the wall above the shelf at y≈2.1. The shelf is 1.8 m tall, so the requested ~1.7 m had to go a little higher.
- **NE corner:** it is now a reading nook with a terracotta armchair, a side table and a 3-photo family gallery. The photos come from a new canvas `familyPhoto()` texture of four simple figures in the snow, with no faces or text.
- **Counter by the fridge:**
  - added a red Jell-O box, a dark red-wine bottle (`#3a0d14`) with a neck and capsule, the small vanilla bottle, and pink beef in cling wrap on a foam tray;
  - removed the candy bag and the chicken tray;
  - left the fridge unchanged.
- **By the front door:** a snow shovel (wood handle, black blade) leans on the wall between the door and the coat rack. It has a collider, and the exit stays reachable.
- **Table and sofa:** there are now 3 coffee mugs, the pulled-out chair is Omar's, and a crumpled blanket and pillow sit on the sofa (Ben slept there).
- **NPCs:**
  - `omar [1.0,0,-2.3]`: 1.85 m, olive jacket, short beard, grey wool beanie, coffee mug in hand.
  - `carol [-4.4,0,-3.0]`: 1.62 m, silver bob, olive cardigan, glasses, menu notepad.
  - `ben [-1.2,0,3.4]`: messy dark-blond hair, grey hoodie, headphones, phone.
  - `bg_sarah`: seated at the west end of the table facing her laptop, `animate:false`, `collide:false`.
  - Each NPC is used once at home, so `stations` isn't needed. `playerLook` isn't needed either, because Adam is indoors and uses the default `PLAYER` look.
- **Unchanged:** the hotspot ids and positions, the spawn, the exit and the ≤3 point lights.

**Verification**
- `npm run build`: passes.
- `npm test`: 178/178 pass. The very first run had the network-dependent citation verifier crash; the reruns were clean.
- **Headless Chrome** (my own CDP driver, dev server stopped afterwards): 107 meshes and 16.2k triangles including the engine's NPCs and markers, 3 point lights, 0 console errors, all hotspots and the exit reachable.
- `npm run test:e2e`: home passes in all 4 configurations (desktop/mobile × ar/en). The only failures were in `private_events`: a 404 on a dist asset whose hash changed mid-run, and `gifts_birthday` choice data. Neither is in home.

**Note for the engine owner:** the README says seated figures use `legs.rotation.x = -Math.PI/2`. In this rig that swings the legs backwards. `+Math.PI/2` puts the thighs forward, and that is what home uses.
