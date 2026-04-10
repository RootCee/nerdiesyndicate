import type { NerdieCityDistrict, NerdieCityRole } from "../config/gameplay";
import type { CertificationMissionDefinition } from "./missions";
import type { RankTier } from "./progression";

export type BusinessSector =
  | "retail_business"
  | "tech_startup"
  | "entertainment_venue"
  | "manufacturing_unit"
  | "financial_institution";

export type BusinessTypeId =
  | "market_shop"
  | "streetwear_boutique"
  | "supply_store"
  | "black_market_stall"
  | "data_hub"
  | "bot_lab"
  | "signal_center"
  | "security_office"
  | "club"
  | "music_lounge"
  | "event_hall"
  | "streaming_studio"
  | "garage"
  | "repair_shop"
  | "mod_shop"
  | "workshop"
  | "bank_branch"
  | "exchange_desk"
  | "treasury_office"
  | "lending_hall";

export type BusinessNftClassId =
  | "retail_business"
  | "tech_startup"
  | "entertainment_venue"
  | "manufacturing_unit"
  | "financial_institution";

export type BusinessPermissionId =
  | "open_market_shop"
  | "open_streetwear_boutique"
  | "open_supply_store"
  | "open_black_market_stall"
  | "open_data_hub"
  | "open_bot_lab"
  | "open_signal_center"
  | "open_security_office"
  | "open_club"
  | "open_music_lounge"
  | "open_event_hall"
  | "open_streaming_studio"
  | "open_garage"
  | "open_repair_shop"
  | "open_mod_shop"
  | "open_workshop"
  | "open_bank_branch"
  | "open_exchange_desk"
  | "open_treasury_office"
  | "open_lending_hall"
  | "public_commerce_ops"
  | "technical_service_ops"
  | "entertainment_ops"
  | "manufacturing_ops"
  | "financial_ops"
  | "underground_trade_ops"
  | "trusted_public_commerce_ops"
  | "trusted_technical_ops"
  | "trusted_entertainment_ops"
  | "trusted_manufacturing_ops"
  | "trusted_financial_ops"
  | "trusted_underground_ops"
  | "advanced_operator_access"
  | "trusted_defense_coordination"
  | "hardened_defense_access"
  | "district_neon_market_access"
  | "district_dark_alley_access"
  | "district_cyber_hq_access";

export type BusinessStakingTier =
  | "none"
  | "starter_business"
  | "district_operator"
  | "city_operator";

export type BusinessGameplayStakingSource =
  | "local_mock"
  | "wallet_contract";

export interface BusinessStakingTierDefinition {
  tier: BusinessStakingTier;
  label: string;
  description: string;
}

export interface BusinessGameplayStakingState {
  source: BusinessGameplayStakingSource;
  entitlementTier: BusinessStakingTier;
}

export interface BusinessDistrictRule {
  district: NerdieCityDistrict;
  preferredSectors: BusinessSector[];
  riskProfile: "medium" | "high" | "strategic";
}

export interface BusinessNftClassDefinition {
  id: BusinessNftClassId;
  tokenId: number;
  name: string;
  dailyRewardTokens: number;
  mintPriceEth: number;
  opensBusinessTypes: BusinessTypeId[];
  preferredDistricts: NerdieCityDistrict[];
  grantedPermissions: BusinessPermissionId[];
  summary: string;
}

export interface PlayableBusinessBridgeDefinition {
  businessTypeId: BusinessTypeId;
  compatibleBusinessNftClasses: BusinessNftClassId[];
  grantedPermissions: BusinessPermissionId[];
}

export interface BusinessEligibilityDefinition {
  id: BusinessTypeId;
  name: string;
  sector: BusinessSector;
  requiresBusinessNft: boolean;
  minLevel: number;
  minimumRankTier?: RankTier;
  minimumReputationScore: number;
  maximumHeatScore?: number | null;
  requiredStakingTier: BusinessStakingTier;
  requiredMilestones: string[];
  allowedDistricts: NerdieCityDistrict[];
  preferredDistricts: NerdieCityDistrict[];
  recommendedRoles: NerdieCityRole[];
  requiredCertificationMissionIds: CertificationMissionDefinition["id"][];
  requiredActivationCertificationMissionIds: CertificationMissionDefinition["id"][];
  teamSlots: BusinessTeamSlotDefinition;
  defenseSlots: BusinessDefenseSlotDefinition;
  trustPolicy: BusinessTrustPolicyDefinition;
}

export interface BusinessEligibilitySubject {
  subjectType: "nft";
  subjectId: string;
  currentLevel: number;
  rankTier?: RankTier | null;
  rankPoints: number;
  reputationScore: number;
  heatScore: number;
  unlockedMilestones: string[];
  stakingTier: BusinessStakingTier;
  ownedBusinessNftCount: number;
  ownedBusinessNftClasses: BusinessNftClassId[];
  completedCertificationMissionIds: CertificationMissionDefinition["id"][];
  districtAffinity?: NerdieCityDistrict | null;
  role?: NerdieCityRole | null;
}

export type BusinessDistrictFit = "preferred" | "allowed" | "blocked";
export type BusinessRoleFit = "preferred" | "neutral";

export type BusinessEligibilityCheckType =
  | "milestone"
  | "staking_tier"
  | "level"
  | "rank"
  | "reputation"
  | "heat"
  | "certification"
  | "business_nft"
  | "district";

export interface BusinessEligibilityCheck {
  type: BusinessEligibilityCheckType;
  passed: boolean;
  blocking: boolean;
  message: string;
  currentValue?: string | number | null;
  requiredValue?: string | number | null;
}

export interface BusinessEligibilityResult {
  definition: BusinessEligibilityDefinition;
  targetDistrict: NerdieCityDistrict;
  eligible: boolean;
  districtFit: BusinessDistrictFit;
  roleFit: BusinessRoleFit;
  compatibleOwnedBusinessNftClasses: BusinessNftClassId[];
  grantedPermissions: BusinessPermissionId[];
  checks: BusinessEligibilityCheck[];
  missingRequirements: BusinessEligibilityCheck[];
  advisoryNotes: string[];
}

export interface LocalStarterBusinessRecord {
  businessTypeId: BusinessTypeId;
  district: NerdieCityDistrict;
  lotId?: string | null;
  lotLabel?: string | null;
  openedViaBusinessNftClass?: BusinessNftClassId | null;
  claimedAt: string;
}

export type BusinessTeamSlotKind = "owner" | "operator" | "support";

export interface BusinessTeamSlotLaneDefinition {
  kind: BusinessTeamSlotKind;
  totalSlots: number;
  requiredSlots: number;
  preferredRoles: NerdieCityRole[];
  label: string;
}

export interface BusinessTeamSlotDefinition {
  owner: BusinessTeamSlotLaneDefinition;
  operators: BusinessTeamSlotLaneDefinition;
  support: BusinessTeamSlotLaneDefinition;
}

export interface LocalBusinessTeamAssignmentState {
  ownerAssigned?: boolean;
  operatorSlotsFilled: number;
  supportSlotsFilled: number;
}

export type BusinessDefenseSlotKind =
  | "guard_bot"
  | "security_module"
  | "protection_role";

export interface BusinessDefenseSlotLaneDefinition {
  kind: BusinessDefenseSlotKind;
  totalSlots: number;
  requiredSlots: number;
  preferredRoles: NerdieCityRole[];
  label: string;
}

export interface BusinessDefenseSlotDefinition {
  guardBots: BusinessDefenseSlotLaneDefinition;
  securityModules: BusinessDefenseSlotLaneDefinition;
  protectionRoles: BusinessDefenseSlotLaneDefinition;
}

export interface LocalBusinessDefenseAssignmentState {
  guardBotSlotsFilled: number;
  securityModuleSlotsFilled: number;
  protectionRoleSlotsFilled: number;
}

export interface BusinessGameplayStakingSummary {
  source: BusinessGameplayStakingSource;
  sourceLabel: string;
  entitlementTier: BusinessStakingTier;
  entitlementLabel: string;
  requiredTier: BusinessStakingTier;
  requiredTierLabel: string;
  tierSatisfied: boolean;
  linkedBusinessNftClasses: BusinessNftClassId[];
  linkedBusinessTokenIds: number[];
  statusLabel: string;
  notes: string[];
}

export type BusinessOwnershipStatus =
  | "owner_ready"
  | "compatible_class_owned"
  | "ownership_missing";

export type BusinessOperationalState =
  | "inactive"
  | "open"
  | "staked"
  | "active"
  | "at_risk";

export interface BusinessOperationalStateSummary {
  state: BusinessOperationalState;
  label: string;
  reason: string;
  districtRiskProfile: BusinessDistrictRule["riskProfile"];
  heatBand: string;
  futureHooks: string[];
}

export interface BusinessTeamStatusSummary {
  definition: BusinessTeamSlotDefinition;
  totalSlots: number;
  requiredSlots: number;
  filledSlots: number;
  requiredFilledSlots: number;
  ownerFilled: boolean;
  operatorSlotsFilled: number;
  supportSlotsFilled: number;
  missingRequiredSlots: number;
  readyForActivation: boolean;
  readinessLabel: string;
  readinessImpact: string;
  futureAssignmentNotes: string[];
}

export interface BusinessDefenseStatusSummary {
  definition: BusinessDefenseSlotDefinition;
  totalSlots: number;
  requiredSlots: number;
  filledSlots: number;
  requiredFilledSlots: number;
  guardBotSlotsFilled: number;
  securityModuleSlotsFilled: number;
  protectionRoleSlotsFilled: number;
  recommendedMinimumCoverage: number;
  recommendedCoverageMet: boolean;
  readinessLabel: string;
  readinessImpact: string;
  futureAssignmentNotes: string[];
}

export interface LocalBusinessLotOption {
  id: string;
  label: string;
  lotTags: string[];
  size: BusinessLotSize;
  occupancyStatus: BusinessLotOccupancyStatus;
  occupancyLabel: string;
  placementVariantId: string;
}

export type BusinessLotSize = "small" | "medium" | "large";

export type BusinessLotOccupancyStatus =
  | "unassigned"
  | "reserved"
  | "occupied"
  | "inactive_occupied"
  | "contested"
  | "locked";

export interface BusinessPlacementVariantDefinition {
  id: string;
  label: string;
  businessTypeId: BusinessTypeId;
  businessNftClassId: BusinessNftClassId;
  totalAllocation: number;
  preferredDistricts: NerdieCityDistrict[];
  allowedDistricts: NerdieCityDistrict[];
  territorySubtypes: string[];
  lotTags: string[];
  lotSize: BusinessLotSize;
  districtLotCounts: Partial<Record<NerdieCityDistrict, number>>;
}

export interface BusinessLotRegistryEntry {
  id: string;
  label: string;
  district: NerdieCityDistrict;
  territorySubtype: string;
  lotSize: BusinessLotSize;
  lotTags: string[];
  placementVariantId: string;
  businessTypeId: BusinessTypeId;
  businessNftClassId: BusinessNftClassId;
  occupancyStatus: BusinessLotOccupancyStatus;
  occupantBusinessKey?: string | null;
}

export interface BusinessDistrictCapacitySummary {
  district: NerdieCityDistrict;
  totalLots: number;
  availableLots: number;
  occupiedLots: number;
  starterBusinessLots: number;
  byPlacementVariant: Array<{
    placementVariantId: string;
    label: string;
    totalLots: number;
    availableLots: number;
    occupiedLots: number;
  }>;
}

export type CertificationProofSource =
  | "local_mission_completion"
  | "future_soulbound_nft";

export type DistrictTrustBand =
  | "unproven"
  | "known"
  | "trusted"
  | "elevated";

export interface BusinessTrustPolicyDefinition {
  minimumDistrictTrustBandForHigherTrustOps: DistrictTrustBand;
  minimumDistrictTrustBandForDefensePermissions: DistrictTrustBand;
  minimumDistrictTrustBandForAdvancedOperatorAccess: DistrictTrustBand;
  certificationMissionIdsForHigherTrustOps: CertificationMissionDefinition["id"][];
  certificationMissionIdsForDefensePermissions: CertificationMissionDefinition["id"][];
  certificationMissionIdsForAdvancedOperatorAccess: CertificationMissionDefinition["id"][];
}

export interface CertificationRequirementStatusSummary {
  requiredMissionIds: CertificationMissionDefinition["id"][];
  completedMissionIds: CertificationMissionDefinition["id"][];
  missingMissionIds: CertificationMissionDefinition["id"][];
  proofSources: CertificationProofSource[];
  satisfied: boolean;
}

export interface DistrictReputationStatusSummary {
  district: NerdieCityDistrict;
  districtAffinityMatch: boolean;
  completedDistrictMissionCount: number;
  districtReputationScore: number;
  trustBand: DistrictTrustBand;
}

export interface BusinessTrustPermissionSummary {
  districtReputation: DistrictReputationStatusSummary;
  higherTrustOperations: CertificationRequirementStatusSummary & {
    unlocked: boolean;
  };
  defensePermissions: CertificationRequirementStatusSummary & {
    unlocked: boolean;
  };
  advancedOperatorAccess: CertificationRequirementStatusSummary & {
    unlocked: boolean;
  };
  unlockedPermissions: BusinessPermissionId[];
  blockedPermissionLabels: string[];
  nextAction: string;
  futureProofingNotes: string[];
}
