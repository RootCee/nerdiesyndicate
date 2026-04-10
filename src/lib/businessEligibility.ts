import {
  BUSINESS_STAKING_TIER_ORDER,
  PHASE1_BUSINESS_ELIGIBILITY_DEFINITIONS,
  PHASE1_BUSINESS_STAKING_TIERS,
  PHASE1_DISTRICT_BUSINESS_RULES,
  PHASE1_RANK_THRESHOLDS,
  type NerdieCityDistrict,
  type NerdieCityRole,
} from "../config/gameplay";
import {
  getCompatibleOwnedBusinessNftClasses,
  getGrantedBusinessPermissions,
} from "./businessNftBridge";
import type {
  BusinessEligibilityCheck,
  BusinessEligibilityDefinition,
  BusinessEligibilityResult,
  BusinessNftClassId,
  BusinessEligibilitySubject,
  BusinessRoleFit,
  BusinessStakingTier,
} from "../types/business";
import type { NFTProgressionRecord } from "../types/persistence";
import type { RankTier } from "../types/progression";
import type { ResolvedProgressionProfile } from "./progressionService";

interface BuildBusinessEligibilitySubjectInput {
  progression: ResolvedProgressionProfile;
  stakingTier?: BusinessStakingTier;
  ownedBusinessNftCount?: number;
  ownedBusinessNftClasses?: BusinessNftClassId[];
  completedCertificationMissionIds?: BusinessEligibilitySubject["completedCertificationMissionIds"];
  districtAffinity?: string | null;
  role?: string | null;
}

interface BuildBusinessEligibilitySubjectFromRecordInput {
  record: NFTProgressionRecord;
  stakingTier?: BusinessStakingTier;
  ownedBusinessNftCount?: number;
  ownedBusinessNftClasses?: BusinessNftClassId[];
  completedCertificationMissionIds?: BusinessEligibilitySubject["completedCertificationMissionIds"];
  districtAffinity?: string | null;
  role?: string | null;
}

interface EvaluateBusinessEligibilityInput {
  subject: BusinessEligibilitySubject;
  businessTypeId: BusinessEligibilityDefinition["id"];
  district?: NerdieCityDistrict;
}

function normalizeKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return (
    value
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || null
  );
}

function normalizeDistrict(value: string | null | undefined): NerdieCityDistrict | null {
  const normalized = normalizeKey(value);

  if (normalized === "neon_market" || normalized === "dark_alley" || normalized === "cyber_hq") {
    return normalized;
  }

  return null;
}

function normalizeRole(value: string | null | undefined): NerdieCityRole | null {
  const normalized = normalizeKey(value);

  if (
    normalized === "hacker" ||
    normalized === "trader" ||
    normalized === "data_broker" ||
    normalized === "code_warrior"
  ) {
    return normalized;
  }

  return null;
}

function getStakingTierIndex(value: BusinessStakingTier): number {
  return BUSINESS_STAKING_TIER_ORDER.indexOf(value);
}

function compareStakingTiers(current: BusinessStakingTier, required: BusinessStakingTier): boolean {
  return getStakingTierIndex(current) >= getStakingTierIndex(required);
}

function compareRankTiers(current: RankTier | null | undefined, required: RankTier): boolean {
  const rankOrder = PHASE1_RANK_THRESHOLDS.map((threshold) => threshold.tier);
  const currentIndex = current ? rankOrder.indexOf(current) : -1;
  const requiredIndex = rankOrder.indexOf(required);

  return currentIndex >= requiredIndex;
}

function getBusinessDefinition(
  businessTypeId: BusinessEligibilityDefinition["id"]
): BusinessEligibilityDefinition {
  const definition = PHASE1_BUSINESS_ELIGIBILITY_DEFINITIONS.find(
    (entry) => entry.id === businessTypeId
  );

  if (!definition) {
    throw new Error(`Unknown business type: ${businessTypeId}`);
  }

  return definition;
}

function getDistrictFit(
  definition: BusinessEligibilityDefinition,
  district: NerdieCityDistrict
): BusinessEligibilityResult["districtFit"] {
  if (definition.preferredDistricts.includes(district)) {
    return "preferred";
  }

  if (definition.allowedDistricts.includes(district)) {
    return "allowed";
  }

  return "blocked";
}

function getRoleFit(
  definition: BusinessEligibilityDefinition,
  role: NerdieCityRole | null | undefined
): BusinessRoleFit {
  return role && definition.recommendedRoles.includes(role) ? "preferred" : "neutral";
}

function buildCheck(
  type: BusinessEligibilityCheck["type"],
  passed: boolean,
  message: string,
  currentValue?: string | number | null,
  requiredValue?: string | number | null,
  blocking = true
): BusinessEligibilityCheck {
  return {
    type,
    passed,
    blocking,
    message,
    currentValue: currentValue ?? null,
    requiredValue: requiredValue ?? null,
  };
}

export function getPhase1BusinessEligibilityDefinitions(): BusinessEligibilityDefinition[] {
  return PHASE1_BUSINESS_ELIGIBILITY_DEFINITIONS;
}

export function getPhase1BusinessStakingTierDefinition(
  tier: BusinessStakingTier
) {
  return PHASE1_BUSINESS_STAKING_TIERS[tier];
}

export function buildBusinessEligibilitySubject(
  input: BuildBusinessEligibilitySubjectInput
): BusinessEligibilitySubject {
  const { progression } = input;
  const ownedBusinessNftClasses = input.ownedBusinessNftClasses ?? [];
  const ownedBusinessNftCount = Math.max(
    0,
    input.ownedBusinessNftCount ?? ownedBusinessNftClasses.length
  );

  return {
    subjectType: "nft",
    subjectId: progression.profile.subjectId,
    currentLevel: progression.profile.level.currentLevel,
    rankTier: progression.profile.rank?.visibleRank ?? null,
    rankPoints: progression.profile.rank?.rankPoints ?? 0,
    reputationScore: progression.profile.reputation?.score ?? 0,
    heatScore: progression.profile.heat?.score ?? 0,
    unlockedMilestones: progression.profile.level.unlockedMilestones,
    stakingTier: input.stakingTier ?? "none",
    ownedBusinessNftCount,
    ownedBusinessNftClasses,
    completedCertificationMissionIds: input.completedCertificationMissionIds ?? [],
    districtAffinity: normalizeDistrict(input.districtAffinity ?? null),
    role: normalizeRole(input.role ?? null),
  };
}

export function buildBusinessEligibilitySubjectFromRecord(
  input: BuildBusinessEligibilitySubjectFromRecordInput
): BusinessEligibilitySubject {
  const { record } = input;
  const ownedBusinessNftClasses = input.ownedBusinessNftClasses ?? [];
  const ownedBusinessNftCount = Math.max(
    0,
    input.ownedBusinessNftCount ?? ownedBusinessNftClasses.length
  );

  return {
    subjectType: "nft",
    subjectId: record.subject.subjectId,
    currentLevel: record.derived.currentLevel,
    rankTier: record.derived.visibleRank ?? null,
    rankPoints: record.counters.rankPoints,
    reputationScore: record.counters.reputationScore,
    heatScore: record.counters.heatScore,
    unlockedMilestones: record.derived.unlockedMilestones,
    stakingTier: input.stakingTier ?? "none",
    ownedBusinessNftCount,
    ownedBusinessNftClasses,
    completedCertificationMissionIds: input.completedCertificationMissionIds ?? [],
    districtAffinity: normalizeDistrict(input.districtAffinity ?? null),
    role: normalizeRole(input.role ?? null),
  };
}

export function resolveSuggestedBusinessDistrict(
  definition: BusinessEligibilityDefinition,
  districtAffinity?: NerdieCityDistrict | null
): NerdieCityDistrict {
  if (districtAffinity && definition.allowedDistricts.includes(districtAffinity)) {
    return districtAffinity;
  }

  return definition.preferredDistricts[0] ?? definition.allowedDistricts[0];
}

export function evaluateBusinessEligibility({
  subject,
  businessTypeId,
  district,
}: EvaluateBusinessEligibilityInput): BusinessEligibilityResult {
  const definition = getBusinessDefinition(businessTypeId);
  const targetDistrict = district ?? resolveSuggestedBusinessDistrict(definition, subject.districtAffinity);
  const districtFit = getDistrictFit(definition, targetDistrict);
  const roleFit = getRoleFit(definition, subject.role);
  const districtRule = PHASE1_DISTRICT_BUSINESS_RULES[targetDistrict];
  const compatibleOwnedBusinessNftClasses = getCompatibleOwnedBusinessNftClasses(
    subject.ownedBusinessNftClasses,
    definition.id
  );
  const grantedPermissions = getGrantedBusinessPermissions(
    compatibleOwnedBusinessNftClasses,
    definition.id
  );
  const checks: BusinessEligibilityCheck[] = [];
  const certificationPass = definition.requiredCertificationMissionIds.every((missionId) =>
    subject.completedCertificationMissionIds.includes(missionId)
  );

  const milestonePass = definition.requiredMilestones.every((milestone) =>
    subject.unlockedMilestones.includes(milestone)
  );
  checks.push(
    buildCheck(
      "milestone",
      milestonePass,
      milestonePass
        ? "Required progression milestones unlocked."
        : `Missing required milestones: ${definition.requiredMilestones
            .filter((milestone) => !subject.unlockedMilestones.includes(milestone))
            .join(", ")}.`,
      subject.unlockedMilestones.length,
      definition.requiredMilestones.length
    )
  );

  checks.push(
    buildCheck(
      "staking_tier",
      compareStakingTiers(subject.stakingTier, definition.requiredStakingTier),
      compareStakingTiers(subject.stakingTier, definition.requiredStakingTier)
        ? "Staking entitlement satisfies this business type."
        : `Requires ${PHASE1_BUSINESS_STAKING_TIERS[definition.requiredStakingTier].label}.`,
      subject.stakingTier,
      definition.requiredStakingTier
    )
  );

  checks.push(
    buildCheck(
      "certification",
      certificationPass,
      certificationPass
        ? definition.requiredCertificationMissionIds.length > 0
          ? "Required certification gate satisfied."
          : "No certification requirement for this business."
        : `Requires certification: ${definition.requiredCertificationMissionIds.join(", ")}.`,
      subject.completedCertificationMissionIds.join(", ") || null,
      definition.requiredCertificationMissionIds.join(", ") || null
    )
  );

  if (definition.requiresBusinessNft) {
    checks.push(
      buildCheck(
        "business_nft",
        compatibleOwnedBusinessNftClasses.length > 0,
        compatibleOwnedBusinessNftClasses.length > 0
          ? "Compatible Business NFT ownership requirement satisfied."
          : "Requires ownership of a compatible Business NFT class before this business can be opened.",
        compatibleOwnedBusinessNftClasses.length,
        1
      )
    );
  }

  checks.push(
    buildCheck(
      "level",
      subject.currentLevel >= definition.minLevel,
      subject.currentLevel >= definition.minLevel
        ? "Level requirement satisfied."
        : `Requires level ${definition.minLevel}.`,
      subject.currentLevel,
      definition.minLevel
    )
  );

  if (definition.minimumRankTier) {
    checks.push(
      buildCheck(
        "rank",
        compareRankTiers(subject.rankTier, definition.minimumRankTier),
        compareRankTiers(subject.rankTier, definition.minimumRankTier)
          ? "Rank requirement satisfied."
          : `Requires ${definition.minimumRankTier} rank access.`,
        subject.rankTier ?? "unranked",
        definition.minimumRankTier
      )
    );
  }

  checks.push(
    buildCheck(
      "reputation",
      subject.reputationScore >= definition.minimumReputationScore,
      subject.reputationScore >= definition.minimumReputationScore
        ? "Reputation threshold satisfied."
        : `Requires reputation score ${definition.minimumReputationScore}.`,
      subject.reputationScore,
      definition.minimumReputationScore
    )
  );

  if (definition.maximumHeatScore != null) {
    checks.push(
      buildCheck(
        "heat",
        subject.heatScore <= definition.maximumHeatScore,
        subject.heatScore <= definition.maximumHeatScore
          ? "Heat threshold satisfied."
          : `Requires heat at or below ${definition.maximumHeatScore}.`,
        subject.heatScore,
        definition.maximumHeatScore
      )
    );
  }

  checks.push(
    buildCheck(
      "district",
      districtFit !== "blocked",
      districtFit !== "blocked"
        ? `District supports ${definition.sector} businesses.`
        : `${targetDistrict} is not allowed for ${definition.name}.`,
      targetDistrict,
      definition.allowedDistricts.join(", ")
    )
  );

  const advisoryNotes: string[] = [];

  if (roleFit !== "preferred" && definition.recommendedRoles.length > 0) {
    advisoryNotes.push(
      `Best role fit: ${definition.recommendedRoles.join(", ")}.`
    );
  }

  if (!districtRule.preferredSectors.includes(definition.sector)) {
    advisoryNotes.push(
      `${definition.name} is allowed in ${targetDistrict}, but ${districtRule.district} does not list ${definition.sector} as a preferred sector.`
    );
  }

  const missingRequirements = checks.filter((check) => check.blocking && !check.passed);

  return {
    definition,
    targetDistrict,
    eligible: missingRequirements.length === 0,
    districtFit,
    roleFit,
    compatibleOwnedBusinessNftClasses,
    grantedPermissions,
    checks,
    missingRequirements,
    advisoryNotes,
  };
}

export function evaluateAllBusinessEligibilityOptions(
  subject: BusinessEligibilitySubject
): BusinessEligibilityResult[] {
  return PHASE1_BUSINESS_ELIGIBILITY_DEFINITIONS.map((definition) =>
    evaluateBusinessEligibility({
      subject,
      businessTypeId: definition.id,
      district: resolveSuggestedBusinessDistrict(definition, subject.districtAffinity),
    })
  );
}
