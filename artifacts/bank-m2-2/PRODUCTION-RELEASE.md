# Bank Milestone 2.2 production releases

## rel3: ghost player fix (2026-10-27)

Released at the founder's instruction ("yes go on ahead") after the founder reported their avatar
staying in the city overnight and counted as a player. The founder ran the two production commands.

**Build:** `bank-m2.2-rel3`
- Game `192da0d` on `codex/nerdie-city-m2-2` (fix in `0ca3826`), backed up to the private `backup` remote.
- Website `1f69f2d` on `codex/nerdie-city-bank-m2-2`.

**Cause:** the rel1 Worker deploy (09:11Z) restarted the room Durable Object. A restart drops sockets
without `webSocketClose`, so the saved player stayed `connected: true` forever, and the browser's
reconnect was refused as a duplicate session (the rejoin made a second player). A sleeping device
could also leave a silent socket open, since the server had no liveness check.

**Fix:** on load the room releases saved players whose socket did not survive (normal 15 s reconnect
grace, same identity). An alarm runs every 60 s while anyone is connected and closes sockets silent for
3 minutes (code 4000). The client pings every 20 s from a timer, so a hidden tab stays logged in.

| | Before | After |
|---|---|---|
| Website (nerdieblaq.xyz) | `dpl_3PGzR8ppRfMCAR33ZivR27JXHdPd` (rel2) | `dpl_PrhVGiHhMbTuVS9Q4JmB5n1YpZPs`, promoted from preview `dpl_Du39FSEf8TwJWmnUZxFXDqtsWdhd` |
| Worker `nerdie-city-multiplayer-v4` | `abb5d73e-bca7-43d5-a6f8-7bbc999bf582` | `c805c02a-f0fe-4f65-a4a1-581b5c74d86e` (game 192da0d) |

Worker settings unchanged (`wrangler.protocol-4-1-production.toml`).

### Rollback (roll both back together)

```sh
vercel promote dpl_3PGzR8ppRfMCAR33ZivR27JXHdPd
npx wrangler rollback abb5d73e-bca7-43d5-a6f8-7bbc999bf582 --config wrangler.protocol-4-1-production.toml
```

### Verification

- 344/344 multiplayer tests, including `multiplayer/test/stale-presence.test.js` (restart
  reconciliation and the stale sweep, through the real Durable Object class).
- `scripts/verify-mafia-wars-mobile-profile.mjs` passes.
- Live: `nerdieblaq.xyz` serves `bank-m2.2-rel3` with game commit `192da0d8a1d1da5c4990ef6244e3a274463a1a4a`
  and the keepalive client. `/`, `/mafia-wars`, `/mafia-wars/play` and `/mafia-wars/bank` return 200.
  Worker `/health` returns 200 with Protocol 4 and capacities 20 / 12.

## rel1 and rel2 (2026-10-27, recorded afterwards)

- **rel1** (`bank-m2.2-rel1`, game `89b3957`, website `4da8a20`): production reads the City Service,
  and permanent residents are switched on in production multiplayer. Worker `fd0e6f3e` → `abb5d73e` (09:11Z).
- **rel2** (`bank-m2.2-rel2`, game `ff4e1e2`, website `ab4cbb4`): founder wallet sign-in and Market
  Intelligence. Website production `dpl_BRmBv6WExguKkTEzqhFtpvQ9xAqe` (M7.2) → `dpl_3PGzR8ppRfMCAR33ZivR27JXHdPd`.
- Rollback to M7.2: `vercel promote dpl_BRmBv6WExguKkTEzqhFtpvQ9xAqe` plus
  `npx wrangler rollback fd0e6f3e-3436-4d6f-a5c2-d1da78f6798d --config wrangler.protocol-4-1-production.toml`.
  The City Service Worker (`nerdie-city-service`) is separate and keeps running either way.
