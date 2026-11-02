// One adapter for the existing interior/navigation system. Tower-specific registries keep their
// stable identities while the client and authoritative spaces use the same transition code.
import { NEON_TOWER } from './neon-market-layout.js';
import { NEON_TOWER_HOMES, NEON_TOWER_LOBBY_SPACE, NEON_TOWER_PENTHOUSE_FLOOR, NEON_TOWER_RESIDENTIAL_FLOORS, neonTowerFloor, neonTowerHome } from './neon-tower-residences.js';
import { CYBER_TOWER } from './cyber-hq-layout.js';
import { CYBER_TOWER_HOMES, CYBER_TOWER_LOBBY_SPACE, CYBER_TOWER_PENTHOUSE_FLOOR, CYBER_TOWER_RESIDENTIAL_FLOORS, cyberTowerFloor, cyberTowerHome } from './cyber-tower-residences.js';

export const TOWER_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'neon', districtId: 'neon-a3', building: NEON_TOWER, lobbySpaceId: NEON_TOWER_LOBBY_SPACE, homes: NEON_TOWER_HOMES, residentialFloors: NEON_TOWER_RESIDENTIAL_FLOORS, penthouseFloor: NEON_TOWER_PENTHOUSE_FLOOR, homesPerFloor: 6, floor: neonTowerFloor, home: neonTowerHome }),
  Object.freeze({ id: 'cyber', districtId: 'cyber-a3', building: CYBER_TOWER, lobbySpaceId: CYBER_TOWER_LOBBY_SPACE, homes: CYBER_TOWER_HOMES, residentialFloors: CYBER_TOWER_RESIDENTIAL_FLOORS, penthouseFloor: CYBER_TOWER_PENTHOUSE_FLOOR, homesPerFloor: 5, penthouses: 4, floor: cyberTowerFloor, home: cyberTowerHome }),
]);

export const towerDefinitionForLobby = (spaceId) => TOWER_DEFINITIONS.find((tower) => tower.lobbySpaceId === spaceId) || null;
export const towerDefinitionForSpace = (spaceId) => TOWER_DEFINITIONS.find((tower) => spaceId === tower.lobbySpaceId || spaceId.startsWith(`${tower.lobbySpaceId}-`)) || null;
export const towerHomeForSpace = (spaceId) => towerDefinitionForSpace(spaceId)?.home(spaceId) || null;
