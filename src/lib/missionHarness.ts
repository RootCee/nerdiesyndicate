import type { NFTGameplayProfile } from "./nftGameplayProfile";
import type {
  CertificationMissionAnswerState,
  MissionEvaluation,
  MissionProgressInput,
  MissionRequirement,
  MissionReward,
} from "../types/missions";
import type {
  BusinessGameplayStakingState,
  LocalBusinessDefenseAssignmentState,
  LocalBusinessTeamAssignmentState,
  BusinessNftClassId,
  BusinessStakingTier,
  LocalStarterBusinessRecord,
} from "../types/business";

export interface LocalMissionSubjectState {
  totalXP: number;
  reputationScore: number;
  heatScore: number;
  rankPoints: number;
  lastSource?: MissionEvaluation["rewards"]["xpSource"];
  stakingTier: BusinessStakingTier;
  stakingState: BusinessGameplayStakingState;
  ownedBusinessNftCount: number;
  ownedBusinessNftClasses: BusinessNftClassId[];
  lastCompletedMissionId?: string | null;
  openedStarterBusinesses: LocalStarterBusinessRecord[];
  businessTeamAssignments: Record<string, LocalBusinessTeamAssignmentState>;
  businessDefenseAssignments: Record<string, LocalBusinessDefenseAssignmentState>;
  missionProgress: MissionProgressInput;
  certificationAnswers: CertificationMissionAnswerState;
  completedMissionIds: string[];
}

export function createLocalMissionSubjectState(
  gameplayProfile: NFTGameplayProfile
): LocalMissionSubjectState {
  return {
    totalXP: gameplayProfile.progression.profile.xp.lifetimeXP,
    reputationScore: gameplayProfile.progression.profile.reputation?.score ?? 0,
    heatScore: gameplayProfile.progression.profile.heat?.score ?? 0,
    rankPoints: gameplayProfile.progression.profile.rank?.rankPoints ?? 0,
    stakingTier: "starter_business",
    stakingState: {
      source: "local_mock",
      entitlementTier: "starter_business",
    },
    ownedBusinessNftCount: 1,
    ownedBusinessNftClasses: ["retail_business"],
    lastCompletedMissionId: null,
    openedStarterBusinesses: [],
    businessTeamAssignments: {},
    businessDefenseAssignments: {},
    missionProgress: {},
    certificationAnswers: {},
    completedMissionIds: [],
  };
}

function withRequirementTarget(
  progress: MissionProgressInput,
  requirement: MissionRequirement
): MissionProgressInput {
  switch (requirement.type) {
    case "matches_completed":
      return { ...progress, matchesCompleted: Math.max(progress.matchesCompleted ?? 0, requirement.target) };
    case "matches_won":
      return { ...progress, matchesWon: Math.max(progress.matchesWon ?? 0, requirement.target) };
    case "objectives_completed":
      return {
        ...progress,
        objectivesCompleted: Math.max(progress.objectivesCompleted ?? 0, requirement.target),
      };
    case "district_missions_completed":
      return {
        ...progress,
        districtMissionsCompleted: Math.max(progress.districtMissionsCompleted ?? 0, requirement.target),
      };
    case "business_operations_completed":
      return {
        ...progress,
        businessOperationsCompleted: Math.max(progress.businessOperationsCompleted ?? 0, requirement.target),
      };
    case "bot_deployments":
      return { ...progress, botDeployments: Math.max(progress.botDeployments ?? 0, requirement.target) };
    default:
      return progress;
  }
}

export function fulfillMissionRequirements(
  progress: MissionProgressInput,
  requirements: MissionRequirement[]
): MissionProgressInput {
  return requirements.reduce(withRequirementTarget, progress);
}

export function applyMissionRewards(
  state: LocalMissionSubjectState,
  evaluation: Pick<MissionEvaluation, "missionId" | "rewards"> | {
    missionId: string;
    rewards: MissionReward;
  }
): LocalMissionSubjectState {
  return {
    ...state,
    totalXP: state.totalXP + evaluation.rewards.xp,
    reputationScore: state.reputationScore + (evaluation.rewards.reputation ?? 0),
    heatScore: state.heatScore + (evaluation.rewards.heat ?? 0),
    lastSource: evaluation.rewards.xpSource,
    lastCompletedMissionId: evaluation.missionId,
    completedMissionIds: state.completedMissionIds.includes(evaluation.missionId)
      ? state.completedMissionIds
      : [...state.completedMissionIds, evaluation.missionId],
  };
}

export function answerCertificationQuestion(
  state: LocalMissionSubjectState,
  missionId: string,
  questionId: string,
  optionId: string
): LocalMissionSubjectState {
  return {
    ...state,
    certificationAnswers: {
      ...state.certificationAnswers,
      [missionId]: {
        ...(state.certificationAnswers[missionId] ?? {}),
        [questionId]: optionId,
      },
    },
  };
}

export function updateLocalBusinessTeamAssignment(
  state: LocalMissionSubjectState,
  businessKey: string,
  assignment: LocalBusinessTeamAssignmentState
): LocalMissionSubjectState {
  return {
    ...state,
    businessTeamAssignments: {
      ...state.businessTeamAssignments,
      [businessKey]: assignment,
    },
  };
}

export function updateLocalBusinessDefenseAssignment(
  state: LocalMissionSubjectState,
  businessKey: string,
  assignment: LocalBusinessDefenseAssignmentState
): LocalMissionSubjectState {
  return {
    ...state,
    businessDefenseAssignments: {
      ...state.businessDefenseAssignments,
      [businessKey]: assignment,
    },
  };
}
