# M7.1A production release: Nerdie Central Park, Nerdie City Hall and front steps

Released 2026-10-26 at the founder's instruction ("once done promote to production"), after the
founder tested dev1 and asked for steps up to City Hall and the houses.

**Build:** `m7.1a-dev2`
- Game `5dbf829` on `codex/nerdie-city-game-m7-1a`, backed up to the private `backup` remote.
- Website `78d33d3` on `codex/nerdie-city-m7-1a`.

## What changed in production

| | Before | After |
|---|---|---|
| Website (nerdieblaq.xyz) | `dpl_inhHfveoWBhfMenDLidr9tkEfisu` (m7.0b-dev3) | `dpl_4AFCPsZtvAAene5wQx9ZUC2aFQN7`, promoted from preview `dpl_4UznQpwYyjX363LtpYmucbLdXaCh` |
| Worker `nerdie-city-multiplayer-v4` | `f93c4797` (game 4f7c50d) | `6592cea0` (game 5dbf829) |

The Worker settings are unchanged: the same `wrangler.protocol-4-1-production.toml` and the same
switches, with 12 residents.

## Rollback (roll both back together)

```
vercel promote dpl_inhHfveoWBhfMenDLidr9tkEfisu
npx wrangler rollback f93c4797 --config wrangler.protocol-4-1-production.toml
```

## Verification

- **Tests:** 284/284 multiplayer tests pass. The website verifiers pass: mobile-profile, protocol 4.1
  audio and protocol 4 release.
- **Preview:** 8/8 live smokes passed on the preview Worker `49b1d0d2`, in private rooms.
- **Production:** 8/8 live smokes passed on the production Worker, in private rooms with origin
  nerdieblaq.xyz.

| Smoke | What it covered |
|---|---|
| park | Walks from spawn to the chess plaza, the courts and City Hall. City Hall stops shots; the courts are open |
| shop | The Ammo shop |
| clock | The shared day/night clock |
| apartment | Apartment entry and exit |
| occlusion | Walls stop shots |
| destruction | Building damage |
| region | Hit regions |
| npc-combat | Resident combat; resident hits were seen |

- **Live site:** nerdieblaq.xyz serves `build=m7.1a-dev2`. `src/entry-steps.js` is served, and the
  endpoint file keeps production and preview separate.
- **Not verified:** iPhone frame time has not been measured on a device.

See `docs/MILESTONE-7-1A.md` in the game repository for the full milestone.
