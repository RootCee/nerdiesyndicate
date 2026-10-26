# M7.1D production release: interactive chess and seated players

Released 2026-10-26 at the founder's instruction ("its working. lets promote it to production"),
after the founder tested dev2 on the preview.

**Build:** `m7.1d-dev2`
- Game `3c6a043` on `codex/nerdie-city-game-m7-1d`, backed up to the private `backup` remote.
- Website `f83fbb1` on `codex/nerdie-city-m7-1d`.

## What changed in production

| | Before | After |
|---|---|---|
| Website (nerdieblaq.xyz) | `dpl_9CtQdddCZJ2jrNgjsrYknHkwPwN3` (m7.1a-dev2) | `dpl_6FWxuVMVTdyTJnEGTdiGse7ByhoV`, promoted from preview `dpl_BkLNDRgS65AkwQCDNtCQREJ5p11q` |
| Worker `nerdie-city-multiplayer-v4` | `6592cea0` (game 5dbf829) | `54b38e64` (game 3c6a043) |

The Worker settings are unchanged: the same `wrangler.protocol-4-1-production.toml` and the same
switches, with 12 residents. The server bundle now includes chess.js 1.4.0 (BSD-2-Clause).

## Rollback (roll both back together)

```
vercel promote dpl_9CtQdddCZJ2jrNgjsrYknHkwPwN3
npx wrangler rollback 6592cea0 --config wrangler.protocol-4-1-production.toml
```

## Verification

- **Tests:** 317/317 multiplayer tests pass. The website verifiers pass: mobile-profile, protocol 4.1
  audio and protocol 4 release.
- **Production smokes** (private rooms, origin nerdieblaq.xyz):
  - The chess smoke passed. It covers player versus player to checkmate (same result for both
    players and the spectator), duplicate and spectator interference refused, a resident on the
    stool answering moves, reconnect to the same game, and an exhibition advancing.
  - The first chess run failed at its first step. The server reported the walking test player as
    still too far from the seat, which is consistent with a movement correction during the scripted
    walk. A re-run passed every step.
  - Park, shop, clock, apartment, occlusion, destruction, hit regions and resident combat all
    passed, and resident hits were seen.
- **Live site:** nerdieblaq.xyz serves `build=m7.1d-dev2`, and the endpoint file points production
  at `nerdie-city-multiplayer-v4`.
- **Not verified:** iPhone frame time has not been measured on a device.
