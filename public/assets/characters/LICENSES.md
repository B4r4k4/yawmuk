# Character models — licence and credits

| File | Contents | Source | Author | Licence |
|---|---|---|---|---|
| `male.glb` | Men: casual, suit, hoodie and farmer outfits (Head / Body / Legs / Feet parts) + clips Idle, Idle_Neutral, Walk, Run, Wave, Interact | Quaternius — *Ultimate Modular Men* pack, via poly.pizza: [Casual Character](https://poly.pizza/m/kZ3DmIoGip), [Business Man](https://poly.pizza/m/JFrLIKqvCH), [Hoodie Character](https://poly.pizza/m/gKLBoRsyKe), [Farmer](https://poly.pizza/m/7pn3R6hPvE) | Quaternius ([quaternius.com](https://quaternius.com)) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |
| `female.glb` | Women: casual and formal outfits (Head / Body / Legs / Feet parts) + the same clips | Quaternius — *Ultimate Modular Women* pack, via poly.pizza: [Animated Woman (casual)](https://poly.pizza/m/qJ2gsTUBHL), [Animated Woman (formal)](https://poly.pizza/m/nIItLV9nxS) | Quaternius ([quaternius.com](https://quaternius.com)) | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) |

**Credit line:** Characters and animations by Quaternius (quaternius.com), CC0 1.0.

CC0 places the models in the public domain: free for personal, educational and commercial use, no attribution
required (credited here anyway). poly.pizza lists each of the models above as "CC0" by Quaternius (checked 2026-10-06).

## What we changed

- `tools/characters/fetch.mjs` downloads the original `.glb` files listed in `tools/characters/sources.json`;
  `tools/characters/build.mjs` merges every part of one sex into one file on the shared 62-joint rig, keeps six
  clips and compresses it with meshopt (glTF-Transform). No geometry was edited.
- Hijabs, kufis, beanies, Santa hats, beards, glasses, long skirts, long sleeves and trousers are generated at
  runtime by `src/engine/accessories.js` (our own code), fitted to these models.
