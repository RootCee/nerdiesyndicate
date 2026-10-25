# M6.8A + M6.8B Production Release Record

- **Released:** 2026-10-25. Founder-approved after Mac/iPhone acceptance on the m6.8b-dev2 preview. Status: **LIVE, verified**.
- **Scope:**
  - M6.8A: city buildings, houses, brick walls, garages, and parked cars stop public-city shots.
  - M6.8B: server-authoritative RPG destruction of the original Hood Warfare block houses and garden walls.
    - Damage is decided by the server and synced to all players, with a join snapshot and repair after 5 minutes with nobody within 60 m.
    - Protected: the bank, storefronts, apartments, venue, city-plan buildings, garages, and the entrance faces of enterable houses.
  - Unchanged: the Underground combat rules (the arena shows intact while inside), wallet/NFT/ERC-6551, and the NPC population (12).
  - Resident combat (M6.7B2) ships in the code but stays **off**: `NPC_COMBAT` is not set.
- **Website:** `vercel promote` of the founder-tested preview `dpl_8tYzegK6V4F4NX5zfT9tJnX8QoT4` → production `dpl_TaRGhnoysNxePWaLBkwfCnv9kbhp` (https://nerdiesyndicate-o9pd5fwer-rootcees-projects.vercel.app) → https://nerdieblaq.xyz. Website commit `b9b8369` (codex/nerdie-city-m6-8b), build `m6.8b-dev2`.
- **Multiplayer Worker** `nerdie-city-multiplayer-v4`: version `a93214d3-6cb9-4f83-97d7-f233e10e5b6f`, from game commit `3d4c823`.
  - Features: `05c1294` (M6.8B dev2), on M6.8A `e91cf72` and M6.7B2.
  - Production config adds `CITY_OCCLUSION = "true"` and `CITY_DESTRUCTION = "true"`. `NPC_ENABLED`, `NPC_MAX_ACTIVE = "12"`, and `NPC_REACTIONS` are unchanged.

## Rollback
- **Destruction only:** set `CITY_DESTRUCTION = "false"` in `multiplayer/wrangler.protocol-4-1-production.toml` and redeploy. Bullet occlusion stays. Damage is held in memory only, so it vanishes.
- **Occlusion too:** also set `CITY_OCCLUSION = "false"` and redeploy. This restores the M6.7B1 shot rules.
- **Worker:** `wrangler rollback 3e52d694-eec5-4da6-be01-902d4378ea47 --name nerdie-city-multiplayer-v4` (M6.7B1 server).
- **Website:** `vercel rollback dpl_aEzVs23mQajZGm71UjbRZaw6k67J` (M6.7B1, commit `ef0c45b`). M6.7B1 clients ignore the structure messages, so either rollback works on its own.

## Post-deploy evidence
- 108/108 tracked game text files on nerdieblaq.xyz are byte-identical to commit `b9b8369`, and build `m6.8b-dev2` is served.
- Routes return 200: `/`, `/mafia-wars`, `/mafia-wars/play`, `/mafia-wars/game/`, `/mafia-wars/bank`, `src/structure-damage.js`, `src/hood-geometry.js`. A foreign origin gets 403.
- Production Worker, origin nerdieblaq.xyz, private rooms (no shots in public rooms):
  - **Destruction** (6 clients plus a late joiner):
    - The rifle at a player behind `hood-original-west-7` was blocked while the house was intact and with one wall open. After a second RPG through the hole opened the far wall, it hit.
    - Events were identical on all 6 clients. The shot burst points equalled the damage impacts. The late-join snapshot was `[["hood-original-west-7", 12]]`, and events totalled 402 B.
  - **Occlusion:** shots through a house did no damage. An open-yard shot hit (100 → 76), with identical health on the shooter, target, and bystander.
- Public room, observe only: 10 residents streaming, and a structure snapshot showing everything intact.
- **Pre-deploy:**
  - Multiplayer tests: 214/214.
  - Website verifiers: mobile/city, Protocol 4 release, and 4.1 audio. The Chromium UI verifier was skipped (no headless Chromium on the 8 GB Mac).
  - Founder Mac/iPhone acceptance on the preview.
