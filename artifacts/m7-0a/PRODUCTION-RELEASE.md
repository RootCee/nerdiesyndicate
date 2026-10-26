# M7.0A production release (m7.0a-dev2)

- **Released:** 2026-10-25. Founder approved the M7.0A preview ("everything is working out") and asked
  for the walking/running stutter to be fixed and promoted. Status: **LIVE, verified**.
- **Website:** `vercel promote` of the tested preview `dpl_8ABN4nb2GoCmfRocuBVQfEh6Poim` produced
  production deployment `dpl_H89HiTic3Aj4NKdtnfsukSfDewxZ` (website commit `bdd9dca`, game `6ea5ffe`).
- **Multiplayer Worker** `nerdie-city-multiplayer-v4`: version `342e2e3d-3e38-4aaf-8f94-dbca2508306b`,
  from game commit `6ea5ffe`. Switches unchanged (NPC_ENABLED, NPC_REACTIONS, NPC_COMBAT, CITY_OCCLUSION,
  CITY_DESTRUCTION, HIT_REGIONS on; 12 residents). The server had to ship with the website because
  the North Court apartment space moved (z 100 to z 112).

## Verification
- nerdieblaq.xyz serves build `m7.0a-dev2`. All 112 tracked game text files are byte-identical to
  the synced website copy at `bdd9dca`.
- Live private-room checks on the production Worker all pass:
  - apartment entry at the new door, refusal at the old door, exit to the city
  - bullet occlusion
  - RPG destruction, with late-joiner state
  - hit regions
  - resident combat sync
- A foreign origin gets 403.
- 258/258 game tests pass; the website verifiers pass.
- Not verified: iPhone smoothness on a real device.

## Rollback
- **Website:** `vercel promote dpl_9pieJY4KNyTGu6pfpNWakXVtcB95` (m6.9-dev5).
- **Worker:** `npx wrangler rollback d8d88b94-2bc4-4980-bc94-a4409f0740df --name nerdie-city-multiplayer-v4`.
- Roll back both together: the m6.9 client expects the apartment door at z 100.
