# M6.6 Production Release Record

- Released: 2026-10-25 (founder-approved after Mac/iPhone acceptance on the preview), status **LIVE, verified**
- Scope: interactive north-up city map, waypoints and road-following routes, Nerdie City Bank (wallet only), provisional storefront names (coming soon), M map / Shift+M mute
- Method: `vercel promote` of the founder-tested preview `nerdiesyndicate-hqkuo4m4o` (dpl_7hUGnp1SHM8HVoWkVXXkMX9tBNLH)
- Production deployment: `dpl_FDpaUW6tkWEyCFnb625ewfRCR85j` (https://nerdiesyndicate-du1dwmv4a-rootcees-projects.vercel.app) → https://nerdieblaq.xyz
- Website commit: `d4ccb322f908` (codex/nerdie-city-m6-6; origin/main unchanged), build `m6.6-dev1`
- Game source commit: `939fe71f93001d7885ba6e2ff43c2402b839d9ff` (codex/nerdie-city-game-m6-6, local only)
- Multiplayer Worker `nerdie-city-multiplayer-v4`: unchanged at `029739c6-8345-4c9c-af60-49a0e6354493` (M6.6 is client-only; server code identical)

## Rollback
- Website only: `vercel rollback dpl_GqE45ur9ec21tkEfpZFLRZNxb2Tb` (M6.5.1, commit 9706d18). No Worker rollback needed.

## Post-deploy evidence
- 97/97 tracked game code and data files on nerdieblaq.xyz byte-identical to commit d4ccb32; build `m6.6-dev1` served
- Routes 200: `/`, `/mafia-wars`, `/mafia-wars/play`, `/mafia-wars/game/`, `/mafia-wars/bank`, `/mafia-wars/game/src/city-map.js`
- Production Worker from origin nerdieblaq.xyz: health ok, matchmake, WebSocket, zero AI traffic in the city, Underground 11 bots + live match
- Pre-deploy: multiplayer 140/140 (incl. 19 M6.6 map/route/UI tests); website wallet 8/8, mobile profile (M6.6 checks), Protocol 4 release and audio verifiers pass; founder Mac/iPhone acceptance on the preview

## Known limitations
- World compass naming is mirrored (+z north, +x "east"): on the north-up map East Avenue / East Market appear on the left. Fix is a future world rename, not a map change.
- Pre-existing: https://www.nerdieblaq.xyz fails TLS and is not in the Worker allow-list.
