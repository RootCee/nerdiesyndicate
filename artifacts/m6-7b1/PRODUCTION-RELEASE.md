# M6.7B1 Production Release Record

- Released: 2026-10-25 (founder-approved after Mac/iPhone acceptance on the preview), status **LIVE, verified**
- Scope: resident awareness and reactions (personalities, facing, greetings/wary looks, flinch / alert / flee from server-validated gunfire and violence, 60 s threat memory, one-hop panic). No NPC attacks or damage; population cap unchanged at 12; Underground untouched.
- Website: `vercel promote` of the founder-tested preview `nerdiesyndicate-h4u1cvrp8` (dpl_BHwTP2LG93s4GNtWXA3W7NiufW1L) → production `dpl_aEzVs23mQajZGm71UjbRZaw6k67J` (https://nerdiesyndicate-esvpetqb9-rootcees-projects.vercel.app) → https://nerdieblaq.xyz; website commit `ef0c45b` (codex/nerdie-city-m6-7b), build `m6.7b1-dev1`
- Multiplayer Worker `nerdie-city-multiplayer-v4`: `3e52d694-eec5-4da6-be01-902d4378ea47` from game commit `84a7f4d` (feature 5bba014 + production config `NPC_REACTIONS = "true"`; `NPC_ENABLED = "true"`, `NPC_MAX_ACTIVE = "12"`)

## Rollback
- Reactions only: set `NPC_REACTIONS = "false"` in `multiplayer/wrangler.protocol-4-1-production.toml` and redeploy (residents keep walking as in M6.7A).
- Residents entirely: `NPC_ENABLED = "false"` and redeploy.
- Worker: `wrangler rollback 51271802-73e1-41b7-b4e2-e4d961ecea71 --name nerdie-city-multiplayer-v4` (M6.7A server)
- Website: `vercel rollback dpl_ERVyed2dT8sbhi7s2G3CRZsiBbbD` (M6.7A, commit f5485ca). M6.7A clients ignore the optional behaviour value, so either rollback works on its own.

## Post-deploy evidence
- 156/156 tracked game files on nerdieblaq.xyz byte-identical to commit ef0c45b; build `m6.7b1-dev1` served
- Routes 200: `/`, `/mafia-wars`, `/mafia-wars/play`, `/mafia-wars/game/`, `/mafia-wars/bank`, `/mafia-wars/game/src/npc-behavior.js`
- Production Worker from origin nerdieblaq.xyz, private room (no shots in public rooms): accepted gunfire made nearby residents flinch and stand alert; two NPC clients identical (825 states, 0 mismatched); older client received no NPC traffic; ~1.4 KB/s
- Public room without gunfire: 10 residents, 739 shared states identical, ~1.6 KB/s; Underground still fills with 11 bots and a live match; foreign origin → 403
- Pre-deploy: multiplayer 170/170, website wallet 8/8 and all verifiers, founder Mac/iPhone acceptance on the preview
