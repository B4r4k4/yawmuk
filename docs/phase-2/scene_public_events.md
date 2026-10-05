# Scene report: `public_events` (company holiday party, hotel ballroom)

**Files**
- `src/scenes/public_events.js`: the scene. Default export `{ id, title, build(ctx) }`, following the TEAM_BRIEF contract.
- `src/scenes/public_events/textures.js`: canvas textures for the carpet, wall elevation, coffered ceiling, curtain, dusk windows, doors, charity banner and TV screen. None of them contain text.

## Layout (metres; hall x −11..11, z −8..8, ceiling 5)
| Item | Position | Notes |
|---|---|---|
| spawn | `[0,0,6.6]`, yaw 0 (looks −z) | in front of the panelled entrance double doors (south wall) |
| exit | `[10,0,-6]`, r 1.5 | side door on the east wall with a green emissive EXIT box |
| `gift_table` | `[-6.1,0.9,5]`, r 1.8 | table with a red cloth, 10 wrapped boxes with ribbons and bows. 4 more gifts sit under the tree |
| `dinner_table` | `[0,0.8,-1]`, r 2.0 | Jake's round table: white cloth, 3 candles, greenery, 7 plates and glasses (3 with dark red contents), 2 dark bottles with no labels. The front slot has no chair so the player can walk up |
| `raffle_booth` | `[5.6,0.9,5]`, r 1.8 | table with a sky-blue cloth, front drape and overhead banner (hearts/tickets), red and white ticket jars, a 1.5×0.9 TV on a stand, a prize pedestal with a wrapped box, and balloons |
| NPCs | dave `[-5,3.9]`, jake `[0.9,-0.2]`, linda `[6.55,5]` | Dave has a Santa hat, built with `ctx.makeNPC` and passed through `object`; his `look` is also included. Jake wears a black suit with a white shirt and a blond beard. Linda wears a royal-blue dress |
| background NPCs | bg_emily (Jake's table), bg_priya and bg_tom (coffee/cider table), bg_amina (purple hijab), bg_marcus, bg_grace, bg_kenji | They stand at empty chair slots and face their table |

Other props:
- 6 round tables with 41 gold Chiavari chairs (instanced)
- Stage with a velvet curtain, gold valance, podium and mic, plus 2 poinsettias
- A 3.5 m holiday tree with ornaments and a star (back-left)
- Buffet under 3 dusk windows on the west wall, with chafing dishes and fruit
- Coffee urn, sparkling apple-juice bottles, cups and a dessert stand on the east wall
- Pilasters with gilded capitals and warm sconces
- 3 chandeliers
- 4 strands of string lights across the hall

## Technical
- **Budget:** 79 meshes in the scene group, 35 of them InstancedMesh (695 instances), plus 5 PointLights with no shadows. NPC meshes are built by the engine and not counted here.
- **Lights:** `lights: 'evening'`. The 136 string bulbs and 64 tree bulbs are one InstancedMesh. Their twinkle comes from a single `uTime` shader uniform injected with `onBeforeCompile`, and each bulb's phase is derived from its instance position. Candle flicker changes `emissiveIntensity` on a shared material. `update()` allocates nothing.
- **Walls (dollhouse view):** walls are inward-facing planes, so they are invisible from outside. Wall colliders are only 1.1 m tall, which blocks the player but not the camera (`setCameraColliders` ignores colliders 1.2 m or shorter). The third-person camera can back past a wall and still see the hall instead of being pulled onto the player's shoulder. All furniture colliders are also 1.1 m or shorter.
- **Shadows:** walls and ceiling do not cast shadows, so the low evening sun does not darken half the room.
- **Disposal:** `dispose()` frees every geometry, material, canvas texture and InstancedMesh the scene owns. The engine's `disposeTree` covers the rest, and repeat disposal is harmless.
- **ctx helpers:** the scene uses only `ctx.THREE`, `ctx.group` and `ctx.makeNPC` (for Dave's hat). It does not use `ctx.mats` or the kit helpers, because `src/engine/README.md` did not exist.

## Verification
- `npx vite build`: passes.
- **Headless Node check:** I stubbed the 2D canvas and ran `build()`, `update()` and `dispose()`; all three ran without errors. A flood-fill on a 0.1 m grid (player radius 0.3, all colliders including NPCs) showed:
  - the spawn point is free;
  - the player can reach all 3 hotspots and the exit from the spawn.
- **Browser screenshot: not done.** The Chrome extension's browser returned ERR_CONNECTION_REFUSED for this machine's dev server, on localhost, 127.0.0.1 and other agents' ports. It looks like the browser runs on a different host. Someone with a local browser should check it visually: `npx vite` then `?scene=public_events&debug=1&nointro=1`.
- **Unverified:** the twinkle shader has not been run on a real GPU. It patches the standard r170 chunks `#include <common>`, `<begin_vertex>` and `<opaque_fragment>`.

## Notes for the lead
- The script calls Jake's table drinks wine. They show only as dark unlabelled bottles and dark red glasses, with no brands.
- Possible tuning after a real look: the PointLight intensities (22/12/12/10/10) and how strongly the evening hemisphere light tints the interior.
