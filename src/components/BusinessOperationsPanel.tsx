import { useMemo, useState } from "react";
import { BUSINESS_STAKING_TIER_ORDER } from "../config/gameplay";
import { buildOpenedBusinessOperationSummaries } from "../lib/businessOperationsStatus";
import type { OperatorCertificationProofSummary } from "../lib/certificationProofs";
import { getPhase1BusinessStakingTierDefinition } from "../lib/businessEligibility";
import {
  updateLocalBusinessDefenseAssignment,
  updateLocalBusinessTeamAssignment,
  type LocalMissionSubjectState,
} from "../lib/missionHarness";
import type { NFTGameplayProfile } from "../lib/nftGameplayProfile";
import { getLocalStarterBusinessKey } from "../lib/localStarterBusinesses";

interface BusinessOperationsPanelProps {
  gameplayProfile: NFTGameplayProfile;
  missionState: LocalMissionSubjectState;
  certificationProofSummary: OperatorCertificationProofSummary;
  onMissionStateChange: (nextState: LocalMissionSubjectState) => void;
}

function formatValue(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function getOwnershipLabel(value: string) {
  switch (value) {
    case "owner_ready":
      return "Original Class Owned";
    case "compatible_class_owned":
      return "Compatible Class Owned";
    default:
      return "Ownership Missing";
  }
}

function getActivationLabel(value: string) {
  if (value === "activation_ready") {
    return "Ready To Activate";
  }

  if (value === "awaiting_staking") {
    return "Awaiting Staking";
  }

  return "Opened But Gated";
}

function getOperationalStateClasses(value: string) {
  switch (value) {
    case "active":
      return "bg-emerald-950/80 text-emerald-300";
    case "at_risk":
      return "bg-red-950/80 text-red-200";
    case "staked":
      return "bg-sky-950/80 text-sky-200";
    case "open":
      return "bg-amber-950/80 text-amber-300";
    default:
      return "bg-zinc-800 text-neutral-300";
  }
}

function getTeamReadinessClasses(ready: boolean) {
  return ready
    ? "bg-emerald-950/80 text-emerald-300"
    : "bg-amber-950/80 text-amber-300";
}

function getTrustClasses(unlocked: boolean) {
  return unlocked
    ? "bg-emerald-950/80 text-emerald-300"
    : "bg-amber-950/80 text-amber-300";
}

export default function BusinessOperationsPanel({
  gameplayProfile,
  missionState,
  certificationProofSummary,
  onMissionStateChange,
}: BusinessOperationsPanelProps) {
  const [expandedBusinessKeys, setExpandedBusinessKeys] = useState<Record<string, boolean>>({});
  const businessSummaries = useMemo(
    () =>
      buildOpenedBusinessOperationSummaries(
        gameplayProfile,
        missionState,
        certificationProofSummary
      ),
    [certificationProofSummary, gameplayProfile, missionState]
  );

  if (businessSummaries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
          Activation / Operations
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-300">
          This stage covers post-setup activation and live business readiness. Opened businesses
          now read staking-backed activation state, team-slot readiness, and operational status from
          the domain layer instead of relying on setup-stage override controls.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Activation Bridge
            </p>
            <p className="mt-2 max-w-2xl text-sm text-neutral-300">
              Local/mock staking entitlement is still used here until live wallet-derived staking
              reads replace it. It now lives in Activation instead of Setup so the journey stays
              sequential.
            </p>
          </div>
          <label className="flex flex-col gap-2 text-xs text-neutral-500">
            Staking activation
            <select
              value={missionState.stakingTier}
              onChange={(event) =>
                onMissionStateChange({
                  ...missionState,
                  stakingTier: event.target.value as LocalMissionSubjectState["stakingTier"],
                  stakingState: {
                    source: "local_mock",
                    entitlementTier: event.target.value as LocalMissionSubjectState["stakingTier"],
                  },
                })
              }
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              {BUSINESS_STAKING_TIER_ORDER.map((tier) => (
                <option key={tier} value={tier}>
                  {getPhase1BusinessStakingTierDefinition(tier).label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {businessSummaries.map((summary) => {
          const businessKey = `${summary.definition.id}:${summary.openedBusiness.district}`;
          const isExpanded = expandedBusinessKeys[businessKey] ?? false;

          return (
            <div
              key={businessKey}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{summary.definition.name}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatValue(summary.definition.sector)} •{" "}
                    {formatValue(summary.openedBusiness.district)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${getOperationalStateClasses(
                      summary.operationalState.state
                    )}`}
                  >
                    {summary.operationalState.label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                      summary.activationStatus === "activation_ready"
                        ? "bg-emerald-950/80 text-emerald-300"
                        : "bg-amber-950/80 text-amber-300"
                    }`}
                  >
                    {getActivationLabel(summary.activationStatus)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${getTeamReadinessClasses(
                      summary.team.readyForActivation
                    )}`}
                  >
                    {summary.team.readinessLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBusinessKeys((current) => ({
                        ...current,
                        [businessKey]: !isExpanded,
                      }))
                    }
                    className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-neutral-200 transition hover:border-zinc-600 hover:text-white"
                  >
                    {isExpanded ? "Collapse Variant" : "Expand Variant"}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Business NFT Class
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.businessNftClass?.name ?? "Local Mock Bridge"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  In-Game Variant
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.definition.name}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Ownership Status
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {getOwnershipLabel(summary.ownershipStatus)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Operator Status
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.operatorStatus === "preferred"
                    ? "Preferred Role Match"
                    : "Neutral Role Match"}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Claimed
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatTimestamp(summary.openedBusiness.claimedAt)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Operational State
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.operationalState.label}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Risk: {formatValue(summary.operationalState.districtRiskProfile)} • Heat:{" "}
                  {formatValue(summary.operationalState.heatBand)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Team Slot Status
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.team.filledSlots} / {summary.team.totalSlots} filled
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Required: {summary.team.requiredFilledSlots} / {summary.team.requiredSlots}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Defense Slot Status
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.defense.filledSlots} / {summary.defense.totalSlots} filled
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Recommended: {summary.defense.recommendedMinimumCoverage} •{" "}
                  {summary.defense.readinessLabel}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  District Trust
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {formatValue(summary.trust.districtReputation.trustBand)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Score: {summary.trust.districtReputation.districtReputationScore} • Missions:{" "}
                  {summary.trust.districtReputation.completedDistrictMissionCount}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 sm:col-span-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Staking Bridge
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.staking.statusLabel}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {summary.staking.sourceLabel} • Current: {summary.staking.entitlementLabel} •
                  Required: {summary.staking.requiredTierLabel}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Linked class token IDs:{" "}
                  <span className="text-white">
                    {summary.staking.linkedBusinessTokenIds.length > 0
                      ? summary.staking.linkedBusinessTokenIds.join(", ")
                      : "None linked"}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Activation Certification
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${
                      summary.activationCertification.satisfied
                        ? "bg-emerald-950/80 text-emerald-300"
                        : "bg-amber-950/80 text-amber-300"
                    }`}
                  >
                    {summary.activationCertification.satisfied ? "Qualified" : "Required"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">
                  {summary.activationCertification.requiredLabels.length > 0
                    ? summary.activationCertification.requiredLabels.join(", ")
                    : "No activation certification required"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {summary.activationCertification.missingLabels.length > 0
                    ? `Missing: ${summary.activationCertification.missingLabels.join(", ")}`
                    : "All current activation certifications are satisfied."}
                </p>
                {summary.activationCertification.proofLabels.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Future proof: {summary.activationCertification.proofLabels.join(", ")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-neutral-500">
                District / lot context:
                <span className="ml-2 text-white">{summary.lotContext}</span>
              </p>
              <p className="text-xs text-neutral-500">
                Current eligibility:
                <span className="ml-2 text-white">
                  {summary.evaluation.eligible
                    ? "All current activation requirements satisfied."
                    : "Some current activation requirements are no longer satisfied."}
                </span>
              </p>
              <p className="text-xs text-neutral-500">
                Current permissions:
                <span className="ml-2 text-white">
                  {summary.evaluation.grantedPermissions.length > 0
                    ? summary.evaluation.grantedPermissions.map(formatValue).join(", ")
                    : "None"}
                </span>
              </p>
              {summary.businessNftClass && (
                <p className="text-xs text-neutral-500">
                  Sector mapping:
                  <span className="ml-2 text-white">
                    Preferred districts {summary.businessNftClass.preferredDistricts
                      .map(formatValue)
                      .join(", ")}{" "}
                    • Base permissions {summary.businessNftClass.grantedPermissions
                      .map(formatValue)
                      .join(", ")}
                  </span>
                </p>
              )}
              <p className="text-xs text-neutral-500">
                Operational reasoning:
                <span className="ml-2 text-white">{summary.operationalState.reason}</span>
              </p>
              <p className="text-xs text-neutral-500">
                Team readiness:
                <span className="ml-2 text-white">{summary.team.readinessImpact}</span>
              </p>
              <p className="text-xs text-neutral-500">
                Defense posture:
                <span className="ml-2 text-white">{summary.defense.readinessImpact}</span>
              </p>
              <p className="text-xs text-neutral-500">
                Trust guidance:
                <span className="ml-2 text-white">{summary.trust.nextAction}</span>
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Local Team Bridge
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Local/mock slot-fill controls. Future staffing can swap these counts for
                    actual role-based NFT assignments.
                  </p>
                </div>
                <p className="text-xs text-neutral-400">
                  Total {summary.team.totalSlots} slots • Required {summary.team.requiredSlots}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Owner Slot
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {summary.team.ownerFilled ? "Filled" : "Missing"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Preferred:{" "}
                    {summary.team.definition.owner.preferredRoles.map(formatValue).join(", ")}
                  </p>
                </div>

                <label className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-neutral-500">
                  Operator Slots
                  <select
                    value={summary.team.operatorSlotsFilled}
                    onChange={(event) =>
                      onMissionStateChange(
                        updateLocalBusinessTeamAssignment(
                          missionState,
                          getLocalStarterBusinessKey(summary.openedBusiness),
                          {
                            ownerAssigned: summary.team.ownerFilled,
                            operatorSlotsFilled: Number(event.target.value),
                            supportSlotsFilled: summary.team.supportSlotsFilled,
                          }
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {Array.from(
                      { length: summary.team.definition.operators.totalSlots + 1 },
                      (_, index) => index
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value} / {summary.team.definition.operators.totalSlots} filled
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">
                    Required: {summary.team.definition.operators.requiredSlots} • Preferred:{" "}
                    {summary.team.definition.operators.preferredRoles.map(formatValue).join(", ")}
                  </p>
                </label>

                <label className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-neutral-500">
                  Support Slots
                  <select
                    value={summary.team.supportSlotsFilled}
                    onChange={(event) =>
                      onMissionStateChange(
                        updateLocalBusinessTeamAssignment(
                          missionState,
                          getLocalStarterBusinessKey(summary.openedBusiness),
                          {
                            ownerAssigned: summary.team.ownerFilled,
                            operatorSlotsFilled: summary.team.operatorSlotsFilled,
                            supportSlotsFilled: Number(event.target.value),
                          }
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {Array.from(
                      { length: summary.team.definition.support.totalSlots + 1 },
                      (_, index) => index
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value} / {summary.team.definition.support.totalSlots} filled
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">
                    Optional lane • Preferred:{" "}
                    {summary.team.definition.support.preferredRoles.map(formatValue).join(", ")}
                  </p>
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Local Defense Bridge
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Placeholder coverage for future guard bots, security modules, and team-based
                    protection roles. These slots do not block activation yet.
                  </p>
                </div>
                <p className="text-xs text-neutral-400">
                  Total {summary.defense.totalSlots} slots • Recommended{" "}
                  {summary.defense.recommendedMinimumCoverage}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-neutral-500">
                  Guard Bot Slots
                  <select
                    value={summary.defense.guardBotSlotsFilled}
                    onChange={(event) =>
                      onMissionStateChange(
                        updateLocalBusinessDefenseAssignment(
                          missionState,
                          getLocalStarterBusinessKey(summary.openedBusiness),
                          {
                            guardBotSlotsFilled: Number(event.target.value),
                            securityModuleSlotsFilled:
                              summary.defense.securityModuleSlotsFilled,
                            protectionRoleSlotsFilled:
                              summary.defense.protectionRoleSlotsFilled,
                          }
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {Array.from(
                      { length: summary.defense.definition.guardBots.totalSlots + 1 },
                      (_, index) => index
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value} / {summary.defense.definition.guardBots.totalSlots} filled
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">
                    Preferred:{" "}
                    {summary.defense.definition.guardBots.preferredRoles
                      .map(formatValue)
                      .join(", ")}
                  </p>
                </label>

                <label className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-neutral-500">
                  Security Modules
                  <select
                    value={summary.defense.securityModuleSlotsFilled}
                    onChange={(event) =>
                      onMissionStateChange(
                        updateLocalBusinessDefenseAssignment(
                          missionState,
                          getLocalStarterBusinessKey(summary.openedBusiness),
                          {
                            guardBotSlotsFilled: summary.defense.guardBotSlotsFilled,
                            securityModuleSlotsFilled: Number(event.target.value),
                            protectionRoleSlotsFilled:
                              summary.defense.protectionRoleSlotsFilled,
                          }
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {Array.from(
                      { length: summary.defense.definition.securityModules.totalSlots + 1 },
                      (_, index) => index
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value} / {summary.defense.definition.securityModules.totalSlots} filled
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">
                    Preferred:{" "}
                    {summary.defense.definition.securityModules.preferredRoles
                      .map(formatValue)
                      .join(", ")}
                  </p>
                </label>

                <label className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-neutral-500">
                  Protection Roles
                  <select
                    value={summary.defense.protectionRoleSlotsFilled}
                    onChange={(event) =>
                      onMissionStateChange(
                        updateLocalBusinessDefenseAssignment(
                          missionState,
                          getLocalStarterBusinessKey(summary.openedBusiness),
                          {
                            guardBotSlotsFilled: summary.defense.guardBotSlotsFilled,
                            securityModuleSlotsFilled:
                              summary.defense.securityModuleSlotsFilled,
                            protectionRoleSlotsFilled: Number(event.target.value),
                          }
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {Array.from(
                      { length: summary.defense.definition.protectionRoles.totalSlots + 1 },
                      (_, index) => index
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value} / {summary.defense.definition.protectionRoles.totalSlots} filled
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-neutral-500">
                    Preferred:{" "}
                    {summary.defense.definition.protectionRoles.preferredRoles
                      .map(formatValue)
                      .join(", ")}
                  </p>
                </label>
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Trust / Permission Layer
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Higher-Trust Ops
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${getTrustClasses(
                        summary.trust.higherTrustOperations.unlocked
                      )}`}
                    >
                      {summary.trust.higherTrustOperations.unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">
                    Required certs:{" "}
                    {summary.trust.higherTrustOperations.requiredMissionIds.length > 0
                      ? summary.trust.higherTrustOperations.requiredMissionIds.map(formatValue).join(", ")
                      : "None"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Defense Permissions
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${getTrustClasses(
                        summary.trust.defensePermissions.unlocked
                      )}`}
                    >
                      {summary.trust.defensePermissions.unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">
                    Required certs:{" "}
                    {summary.trust.defensePermissions.requiredMissionIds.length > 0
                      ? summary.trust.defensePermissions.requiredMissionIds.map(formatValue).join(", ")
                      : "None"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Advanced Operator Access
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${getTrustClasses(
                        summary.trust.advancedOperatorAccess.unlocked
                      )}`}
                    >
                      {summary.trust.advancedOperatorAccess.unlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">
                    Required certs:{" "}
                    {summary.trust.advancedOperatorAccess.requiredMissionIds.length > 0
                      ? summary.trust.advancedOperatorAccess.requiredMissionIds
                          .map(formatValue)
                          .join(", ")
                      : "None"}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-neutral-300">
                  Unlocked permissions:{" "}
                  <span className="text-white">
                    {summary.trust.unlockedPermissions.length > 0
                      ? summary.trust.unlockedPermissions.map(formatValue).join(", ")
                      : "None yet"}
                  </span>
                </p>
                <p className="text-xs text-neutral-300">
                  Still gated:{" "}
                  <span className="text-white">
                    {summary.trust.blockedPermissionLabels.length > 0
                      ? summary.trust.blockedPermissionLabels.join(", ")
                      : "No current trust-gated permissions"}
                  </span>
                </p>
                {summary.trust.futureProofingNotes.map((note) => (
                  <p key={note} className="text-xs text-neutral-400">
                    {note}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Staking Notes
              </p>
              <div className="mt-2 space-y-1.5">
                {summary.staking.notes.map((note) => (
                  <p key={note} className="text-xs text-neutral-300">
                    {note}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                Future Hooks
              </p>
              <div className="mt-2 space-y-1.5">
                {summary.operationalState.futureHooks.map((note) => (
                  <p key={note} className="text-xs text-neutral-400">
                    {note}
                  </p>
                ))}
                {summary.team.futureAssignmentNotes.map((note) => (
                  <p key={note} className="text-xs text-neutral-400">
                    {note}
                  </p>
                ))}
                {summary.defense.futureAssignmentNotes.map((note) => (
                  <p key={note} className="text-xs text-neutral-400">
                    {note}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Certifications / Tests
                </p>
                <div className="mt-2 space-y-1.5">
                  {summary.certificationNotes.map((note) => (
                    <p key={note} className="text-xs text-neutral-300">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Future Placeholders
                </p>
                <div className="mt-2 space-y-1.5">
                  {summary.futureRequirementPlaceholders.slice(0, 4).map((note) => (
                    <p key={note} className="text-xs text-neutral-400">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-zinc-800 pt-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Requirements Satisfied
                </p>
                <div className="mt-2 space-y-1.5">
                  {summary.requiredChecks.slice(0, 4).map((check) => (
                    <p key={check.type} className="text-xs text-emerald-200">
                      {check.message}
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Current Gaps
                </p>
                <div className="mt-2 space-y-1.5">
                  {summary.missingChecks.length > 0 ? (
                    summary.missingChecks.slice(0, 4).map((check) => (
                      <p key={check.type} className="text-xs text-amber-200">
                        {check.message}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400">
                      No current blocking gaps in the local activation rules.
                    </p>
                  )}
                </div>
              </div>
            </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
