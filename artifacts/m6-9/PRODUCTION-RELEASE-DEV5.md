# M6.9 Dev5 + Resident Combat Production Release Record

- **Released:** 2026-10-25. Founder-approved after preview acceptance of m6.9-dev5 ("everything checks out please promote to production"). Status: **LIVE, verified**.
- **Scope:**
  - Resident strikes and hits on residents are shown the moment they happen, at the resident's real position, identically on every client (dev5).
  - **Resident self-defense (M6.7B2) is now on in production** (`NPC_COMBAT = "true"`): aggressive residents fight back within 12 m and defensive ones within 4 m; peaceful and cautious ones flee.
  - Everything from the M6.9 release is unchanged: aiming, hit regions, one-shot headshots, M6.8 occlusion and destruction, the Underground, wallet/NFT/ERC-6551. Residents stay capped at 12 active.
- **Website:** `vercel promote` of the tested preview `dpl_9eSxKeoZyPy66mPBwykPencQ8pHd` → production `dpl_9pieJY4KNyTGu6pfpNWakXVtcB95` (https://nerdiesyndicate-58d9w1smv-rootcees-projects.vercel.app) → https://nerdieblaq.xyz. Website commit `831cee7`, build `m6.9-dev5`.
- **Multiplayer Worker** `nerdie-city-multiplayer-v4`: version `d8d88b94-2bc4-4980-bc94-a4409f0740df`, from game commit `2409057` (features `0549ae1`).
  - Production config adds `NPC_COMBAT = "true"` to `NPC_ENABLED`, `NPC_MAX_ACTIVE = "12"`, `NPC_REACTIONS`, `CITY_OCCLUSION`, `CITY_DESTRUCTION`, and `HIT_REGIONS`.

## Rollback
- **Resident combat only:** set `NPC_COMBAT = "false"` in `multiplayer/wrangler.protocol-4-1-production.toml` and redeploy. Residents keep walking and reacting.
- **Worker:** `wrangler rollback 3180ce70-f230-4bac-9aa8-c8769a33f30e --name nerdie-city-multiplayer-v4` (the M6.9 release, combat off).
- **Website:** `vercel rollback dpl_8kbWGVCTLTBXRRpKcae3hAQV3QZQ` (M6.9 dev4). Clients and servers interoperate either way.

## Post-deploy evidence
- 109/109 tracked game text files on nerdieblaq.xyz are byte-identical to `831cee7`, and build `m6.9-dev5` is served. Routes return 200; a foreign origin gets 403.
- Production Worker, origin nerdieblaq.xyz, private rooms (no shots in public rooms):
  - **Resident combat:** one leg shot (17) at an aggressive resident 11.4 m away. It struck back 6 times (11 each; shooter 100 to 34). Both NPC clients received identical `npc-hit` and `npc-strike` events with poses; an older client got no NPC traffic.
  - **Regions:** chest 24, leg 17, then a headshot did the remaining 59 and eliminated, identical on 3 clients. A forged region was refused.
  - **Destruction:** passed on two consecutive runs. One earlier run right after deploy failed, consistent with a now-shootable resident crossing the line of fire. Shots were blocked while the house was intact and with one wall open, and hit after both opened; events identical on 6 clients; burst points matched.
- Public room, observe only: 9 residents streaming; structures intact.
- **Pre-deploy:** multiplayer tests 247/247; website verifiers (mobile/city, Protocol 4 release, 4.1 audio).
