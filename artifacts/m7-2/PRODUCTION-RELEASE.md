# M7.2 production release: Nerdie Blaq Academy and movement smoothing

Released 2026-10-26 at the founder's instruction ("everything looks good please promote to
production"), after the founder approved the protected M7.2 preview.

**Build:** `m7.2-dev1`
- Game `34355f1` on `codex/nerdie-city-game-m7-2`, backed up to the private `backup` remote.
- Website `b93dffd` on `codex/nerdie-city-m7-2`.

## What changed in production

| | Before | After |
|---|---|---|
| Website (nerdieblaq.xyz) | `dpl_5HgpqaK7D2cz8rBdAKzKNFjabQH2` (M7.1D release record) | `dpl_B4JeyDTFNWy5zhdhZg9ZSRcCUzZK`, promoted from preview `dpl_BC4LBLAxCvNduLn7LK9LMvyfzkWZ` |
| Worker `nerdie-city-multiplayer-v4` | `54b38e64-0d81-40c1-bf7c-f32c3503432f` (game 3c6a043) | `fd0e6f3e-3436-4d6f-a5c2-d1da78f6798d` (game 34355f1) |

The Worker settings are unchanged: the same `wrangler.protocol-4-1-production.toml`, production-only
origin, and existing feature switches. The server bundle now includes the M7.2 Academy geometry and
movement bounds used for authoritative multiplayer state.

## Rollback (roll both back together)

```sh
vercel promote dpl_5HgpqaK7D2cz8rBdAKzKNFjabQH2
npx wrangler rollback 54b38e64-0d81-40c1-bf7c-f32c3503432f --config wrangler.protocol-4-1-production.toml
```

## Verification

- **Acceptance:** the founder approved the protected M7.2 preview before promotion.
- **Tests:** 329/329 multiplayer tests pass. The website mobile-profile, Protocol 4.1 audio, and
  Protocol 4 release verifiers pass; the production Vite build and game performance budgets pass.
- **Worker:** production `/health` returns HTTP 200 with Protocol 4, capacity 20, Underground
  capacity 12, Durable Object WebSockets, and the exact `https://nerdieblaq.xyz` CORS origin.
- **Live site:** `nerdieblaq.xyz` serves `build=m7.2-dev1`; its manifest records game commit
  `34355f18f5d5f1a76d28acdae29c4975a8c37154`; and its endpoint resolver sends production hosts to
  `nerdie-city-multiplayer-v4` while retaining the isolated Worker for Vercel previews.
- **Vercel:** production deployment `dpl_B4JeyDTFNWy5zhdhZg9ZSRcCUzZK` is READY and owns the
  `nerdieblaq.xyz` alias. The production build completed without errors; existing Node engine,
  Browserslist age, and large-chunk advisories remain warnings only.
- **Visual regression:** the founder completed visual acceptance on the protected preview. Automated
  browser inspection was unavailable during the production handoff, so production verification used
  the live HTTP assets, manifest, endpoint resolver, Worker health response, and deployment logs.
