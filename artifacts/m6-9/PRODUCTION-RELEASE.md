# M6.9 Production Release Record

- **Released:** 2026-10-25. Founder-approved after iPhone/Mac acceptance of the m6.9-dev4 preview ("everything is good"; release with residents not fighting). Status: **LIVE, verified**.
- **Scope:**
  - Procedural weapon aiming (upper body, per-weapon holds, recoil, switching), with weapons seated on the body and hands on the weapons (dev2).
  - Server-decided body regions with bounded lag compensation (dev3).
  - One-shot firearm headshots for players and residents (dev4); body regions: upper torso 1.0, lower torso 0.9, arms 0.75, legs 0.7.
  - Gold headshot marker and sound.
  - Unchanged: RPG splash, the Underground, M6.8 occlusion and destruction, wallet/NFT/ERC-6551.
  - Residents do **not** fight back: `NPC_COMBAT` stays unset.
- **Website:** `vercel promote` of the founder-tested preview `dpl_EXUAfYbP8Spi4kYRmpQrucDFUPrF` → production `dpl_8kbWGVCTLTBXRRpKcae3hAQV3QZQ` (https://nerdiesyndicate-4zzq8g6om-rootcees-projects.vercel.app) → https://nerdieblaq.xyz. Website commit `fc1f47f` (codex/nerdie-city-m6-9), build `m6.9-dev4`.
- **Multiplayer Worker** `nerdie-city-multiplayer-v4`: version `3180ce70-f230-4bac-9aa8-c8769a33f30e`, from game commit `1f5cd33` (features `6ddf90d`; production config adds `HIT_REGIONS = "true"`).

## Rollback
- **Hit regions only:** set `HIT_REGIONS = "false"` in `multiplayer/wrangler.protocol-4-1-production.toml` and redeploy. This restores the old chest sphere and flat damage; the aiming visuals stay.
- **Worker:** `wrangler rollback a93214d3-6cb9-4f83-97d7-f233e10e5b6f --name nerdie-city-multiplayer-v4` (M6.8 server).
- **Website:** `vercel rollback dpl_TaRGhnoysNxePWaLBkwfCnv9kbhp` (M6.8, commit `b9b8369`). Old and new clients work with either server.

## Post-deploy evidence
- 109/109 tracked game text files on nerdieblaq.xyz are byte-identical to `fc1f47f`, and build `m6.9-dev4` is served.
- Routes return 200 (`/`, `/mafia-wars`, `/mafia-wars/play`, `/mafia-wars/game/`, `/mafia-wars/bank`, `src/hit-regions.js`). A foreign origin gets 403.
- Production Worker, origin nerdieblaq.xyz, private rooms (no shots in public rooms):
  - **Regions:** chest 24, leg 17, then a headshot did the remaining 59 and eliminated, identical on 3 clients. A forged region was refused.
  - **Destruction:** shots blocked while the house was intact and with one wall open; hit after both walls opened. Events identical on 6 clients; burst points matched; the late-join snapshot was correct.
  - **Occlusion:** shots through a house did no damage; an open-yard shot hit.
- Public room, observe only: 10 residents streaming, and a structure snapshot showing everything intact.
- **Pre-deploy:** multiplayer tests 245/245; website verifiers (mobile/city, Protocol 4 release, 4.1 audio); the Chromium UI verifier was skipped (no headless Chromium).
