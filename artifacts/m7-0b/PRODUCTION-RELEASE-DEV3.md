# M7.0B dev3 production release (m7.0b-dev3)

- **Released:** 2026-10-26. Founder approved the preview: "promote it its looks good".
  Status: **LIVE, verified**.
- **Contents:**
  - The gun shop is renamed **Ammo**, and Nerdie Threads is renamed **3 Piece** (three-piece suits).
  - The Neo-Urban Anime Realism style now covers the whole city:
    - houses (gable roofs, porches, garages, shuttered windows)
    - warehouses (corrugated metal, roll-up doors, clerestory windows)
    - signed shopfronts for the coming-soon shops
    - the mid-rise kit in the south and west districts
    - paver sidewalks, curbs, lawn and 69 curb trees citywide
  - The Hood blocks are unchanged.
- **Website:** `vercel promote` of the tested preview `dpl_9BwrdkwbVzAWg6ujJQ5uoQgYwzJX` produced
  production deployment `dpl_inhHfveoWBhfMenDLidr9tkEfisu` (website commit `d253d34`, game `4f7c50d`).
- **Multiplayer Worker** `nerdie-city-multiplayer-v4`: version `f93c4797-e13d-4fbf-a979-600bfa037b69`,
  from game commit `4f7c50d`. The server's resident navigation now includes the curb trees.
  - **Switches (unchanged):** CITY_DAYNIGHT on with a 60-minute day; NPC_ENABLED, NPC_REACTIONS,
    NPC_COMBAT, CITY_OCCLUSION, CITY_DESTRUCTION and HIT_REGIONS on, with 12 residents.

## Verification

- nerdieblaq.xyz serves build `m7.0b-dev3`. All 119 tracked game text files are byte-identical to
  the synced website copy at `d253d34`.
- **Live private-room checks on the production Worker, all passing:**
  - **Ammo:** entered from West Avenue, restocked AK ammo from 153 to 180, the 20 s cooldown was
    enforced, firing inside was refused (safe zone), and the exit led back to the city.
  - **Shared clock:** a late joiner computes the same hour, and a forged client clock message is
    ignored.
  - North Court entry and exit.
  - Bullet occlusion.
  - RPG destruction, including late-joiner state.
  - Hit regions.
  - **Resident combat:** sync matched across clients, and one of three runs landed hits on a
    resident 5.9 m away. The other two runs found no resident in range.
- A foreign origin gets 403.
- 273/273 game tests pass, and the website verifiers pass.
- **Not verified:** iPhone performance on a real device.

## Rollback

- **Website:** `vercel promote dpl_A4SNtTLGqjpjrkXoS47jhczDPCRQ` (m7.0b-dev2: North Market and the gun
  shop under its earlier name).
- **Worker:** `npx wrangler rollback 163eb191-cc9f-416f-a8c6-c0d998b87e79 --name nerdie-city-multiplayer-v4`.
- Roll back both together, because resident navigation and the client's street furniture must match.
