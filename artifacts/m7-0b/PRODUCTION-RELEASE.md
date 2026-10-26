# M7.0B production release (m7.0b-dev2)

- **Released:** 2026-10-26. Founder approved the preview: "please promote everything looks good".
  Status: **LIVE, verified**.
- **Contents:**
  - **M7.0A2:** the shared day/night clock (60 real minutes per in-game day) and automatic
    streetlights, signs and windows.
  - **M7.0B1:** the North Market Neo-Urban Anime Realism showcase (bank, North Court, Nerdie
    Threads, The Blaq Note, and the rest of the block plus street level).
  - **dev2:** Nerdie Arms, an enterable gun and ammo shop (free restock at the counter with a 20 s
    server cooldown, equip at the display cases, safe zone).
- **Website:** `vercel promote` of the tested preview `dpl_9zwCzvp61ue5U1fqAky7AiauVYPL` produced
  production deployment `dpl_A4SNtTLGqjpjrkXoS47jhczDPCRQ` (website commit `2244afc`, game `3c1a954`).
- **Multiplayer Worker** `nerdie-city-multiplayer-v4`: version `163eb191-cc9f-416f-a8c6-c0d998b87e79`,
  from game commit `147c690`.
  - **New switches:** `CITY_DAYNIGHT="true"` and `CITY_DAY_MINUTES="60"`.
  - **Unchanged switches:** NPC_ENABLED, NPC_REACTIONS, NPC_COMBAT, CITY_OCCLUSION,
    CITY_DESTRUCTION and HIT_REGIONS are on, with 12 residents.

## Verification

- nerdieblaq.xyz serves build `m7.0b-dev2`. All 119 tracked game text files are byte-identical to
  the synced website copy at `2244afc`.
- **Live private-room checks on the production Worker, all passing:**
  - **Shared clock:** a late joiner computes the same hour, no clock messages are sent after join,
    and a forged client clock message is ignored.
  - **Nerdie Arms:** entered from West Avenue, restocked AK ammo from 153 to 180, the 20 s cooldown
    was enforced, firing inside was refused (safe zone), and the exit led back to the city.
  - North Court entry and exit.
  - Bullet occlusion.
  - RPG destruction, including late-joiner state.
  - Hit regions.
- A foreign origin gets 403.
- 273/273 game tests pass, and the website verifiers pass.
- **Not run after release:** the resident combat sync check. The command runner's safety check was
  unavailable at the time. It passed on the preview Worker with the same code.
- **Not verified:** iPhone performance on a real device.

## Rollback

- **Website:** `vercel promote dpl_H89HiTic3Aj4NKdtnfsukSfDewxZ` (m7.0a-dev2).
- **Worker:** `npx wrangler rollback 342e2e3d-3e38-4aaf-8f94-dbca2508306b --name nerdie-city-multiplayer-v4`.
- Roll back both together: the m7.0a client has no Nerdie Arms interior.
- **Day/night only:** set `CITY_DAYNIGHT="false"` and redeploy the Worker. The city returns to its
  fixed dusk look and keeps the new buildings and the shop.
