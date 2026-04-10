import type {
  BusinessEligibilityDefinition,
  LocalStarterBusinessRecord,
} from "../types/business";
import type { LocalMissionSubjectState } from "./missionHarness";

function getTimestamp() {
  return new Date().toISOString();
}

export function getLocalStarterBusinessKey(
  business: Pick<LocalStarterBusinessRecord, "businessTypeId" | "district">
): string {
  return `${business.businessTypeId}:${business.district}`;
}

export function hasLocalStarterBusinessClaim(
  state: LocalMissionSubjectState,
  businessTypeId: BusinessEligibilityDefinition["id"]
): boolean {
  return state.openedStarterBusinesses.some(
    (business) => business.businessTypeId === businessTypeId
  );
}

export function claimLocalStarterBusiness(
  state: LocalMissionSubjectState,
  business: LocalStarterBusinessRecord
): LocalMissionSubjectState {
  if (
    state.openedStarterBusinesses.some(
      (entry) => entry.businessTypeId === business.businessTypeId
    )
  ) {
    return state;
  }

  return {
    ...state,
    openedStarterBusinesses: [
      ...state.openedStarterBusinesses,
      {
        ...business,
        claimedAt: business.claimedAt || getTimestamp(),
      },
    ],
    businessTeamAssignments: {
      ...state.businessTeamAssignments,
      [getLocalStarterBusinessKey(business)]: {
        ownerAssigned: true,
        operatorSlotsFilled: 0,
        supportSlotsFilled: 0,
      },
    },
    businessDefenseAssignments: {
      ...state.businessDefenseAssignments,
      [getLocalStarterBusinessKey(business)]: {
        guardBotSlotsFilled: 0,
        securityModuleSlotsFilled: 0,
        protectionRoleSlotsFilled: 0,
      },
    },
  };
}
