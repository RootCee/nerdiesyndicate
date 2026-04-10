import type { MissionDefinition, MissionEvaluation } from "../types/missions";
import type { LocalMissionSubjectState } from "./missionHarness";

export interface GeneralContractUtilitySummary {
  missionId: string;
  operationalPurpose: string;
  progressionImpact: string;
  currentUseState: string;
}

function incrementCounter(value: number | undefined, amount: number): number {
  return Math.max(0, (value ?? 0) + amount);
}

export function isGeneralContractMission(mission: MissionDefinition): boolean {
  return !mission.district && (mission.id === "daily-first-run" || mission.id === "objective-hustle");
}

export function buildGeneralContractUtilitySummary(
  mission: MissionDefinition,
  state: LocalMissionSubjectState
): GeneralContractUtilitySummary | null {
  if (!isGeneralContractMission(mission)) {
    return null;
  }

  switch (mission.id) {
    case "daily-first-run":
      return {
        missionId: mission.id,
        operationalPurpose:
          "Acts as repeatable daily operator upkeep for the current slice, keeping the character and any opened business in an active work cadence.",
        progressionImpact:
          "Adds 1 local business-operations completion when rewards are applied, so daily upkeep contributes to business-facing progression loops instead of being a disconnected XP button.",
        currentUseState:
          state.openedStarterBusinesses.length > 0
            ? "An opened business is present, so this contract can feed the business-operations lane."
            : "No business is open yet, but this contract still acts as the first daily operator cadence task.",
      };
    case "objective-hustle":
      return {
        missionId: mission.id,
        operationalPurpose:
          "Acts as repeatable city work that represents useful contribution beyond district-specific contracts.",
        progressionImpact:
          "Adds 1 local district-mission completion when rewards are applied, so general city work can contribute to district trust and city-facing progression.",
        currentUseState:
          "This contract now helps feed district-trust progression without creating a new reward system.",
      };
    default:
      return null;
  }
}

export function applyGeneralContractUtility(
  state: LocalMissionSubjectState,
  mission: MissionDefinition,
  evaluation: Pick<MissionEvaluation, "missionId">
): LocalMissionSubjectState {
  if (!isGeneralContractMission(mission)) {
    return state;
  }

  switch (evaluation.missionId) {
    case "daily-first-run":
      return {
        ...state,
        missionProgress: {
          ...state.missionProgress,
          businessOperationsCompleted: incrementCounter(
            state.missionProgress.businessOperationsCompleted,
            1
          ),
        },
      };
    case "objective-hustle":
      return {
        ...state,
        missionProgress: {
          ...state.missionProgress,
          districtMissionsCompleted: incrementCounter(
            state.missionProgress.districtMissionsCompleted,
            1
          ),
        },
      };
    default:
      return state;
  }
}
