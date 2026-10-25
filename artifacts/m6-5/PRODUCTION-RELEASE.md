# M6.5.1 Production Release Record

- Released: 2026-10-25 (founder-approved after Mac/iPhone acceptance on the preview), status **LIVE, verified**
- Scope: Underground 6v6 with server AI fill, AI engagement fix, first/third-person camera choice, crosshair-true multiplayer aim
- Method: `vercel promote` of the founder-tested preview `nerdiesyndicate-ot8i2qupj` (dpl_DThAduTaSBFe8qnEuwWa3wbBMQvd)
- Production deployment: `dpl_GqE45ur9ec21tkEfpZFLRZNxb2Tb` (https://nerdiesyndicate-9ktvd5ydg-rootcees-projects.vercel.app) → https://nerdieblaq.xyz
- Website commit: `9706d18157416ad3e476bf14cab15d4511d2070f` (codex/nerdie-city-m6-5; origin/main still 81c2b46), build `m6.5-dev2`
- Game source commit: `3dab9c5a718833139f52a3d3e9c8d9f322e7982f` (codex/nerdie-city-game-m6-5, local only)
- Multiplayer Worker `nerdie-city-multiplayer-v4`: `029739c6-8345-4c9c-af60-49a0e6354493` from `3dab9c5` (`wrangler.protocol-4-1-production.toml`; same Durable Object class and migration)

## Rollback
- Website: `vercel rollback dpl_DFYzCPx6HtmUuziLrK8Vemhurr9w` (M6.4.2, commit 9e95a06, nerdiesyndicate-nak4prmik)
- Worker: `wrangler rollback 59118a5d-f02f-4757-b0ae-ca251018f086 --name nerdie-city-multiplayer-v4` (M6.4.2 server)
- Roll back both together: M6.4.2 clients do not render M6.5 bots or match state.

## Post-deploy evidence
- 91/91 tracked game code files on nerdieblaq.xyz byte-identical to commit 9706d18; build `m6.5-dev2` served
- Routes 200: `/`, `/mafia-wars`, `/mafia-wars/play`, `/mafia-wars/game/`, `/mafia-wars/bank`
- Production Worker from origin nerdieblaq.xyz: /health ok (protocol 4, cap 20, underground 12); matchmake ticket; WebSocket open; zero AI traffic in the city; entering the Underground gave 11 bots, a team (blue), a live match, and 125 bot-state / 219 shot / 56 impact messages in 12 s; foreign origin → 403
- Pre-deploy: multiplayer 121/121 (incl. sustained full-match AI and aim alignment tests); website wallet, mobile profile, Protocol 4 release verifiers pass; founder Mac/iPhone gameplay acceptance on the preview

## Follow-ups
- `_release/manifest.json` served in production still names the M6.3 source (the hand-maintained `scripts/mafia-wars-release.json` had not been updated since M6.3). Fixed on the branch after the release (metadata only, read by no runtime code); it ships with the next promotion.
- Known pre-existing: https://www.nerdieblaq.xyz fails TLS and is not in the Worker allow-list.
