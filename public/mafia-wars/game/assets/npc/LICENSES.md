# NPC asset license manifest (M6.7A)

Every file in `assets/npc/` is built by `tools/npc/build_npc_library.py` (Blender
5.2, background mode) from the two CC0 packs below. No other source is used.
No Nerdie Blaq Syndicate NFT artwork or metadata, no player character models
(`assets/chars/`), no Mixamo, and no paid or AI-generated assets are included.

| Pack | Author | License (as published) | Official page | Download (author's public folder) |
|---|---|---|---|---|
| Ultimate Modular Women Pack | Quaternius | CC0 1.0 Universal (Public Domain Dedication) | https://quaternius.com/packs/ultimatemodularwomen.html | https://drive.google.com/drive/folders/1720N9IGyQHXYvtvZJzazhxtTTlz-y2Vf |
| Ultimate Modular Men Pack | Quaternius | CC0 1.0 Universal (Public Domain Dedication) | https://quaternius.com/packs/ultimatemodularcharacters.html | https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX |

Each pack's own `License.txt` (SHA-256 `e8dbf915a2b82229913e301a0787696611241bdefec4832bc084f54161db1efe`, identical in both packs) reads:
"License: CC0 1.0 Universal (CC0 1.0) Public Domain Dedication https://creativecommons.org/publicdomain/zero/1.0/".
Retrieved 2026-10-25. CC0 requires no attribution; this manifest records provenance anyway.

## Imported source files

Archived outside the repository at `/Volumes/T7/NerdieBlaq/assets-src/npc/quaternius/` (Samsung T7).

| SHA-256 | File |
|---|---|
| `b0fe6e92219cd71808844a20a1a8b960fd1cf640a6546dc6362b5add6604e87c` | ultimate-modular-women/Casual.gltf |
| `fdfcf454c4de037d31973eb28d8591bd7763035d49f46b380e63b1c832dc7ddf` | ultimate-modular-women/Formal.gltf |
| `937d5c8d08fb5570f6a4e1dd79a3878335444d175aae3b0e9e2babdac36a17f7` | ultimate-modular-women/Suit.gltf |
| `e2bfc1039f429e870a0119e274c2dd45f6304f00c39f4570dfeb9ed4d97a063d` | ultimate-modular-women/Worker.gltf |
| `61cc7f85a8e9b700cdb92ae8ebd6e3bdd1e8a510b57027f6c7d8c2b6ff3b0e0f` | ultimate-modular-women/Punk.gltf |
| `65094211e53b49f6a834c617cc056834686fe794a0b515a6b97faa3e1130cc95` | ultimate-modular-women/Adventurer.gltf |
| `55c654d09a2a5ff6e3bd6158d4a1b462f181cd6f1e12a0f5e9d959f9c3abc438` | ultimate-modular-men/Casual_2.gltf |
| `76e001ea131fd76a1bd938a7862606cb8037f7049b632783580b9bf4da2371a8` | ultimate-modular-men/Beach.gltf |
| `46d3e85fa8d848ee479ab8e4672c16724ee4ea51f3af5733705a153937f93555` | ultimate-modular-men/Farmer.gltf |
| `f9224072f5e6cbb207eca250faa7f1868614a1a984074fe79c7b2862df4feb42` | ultimate-modular-men/Punk.gltf |
| `6c89fbb31b96c1a63ad94e3dee0942bd7b34bc789a5d39fd6a6a1738a9214fb3` | ultimate-modular-men/Suit.gltf |
| `e49f8ec0f8a7de72dd26b1c01e6413c9a87a9116eeee21f9364ccd36bc286335` | ultimate-modular-men/Worker.gltf |
| `21f7a61afb6bd6cef6961490c367594e3c2fc01ec1f041662131172ce763063e` | ultimate-modular-men/Adventurer.gltf |

## Exclusions

- Casual_Hoodie (men) excluded: player characters wear hoodies, and NPCs must not resemble them.
- King, Spacesuit, and Swat (men) and Medieval, SciFi, Witch, and Soldier (women) excluded: not civilian city clothing (no police or military in M6.7A).
- The Pistol mesh on the men's Suit and every weapon clip (Gun, Sword, Shoot) are removed; civilians carry no weapons.

## Modifications

Parts rebound to one shared armature per pack; duplicate vertices welded;
heads and bodies decimated (hands and colour borders protected); legs and feet
unchanged; normals and UVs dropped (flat shading in the game); parts renamed
`<part>__<outfit>`; only the unarmed clips kept (Idle, Idle_Neutral, Walk, Run,
Wave, Interact, HitRecieve, HitRecieve_2, Death, Punch_Left, Punch_Right,
Kick_Left, Kick_Right, Roll). Colours are varied at runtime by palette.

## Built files

| File | Contents |
|---|---|
| `npc_women.glb`, `npc_men.glb` | Shared skeleton + all outfit parts |
| `npc_clips_women.glb`, `npc_clips_men.glb` | Same skeleton + unarmed clips |
| `build-report.json` | Triangle counts and materials per part |
