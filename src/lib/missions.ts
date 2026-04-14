import type {
  CertificationMissionAnswerState,
  CertificationMissionDefinition,
  CertificationMissionEvaluation,
  CertificationMissionPassEvaluation,
  MissionDefinition,
  MissionDistrict,
  MissionEvaluation,
  MissionProgress,
  MissionProgressInput,
  MissionRequirementType,
} from "../types/missions";
import type { OperatorCertificationProofSummary } from "./certificationProofs";

const PHASE1_MISSION_BALANCE = {
  districtRunnerBonus: { xp: 140, reputation: 8 },
  beginnerCertification: { xp: 110, reputation: 6 },
  operatorStakingCertification: { xp: 135, reputation: 8 },
  darkAlleyRiskPremium: {
    smugglerReputation: 8,
    smugglerHeat: 3,
    blackoutReputation: 12,
  },
} as const;

const MOCK_MISSIONS: MissionDefinition[] = [
  {
    id: "daily-first-run",
    title: "Daily First Run",
    description: "Complete 1 match to keep progression moving every day.",
    missionClass: "activity",
    category: "daily",
    minLevel: 1,
    requirements: [{ type: "matches_completed", target: 1 }],
    rewards: { xp: 50, xpSource: "daily_contract" },
  },
  {
    id: "objective-hustle",
    title: "Objective Hustle",
    description: "Complete 3 objectives to reward active contribution.",
    missionClass: "activity",
    category: "objective",
    minLevel: 1,
    requirements: [{ type: "objectives_completed", target: 3 }],
    rewards: { xp: 120, xpSource: "objective_contribution", reputation: 5 },
  },
  {
    id: "district-runner",
    title: "District Runner",
    description: "Finish 2 district missions to build city reputation.",
    missionClass: "activity",
    category: "district",
    minLevel: 3,
    requirements: [{ type: "district_missions_completed", target: 2 }],
    rewards: {
      xp: PHASE1_MISSION_BALANCE.districtRunnerBonus.xp,
      xpSource: "district_mission",
      reputation: PHASE1_MISSION_BALANCE.districtRunnerBonus.reputation,
    },
  },
  {
    id: "neon-market-price-scout",
    title: "Neon Market Price Scout",
    description: "Run 1 business operation and complete 2 objectives to map trade momentum across Neon Market.",
    missionClass: "activity",
    category: "business",
    district: "neon_market",
    minLevel: 2,
    recommendedRoles: ["trader", "data_broker"],
    requirements: [
      { type: "business_operations_completed", target: 1 },
      { type: "objectives_completed", target: 2 },
    ],
    rewards: { xp: 160, xpSource: "business_operation", reputation: 8 },
  },
  {
    id: "neon-market-floor-control",
    title: "Neon Market Floor Control",
    description: "Finish 2 district contracts and 1 match win to stabilize public-facing market influence.",
    missionClass: "activity",
    category: "district",
    district: "neon_market",
    minLevel: 5,
    recommendedRoles: ["trader"],
    requirements: [
      { type: "district_missions_completed", target: 2 },
      { type: "matches_won", target: 1 },
    ],
    rewards: { xp: 240, xpSource: "district_mission", reputation: 14 },
  },
  {
    id: "dark-alley-smuggler-route",
    title: "Dark Alley Smuggler Route",
    description: "Deploy bots 2 times and finish 1 district mission to test a quiet route through Dark Alley.",
    missionClass: "activity",
    category: "district",
    district: "dark_alley",
    minLevel: 2,
    recommendedRoles: ["hacker", "data_broker"],
    requirements: [
      { type: "bot_deployments", target: 2 },
      { type: "district_missions_completed", target: 1 },
    ],
    rewards: {
      xp: 170,
      xpSource: "district_mission",
      reputation: PHASE1_MISSION_BALANCE.darkAlleyRiskPremium.smugglerReputation,
      heat: PHASE1_MISSION_BALANCE.darkAlleyRiskPremium.smugglerHeat,
    },
  },
  {
    id: "dark-alley-blackout-job",
    title: "Dark Alley Blackout Job",
    description: "Complete 3 objectives and 1 match win to push a higher-risk blackout contract in the underground sector.",
    missionClass: "activity",
    category: "combat",
    district: "dark_alley",
    minLevel: 4,
    recommendedRoles: ["hacker", "code_warrior"],
    requirements: [
      { type: "objectives_completed", target: 3 },
      { type: "matches_won", target: 1 },
    ],
    rewards: {
      xp: 260,
      xpSource: "objective_contribution",
      reputation: PHASE1_MISSION_BALANCE.darkAlleyRiskPremium.blackoutReputation,
      heat: 4,
    },
  },
  {
    id: "cyber-hq-signal-tuning",
    title: "Cyber HQ Signal Tuning",
    description: "Complete 2 objectives and deploy bots 1 time to calibrate automation and city systems inside Cyber HQ.",
    missionClass: "activity",
    category: "objective",
    district: "cyber_hq",
    minLevel: 2,
    recommendedRoles: ["data_broker", "code_warrior"],
    requirements: [
      { type: "objectives_completed", target: 2 },
      { type: "bot_deployments", target: 1 },
    ],
    rewards: { xp: 165, xpSource: "objective_contribution", reputation: 7 },
  },
  {
    id: "cyber-hq-automation-benchmark",
    title: "Cyber HQ Automation Benchmark",
    description: "Deploy bots 4 times and win 1 match to validate higher-load automation from the engineering district.",
    missionClass: "activity",
    category: "combat",
    district: "cyber_hq",
    minLevel: 5,
    recommendedRoles: ["code_warrior", "data_broker"],
    requirements: [
      { type: "bot_deployments", target: 4 },
      { type: "matches_won", target: 1 },
    ],
    rewards: { xp: 250, xpSource: "bot_usage", reputation: 10 },
  },
  {
    id: "bot-field-test",
    title: "Bot Field Test",
    description: "Deploy bots 4 times to encourage roster usage.",
    missionClass: "activity",
    category: "combat",
    minLevel: 2,
    requirements: [{ type: "bot_deployments", target: 4 }],
    rewards: { xp: 140, xpSource: "bot_usage" },
  },
  {
    id: "business-operator",
    title: "Business Operator",
    description: "Complete 2 business operations to strengthen owner loops.",
    missionClass: "activity",
    category: "business",
    minLevel: 5,
    requirements: [{ type: "business_operations_completed", target: 2 }],
    rewards: { xp: 220, xpSource: "business_operation", reputation: 15, heat: 2 },
  },
];

const MOCK_CERTIFICATION_MISSIONS: CertificationMissionDefinition[] = [
  {
    id: "beginner-defi-certification",
    title: "Beginner DeFi Certification",
    description:
      "Pass a short DeFi knowledge quiz to prove baseline understanding before higher-trust financial and operator paths expand.",
    missionClass: "certification",
    category: "certification",
    minLevel: 1,
    rewards: {
      xp: PHASE1_MISSION_BALANCE.beginnerCertification.xp,
      xpSource: "objective_contribution",
      reputation: PHASE1_MISSION_BALANCE.beginnerCertification.reputation,
    },
    passThreshold: 3,
    questions: [
      {
        id: "wallet-custody",
        prompt: "What is the main reason a self-custody wallet matters in DeFi?",
        options: [
          { id: "a", label: "It lets the game server hold your assets for you." },
          { id: "b", label: "It gives you direct control over the wallet keys used to access assets." },
          { id: "c", label: "It guarantees every trade will be profitable." },
        ],
        correctOptionId: "b",
        explanation: "Self-custody means the user controls the wallet credentials rather than delegating them to a third party.",
      },
      {
        id: "lp-risk",
        prompt: "What risk can happen when you provide liquidity to a DeFi pool?",
        options: [
          { id: "a", label: "Impermanent loss if token prices move relative to each other." },
          { id: "b", label: "The blockchain stops recording transactions forever." },
          { id: "c", label: "Your NFT level is automatically reset." },
        ],
        correctOptionId: "a",
        explanation: "Liquidity providers can face impermanent loss when paired asset prices diverge.",
      },
      {
        id: "gas-fees",
        prompt: "What are gas fees generally paying for on a blockchain network?",
        options: [
          { id: "a", label: "Extra in-game reputation only." },
          { id: "b", label: "Network computation and transaction inclusion." },
          { id: "c", label: "Guaranteed staking rewards." },
        ],
        correctOptionId: "b",
        explanation: "Gas fees compensate the network for processing and including transactions.",
      },
      {
        id: "slippage",
        prompt: "What does slippage usually describe in a token swap?",
        options: [
          { id: "a", label: "The difference between expected and executed price." },
          { id: "b", label: "A permanent ban from using DeFi apps." },
          { id: "c", label: "The number of NFTs in a wallet." },
        ],
        correctOptionId: "a",
        explanation: "Slippage is the price movement between quote time and execution time.",
      },
    ],
    proof: {
      proofType: "soulbound_badge",
      proofKey: "proof.beginner_defi",
      label: "Beginner DeFi Proof",
      description:
        "Future soulbound proof for baseline DeFi literacy in city-linked financial and technical lanes.",
    },
  },
  {
    id: "business-operator-staking-certification",
    title: "Business Operator / Staking Certification",
    description:
      "Pass a short operator-readiness quiz to prove baseline understanding of activation, staking entitlement, operator responsibility, and local business safety before live activation expands.",
    missionClass: "certification",
    category: "certification",
    minLevel: 5,
    prerequisiteCertificationMissionIds: ["beginner-defi-certification"],
    rewards: {
      xp: PHASE1_MISSION_BALANCE.operatorStakingCertification.xp,
      xpSource: "business_operation",
      reputation: PHASE1_MISSION_BALANCE.operatorStakingCertification.reputation,
    },
    passThreshold: 3,
    questions: [
      {
        id: "activation-bridge-purpose",
        prompt: "What is the current purpose of the staking bridge in the local business slice?",
        options: [
          { id: "a", label: "It acts as an activation entitlement for business gameplay, not a second reward lane." },
          { id: "b", label: "It permanently replaces all business ownership checks." },
          { id: "c", label: "It automatically fills operator and defense slots." },
        ],
        correctOptionId: "a",
        explanation:
          "The current slice treats staking as an activation entitlement bridge while leaving token rewards on the existing staking contract lane.",
      },
      {
        id: "operator-readiness",
        prompt: "What must still be true before a locally opened business can become active after staking is present?",
        options: [
          { id: "a", label: "Only the district color theme must match the NFT image." },
          { id: "b", label: "Required owner/operator coverage and other business requirements still need to be satisfied." },
          { id: "c", label: "The business automatically becomes active with no other checks." },
        ],
        correctOptionId: "b",
        explanation:
          "Activation still depends on the broader business rules, including required staffing and any remaining gating conditions.",
      },
      {
        id: "activation-scope",
        prompt: "Why is a separate operator/staking certification useful in the current roadmap?",
        options: [
          { id: "a", label: "It separates activation readiness from setup and can later become a reusable proof." },
          { id: "b", label: "It removes the need for business variants and district fit." },
          { id: "c", label: "It lets the UI bypass domain-level eligibility rules." },
        ],
        correctOptionId: "a",
        explanation:
          "The operator/staking certification is a distinct readiness proof for activation and can later evolve into a soulbound credential.",
      },
      {
        id: "stake-tier-awareness",
        prompt: "What does the required staking tier represent in the current business model?",
        options: [
          { id: "a", label: "A gameplay activation threshold tied to the business path being operated." },
          { id: "b", label: "A guaranteed city-wide combat bonus." },
          { id: "c", label: "A replacement for certifications, staffing, and trust." },
        ],
        correctOptionId: "a",
        explanation:
          "The required tier represents the level of staking entitlement needed for that business path's activation state.",
      },
    ],
    proof: {
      proofType: "soulbound_badge",
      proofKey: "proof.business_operator_staking",
      label: "Business Operator / Staking Proof",
      description:
        "Future soulbound proof for operator readiness and staking-aware business activation.",
    },
  },
];

function getProgressValue(
  input: MissionProgressInput,
  requirementType: MissionRequirementType
): number {
  switch (requirementType) {
    case "matches_completed":
      return input.matchesCompleted ?? 0;
    case "matches_won":
      return input.matchesWon ?? 0;
    case "objectives_completed":
      return input.objectivesCompleted ?? 0;
    case "district_missions_completed":
      return input.districtMissionsCompleted ?? 0;
    case "business_operations_completed":
      return input.businessOperationsCompleted ?? 0;
    case "bot_deployments":
      return input.botDeployments ?? 0;
    default:
      return 0;
  }
}

function evaluateMissionRequirements(
  mission: MissionDefinition,
  input: MissionProgressInput
): MissionProgress[] {
  return mission.requirements.map((requirement) => {
    const current = getProgressValue(input, requirement.type);
    return {
      requirementType: requirement.type,
      current,
      target: requirement.target,
      complete: current >= requirement.target,
    };
  });
}

export function getMockMissions(): MissionDefinition[] {
  return MOCK_MISSIONS;
}

export function getMockCertificationMissions(): CertificationMissionDefinition[] {
  return MOCK_CERTIFICATION_MISSIONS;
}

export function getMockMissionDistricts(): MissionDistrict[] {
  return ["neon_market", "dark_alley", "cyber_hq"];
}

export function getAvailableMockMissions(level: number): MissionDefinition[] {
  return MOCK_MISSIONS.filter((mission) => level >= (mission.minLevel ?? 1));
}

export function getAvailableMockCertificationMissions(
  level: number
): CertificationMissionDefinition[] {
  return MOCK_CERTIFICATION_MISSIONS.filter((mission) => level >= (mission.minLevel ?? 1));
}

function hasCertificationProof(
  proofSummary: OperatorCertificationProofSummary | undefined,
  missionId: string
): boolean {
  return proofSummary?.proofsByMissionId[missionId]?.hasProof ?? false;
}

function getMissingPrerequisiteMissionIds(
  mission: CertificationMissionDefinition,
  proofSummary?: OperatorCertificationProofSummary
): string[] {
  return (mission.prerequisiteCertificationMissionIds ?? []).filter(
    (missionId) => !hasCertificationProof(proofSummary, missionId)
  );
}

export function evaluateMissionCompletion(
  mission: MissionDefinition,
  input: MissionProgressInput,
  level = 1
): MissionEvaluation {
  const progress = evaluateMissionRequirements(mission, input);
  const levelEligible = level >= (mission.minLevel ?? 1);
  const completionEligible = levelEligible && progress.every((entry) => entry.complete);

  return {
    missionId: mission.id,
    status: completionEligible ? "completed" : "available",
    progress,
    completionEligible,
    rewards: mission.rewards,
  };
}

export function evaluateAllMockMissions(
  input: MissionProgressInput,
  level = 1
): MissionEvaluation[] {
  return getAvailableMockMissions(level).map((mission) =>
    evaluateMissionCompletion(mission, input, level)
  );
}

export function evaluateCertificationMission(
  mission: CertificationMissionDefinition,
  answers: Record<string, string> = {},
  level = 1,
  proofSummary?: OperatorCertificationProofSummary
): CertificationMissionEvaluation {
  const levelEligible = level >= (mission.minLevel ?? 1);
  const hasExistingProof = hasCertificationProof(proofSummary, mission.id);
  const missingPrerequisiteMissionIds = getMissingPrerequisiteMissionIds(
    mission,
    proofSummary
  );
  const prerequisiteEligible = missingPrerequisiteMissionIds.length === 0;
  const passEvaluation = evaluateCertificationMissionPass(mission, answers);
  const { answeredQuestions, correctAnswers, questionResults } = passEvaluation;
  const completionEligible =
    !hasExistingProof &&
    levelEligible &&
    prerequisiteEligible &&
    passEvaluation.passed;
  const locked = !levelEligible || !prerequisiteEligible;
  const lockReason = !prerequisiteEligible
    ? "Requires Beginner DeFi Certification"
    : !levelEligible
    ? `Requires Level ${mission.minLevel ?? 1}`
    : null;

  return {
    missionId: mission.id,
    status: hasExistingProof || completionEligible ? "completed" : "available",
    levelEligible,
    locked,
    lockReason,
    missingPrerequisiteMissionIds,
    hasExistingProof,
    completionEligible,
    rewards: mission.rewards,
    answeredQuestions,
    correctAnswers,
    totalQuestions: mission.questions.length,
    passThreshold: mission.passThreshold,
    questionResults,
  };
}

export function evaluateCertificationMissionPass(
  mission: CertificationMissionDefinition,
  answers: Record<string, string> = {}
): CertificationMissionPassEvaluation {
  const questionResults = mission.questions.map((question) => {
    const selectedOptionId = answers[question.id];
    const answered = Boolean(selectedOptionId);
    const correct = answered && selectedOptionId === question.correctOptionId;

    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      answered,
      correct,
      explanation: question.explanation,
    };
  });
  const answeredQuestions = questionResults.filter((result) => result.answered).length;
  const correctAnswers = questionResults.filter((result) => result.correct).length;

  return {
    answeredQuestions,
    correctAnswers,
    totalQuestions: mission.questions.length,
    passed:
      answeredQuestions === mission.questions.length &&
      correctAnswers >= mission.passThreshold,
    questionResults,
  };
}

export function evaluateAllMockCertificationMissions(
  answerState: CertificationMissionAnswerState,
  level = 1,
  proofSummary?: OperatorCertificationProofSummary
): CertificationMissionEvaluation[] {
  return getMockCertificationMissions().map((mission) =>
    evaluateCertificationMission(
      mission,
      answerState[mission.id] ?? {},
      level,
      proofSummary
    )
  );
}
