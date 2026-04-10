import {
  PHASE1_BUSINESS_NFT_CLASSES,
  PHASE1_PLAYABLE_BUSINESS_BRIDGES,
} from "../config/gameplay";
import type {
  BusinessNftClassDefinition,
  BusinessNftClassId,
  BusinessPermissionId,
  BusinessTypeId,
  PlayableBusinessBridgeDefinition,
} from "../types/business";

export function getPhase1BusinessNftClasses(): BusinessNftClassDefinition[] {
  return PHASE1_BUSINESS_NFT_CLASSES;
}

export function getBusinessNftClassDefinition(
  businessNftClassId: BusinessNftClassId
): BusinessNftClassDefinition {
  const definition = PHASE1_BUSINESS_NFT_CLASSES.find((entry) => entry.id === businessNftClassId);

  if (!definition) {
    throw new Error(`Unknown Business NFT class: ${businessNftClassId}`);
  }

  return definition;
}

export function getBusinessNftClassDefinitionByTokenId(
  tokenId: number
): BusinessNftClassDefinition | null {
  return PHASE1_BUSINESS_NFT_CLASSES.find((entry) => entry.tokenId === tokenId) ?? null;
}

export function getPlayableBusinessBridgeDefinition(
  businessTypeId: BusinessTypeId
): PlayableBusinessBridgeDefinition {
  const definition = PHASE1_PLAYABLE_BUSINESS_BRIDGES.find(
    (entry) => entry.businessTypeId === businessTypeId
  );

  if (!definition) {
    throw new Error(`Unknown playable business bridge: ${businessTypeId}`);
  }

  return definition;
}

export function getCompatibleOwnedBusinessNftClasses(
  ownedBusinessNftClasses: BusinessNftClassId[],
  businessTypeId: BusinessTypeId
): BusinessNftClassId[] {
  const bridge = getPlayableBusinessBridgeDefinition(businessTypeId);

  return bridge.compatibleBusinessNftClasses.filter((businessNftClassId) =>
    ownedBusinessNftClasses.includes(businessNftClassId)
  );
}

export function getGrantedBusinessPermissions(
  ownedBusinessNftClasses: BusinessNftClassId[],
  businessTypeId?: BusinessTypeId
): BusinessPermissionId[] {
  const bridgePermissions = businessTypeId
    ? getPlayableBusinessBridgeDefinition(businessTypeId).grantedPermissions
    : [];

  const classPermissions = ownedBusinessNftClasses.flatMap(
    (businessNftClassId) => getBusinessNftClassDefinition(businessNftClassId).grantedPermissions
  );

  return Array.from(new Set([...bridgePermissions, ...classPermissions]));
}

export function getOpenableBusinessTypesForOwnedClasses(
  ownedBusinessNftClasses: BusinessNftClassId[]
): BusinessTypeId[] {
  return Array.from(
    new Set(
      ownedBusinessNftClasses.flatMap(
        (businessNftClassId) => getBusinessNftClassDefinition(businessNftClassId).opensBusinessTypes
      )
    )
  );
}
