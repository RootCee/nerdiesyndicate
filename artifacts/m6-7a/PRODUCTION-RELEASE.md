# M6.7A Production Release Record

- Released: 2026-10-25 (founder-approved after Mac/iPhone acceptance on the preview), status **LIVE, verified**
- Scope: server-run civilian residents (CC0 civilian library, sidewalk navigation, avoidance, proximity simulation, distance-based rendering). No combat, damage, guards, businesses, police, NFT, or blockchain changes.
- Website: `vercel promote` of the founder-tested preview `nerdiesyndicate-n8xdgijo3` (dpl_CCxYDjWg9uWcYoAiZ9UacAz2NtpA) → production `dpl_ERVyed2dT8sbhi7s2G3CRZsiBbbD` (https://nerdiesyndicate-4946xmq3y-rootcees-projects.vercel.app) → https://nerdieblaq.xyz; website commit `f5485ca` (codex/nerdie-city-m6-7), build `m6.7-dev1`
- Multiplayer Worker `nerdie-city-multiplayer-v4`: `51271802-73e1-41b7-b4e2-e4d961ecea71` from game commit `766135e` (codex/nerdie-city-game-m6-7: feature 45cb43d + production config `NPC_ENABLED = "true"`, `NPC_MAX_ACTIVE = "12"`)

## Rollback
- Turn residents off only: set `NPC_ENABLED = "false"` in `multiplayer/wrangler.protocol-4-1-production.toml` and redeploy (clients then behave as M6.6).
- Worker: `wrangler rollback 029739c6-8345-4c9c-af60-49a0e6354493 --name nerdie-city-multiplayer-v4` (M6.6 server)
- Website: `vercel rollback dpl_FDpaUW6tkWEyCFnb625ewfRCR85j` (M6.6, commit d4ccb32). Old clients never request residents, so either rollback works on its own.

## Post-deploy evidence
- 155/155 tracked game files (code, data, NPC models, license manifest) on nerdieblaq.xyz byte-identical to commit f5485ca; build `m6.7-dev1` served
- Routes 200: `/`, `/mafia-wars`, `/mafia-wars/play`, `/mafia-wars/game/`, `/mafia-wars/bank`, `/mafia-wars/game/assets/npc/npc_men.glb`
- Production Worker from origin nerdieblaq.xyz: two NPC-capable clients saw the same 10 residents with identical identities, 927 shared states identical, ~1.4 KB/s each; an older client received no NPC traffic; Underground still fills with 11 bots and a live match; foreign origin → 403
- Pre-deploy: multiplayer 156/156, website wallet 8/8 and all verifiers, founder Mac/iPhone acceptance on the preview
