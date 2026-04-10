import { useEffect, useMemo, useState } from "react";
import {
  buildBusinessClassFlowSummary,
  buildBusinessQualificationSummaries,
  buildBusinessSetupSummaries,
} from "../lib/businessJourney";
import {
  getBusinessNftClassDefinition,
  getPhase1BusinessNftClasses,
} from "../lib/businessNftBridge";
import {
  claimLocalStarterBusiness,
  hasLocalStarterBusinessClaim,
} from "../lib/localStarterBusinesses";
import { getMockCertificationMissions } from "../lib/missions";
import type { LocalMissionSubjectState } from "../lib/missionHarness";
import type { NFTGameplayProfile } from "../lib/nftGameplayProfile";
import type {
  BusinessNftClassId,
  BusinessTypeId,
  LocalStarterBusinessRecord,
} from "../types/business";
import type { NerdieCityDistrict } from "../config/gameplay";

interface BusinessEligibilityPreviewPanelProps {
  gameplayProfile: NFTGameplayProfile;
  missionState: LocalMissionSubjectState;
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

export default function BusinessEligibilityPreviewPanel({
  gameplayProfile,
  missionState,
  onMissionStateChange,
}: BusinessEligibilityPreviewPanelProps) {
  const [isQualificationOpen, setIsQualificationOpen] = useState(false);
  const [isBusinessSetupOpen, setIsBusinessSetupOpen] = useState(false);
  const [districtSelections, setDistrictSelections] = useState<
    Record<string, NerdieCityDistrict>
  >({});
  const [lotSelections, setLotSelections] = useState<Record<string, string>>({});
  const [expandedBusinessTypeId, setExpandedBusinessTypeId] =
    useState<BusinessTypeId | null>(null);
  const [activeBusinessTypeId, setActiveBusinessTypeId] =
    useState<BusinessTypeId | null>(null);
  const businessNftClassOptions = getPhase1BusinessNftClasses();
  const selectedBusinessNftClassId = missionState.ownedBusinessNftClasses[0] ?? null;
  const selectedBusinessNftClass = selectedBusinessNftClassId
    ? getBusinessNftClassDefinition(selectedBusinessNftClassId)
    : null;
  const qualificationSummaries = useMemo(
    () => buildBusinessQualificationSummaries(gameplayProfile, missionState),
    [gameplayProfile, missionState]
  );
  const setupSummaries = useMemo(
    () =>
      buildBusinessSetupSummaries(
        gameplayProfile,
        missionState,
        selectedBusinessNftClassId,
        districtSelections
      ),
    [districtSelections, gameplayProfile, missionState, selectedBusinessNftClassId]
  );
  const classFlowSummary = useMemo(
    () => buildBusinessClassFlowSummary(selectedBusinessNftClassId),
    [selectedBusinessNftClassId]
  );
  const allClassFlowSummaries = useMemo(
    () =>
      businessNftClassOptions
        .map((businessNftClass) => buildBusinessClassFlowSummary(businessNftClass.id))
        .filter((summary): summary is NonNullable<typeof classFlowSummary> => Boolean(summary)),
    [businessNftClassOptions]
  );
  const completedCertificationIds = new Set(
    getMockCertificationMissions()
      .map((mission) => mission.id)
      .filter((missionId) => missionState.completedMissionIds.includes(missionId))
  );
  const openedBusinessLookup = new Map(
    missionState.openedStarterBusinesses.map((business) => [business.businessTypeId, business])
  );

  useEffect(() => {
    if (setupSummaries.length === 0) {
      setExpandedBusinessTypeId(null);
      setActiveBusinessTypeId(null);
      return;
    }

    const validBusinessTypeIds = new Set(
      setupSummaries.map((summary) => summary.definition.id)
    );
    const firstBusinessTypeId = setupSummaries[0].definition.id;

    if (expandedBusinessTypeId && !validBusinessTypeIds.has(expandedBusinessTypeId)) {
      setExpandedBusinessTypeId(null);
    }

    if (!activeBusinessTypeId || !validBusinessTypeIds.has(activeBusinessTypeId)) {
      setActiveBusinessTypeId(firstBusinessTypeId);
    }
  }, [activeBusinessTypeId, expandedBusinessTypeId, setupSummaries]);

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
          Ownership / Setup
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-300">
          This stage bridges qualification into ownership and setup. Character progression and
          certifications determine which business families this NFT qualifies for, then the
          selected Business NFT sector/class drives which starter variants and lot placeholders can
          be opened next.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setIsQualificationOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-zinc-900/40"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Qualification
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              Business availability begins with character ownership, progression, and any required
              certification before the player moves into Business NFT ownership and setup.
            </p>
            {classFlowSummary && (
              <p className="mt-2 text-xs text-neutral-500">
                Selected sector path: {classFlowSummary.businessNftClass.name} currently maps to{" "}
                {classFlowSummary.variantSummaries.length} playable variant
                {classFlowSummary.variantSummaries.length === 1 ? "" : "s"} across{" "}
                {classFlowSummary.totalPlacementLotsAcrossCity} registry-backed lots.
              </p>
            )}
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">
            {isQualificationOpen ? "Collapse" : "Expand"}
          </span>
        </button>

        {isQualificationOpen && (
          <div className="border-t border-zinc-800 p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Character
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  NFT #{gameplayProfile.progression.profile.subjectId}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Level
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {gameplayProfile.progression.profile.level.currentLevel}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Certifications
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {completedCertificationIds.size > 0
                    ? Array.from(completedCertificationIds).map(formatValue).join(", ")
                    : "None completed"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {qualificationSummaries.map((summary) => (
                <div
                  key={summary.definition.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{summary.definition.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatValue(summary.definition.sector)} • Suggested district:{" "}
                        {formatValue(summary.suggestedDistrict)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                        summary.qualified
                          ? "bg-emerald-950/80 text-emerald-300"
                          : "bg-zinc-800 text-neutral-300"
                      }`}
                    >
                      {summary.qualified ? "Qualified" : "Needs Qualification"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {summary.missingChecks.length > 0 ? (
                      summary.missingChecks.map((check) => (
                        <p key={check.type} className="text-xs text-amber-200">
                          {check.message}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-emerald-200">
                        Character-level and certification gates are currently satisfied.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setIsBusinessSetupOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-zinc-900/40"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Ownership / Setup
            </p>
            <p className="mt-2 max-w-2xl text-sm text-neutral-300">
              The Business NFT sector/class is the ownership source. The actual in-game business
              variant is the primary setup choice below, where placement, staffing, certification,
              staking, trust, and defense expectations are shown from the domain model.
            </p>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">
            {isBusinessSetupOpen ? "Collapse" : "Expand"}
          </span>
        </button>

        {isBusinessSetupOpen && (
          <div className="border-t border-zinc-800 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Ownership / Setup
            </p>
            <p className="mt-2 max-w-2xl text-sm text-neutral-300">
              The Business NFT sector/class is the ownership source. The actual in-game business
              variant is the primary setup choice below, where placement, staffing, certification,
              staking, trust, and defense expectations are shown from the domain model.
            </p>
          </div>
          <div className="max-w-md">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Ownership Source
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              Sector/class stays visible here as the ownership lane, but the actual setup choice is
              the business variant below.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              onMissionStateChange({
                ...missionState,
                ownedBusinessNftCount: 0,
                ownedBusinessNftClasses: [],
              })
            }
            className={`rounded-xl border p-4 text-left transition ${
              !selectedBusinessNftClassId
                ? "border-red-700 bg-red-950/30"
                : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
            }`}
          >
            <p className="text-sm font-semibold text-white">No Business NFT Owned</p>
            <p className="mt-1 text-xs text-neutral-500">
              Clear the ownership source and review qualification without enabling setup.
            </p>
          </button>
          {allClassFlowSummaries.map((summary) => {
            const isSelected = summary.businessNftClass.id === selectedBusinessNftClassId;

            return (
              <button
                key={summary.businessNftClass.id}
                type="button"
                onClick={() =>
                  onMissionStateChange({
                    ...missionState,
                    ownedBusinessNftCount: 1,
                    ownedBusinessNftClasses: [summary.businessNftClass.id as BusinessNftClassId],
                  })
                }
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? "border-red-700 bg-red-950/30"
                    : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {summary.businessNftClass.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Token #{summary.businessNftClass.tokenId} • {summary.variantSummaries.length} variants
                    </p>
                  </div>
                  {isSelected && (
                    <span className="rounded-full bg-red-950/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-red-100">
                      Selected
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  {summary.totalPlacementLotsAcrossCity} lots across{" "}
                  {summary.variantSummaries.length} in-game businesses.
                </p>
              </button>
            );
          })}
        </div>

        {selectedBusinessNftClass ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Ownership Source
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{selectedBusinessNftClass.name}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Token #{selectedBusinessNftClass.tokenId} • Mint {selectedBusinessNftClass.mintPriceEth} ETH
              {" • "}Reward {selectedBusinessNftClass.dailyRewardTokens} NERDIE/day through staking
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              This class authorizes{" "}
              {selectedBusinessNftClass.opensBusinessTypes.map(formatValue).join(", ")} and grants the
              base permissions that those variants build on in the setup flow.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {selectedBusinessNftClass.summary}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-neutral-300">
              Select a Business NFT sector/class to drive the setup options for this character.
              Qualification can still be reviewed above even before ownership is present.
            </p>
          </div>
        )}

        {classFlowSummary && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Variant Lane
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              {classFlowSummary.businessNftClass.name} currently maps to{" "}
              {classFlowSummary.variantSummaries.length} in-game business variant
              {classFlowSummary.variantSummaries.length === 1 ? "" : "s"} across{" "}
              {classFlowSummary.totalPlacementLotsAcrossCity} registry-backed lots citywide.
            </p>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
              Business Variant Selection
            </p>
            <p className="mt-2 text-sm text-neutral-300">
              Browse the actual in-game business variants authorized by this Business NFT sector.
              Expand a variant to inspect its setup rules, then mark it as the active setup choice
              before placing it.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {setupSummaries.map((summary) => {
            const selectedLotId =
              lotSelections[summary.definition.id] ?? summary.lotOptions[0]?.id ?? "";
            const selectedLot =
              summary.lotOptions.find((lot) => lot.id === selectedLotId) ?? summary.lotOptions[0];
            const district = summary.evaluation.targetDistrict;
            const openedBusiness = openedBusinessLookup.get(summary.definition.id);
            const isExpanded = expandedBusinessTypeId === summary.definition.id;
            const isActive = activeBusinessTypeId === summary.definition.id;
            const capacityForVariant =
              summary.districtCapacity?.byPlacementVariant.find(
                (entry) => entry.placementVariantId === selectedLot?.placementVariantId
              ) ?? null;
            const lotSelectionBlocked =
              !selectedLot || selectedLot.occupancyStatus !== "unassigned";

            return (
              <div
                key={summary.definition.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Business Variant
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {summary.definition.name}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {summary.placementVariantLabel ?? "No mapped starter placement"} •{" "}
                      {formatValue(summary.definition.sector)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {summary.totalLotsAcrossCity} supply-backed lots citywide •{" "}
                      {summary.availableLotsInDistrict} available in {formatValue(district)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isActive && (
                      <span className="rounded-full bg-red-950/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-red-200">
                        Active Setup Choice
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                        openedBusiness
                          ? "bg-red-950/80 text-red-200"
                          : summary.setupEligible
                          ? "bg-emerald-950/80 text-emerald-300"
                          : "bg-zinc-800 text-neutral-300"
                      }`}
                    >
                      {openedBusiness
                        ? "Opened"
                        : summary.setupEligible
                        ? "Ready For Setup"
                        : "Needs Setup Gates"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Ownership Source
                    </p>
                    <p className="mt-2 text-xs font-medium text-white">
                      {summary.businessNftClass.name}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      District Fit
                    </p>
                    <p className="mt-2 text-xs font-medium text-white">
                      {summary.definition.preferredDistricts.map(formatValue).join(", ")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Lot Size
                    </p>
                    <p className="mt-2 text-xs font-medium text-white">
                      {summary.lotSizes.map(formatValue).join(", ") || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Staffing
                    </p>
                    <p className="mt-2 text-xs font-medium text-white">
                      1 owner • {summary.requiredOperatorSlots} operator
                      {summary.requiredOperatorSlots === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBusinessTypeId((current) =>
                        current === summary.definition.id ? null : summary.definition.id
                      )
                    }
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:border-zinc-600 hover:bg-zinc-800"
                  >
                    {isExpanded ? "Collapse Variant" : "Expand Variant"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBusinessTypeId(summary.definition.id);
                      setExpandedBusinessTypeId(summary.definition.id);
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? "border-red-700 bg-red-950/50 text-red-100"
                        : "border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    {isActive ? "Active Variant" : "Use This Variant"}
                  </button>
                </div>

                {isExpanded && (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-2 text-xs text-neutral-500">
                        District
                        <select
                          value={district}
                          onChange={(event) =>
                            setDistrictSelections((current) => ({
                              ...current,
                              [summary.definition.id]: event.target.value as NerdieCityDistrict,
                            }))
                          }
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                          disabled={Boolean(openedBusiness)}
                        >
                          {summary.definition.allowedDistricts.map((allowedDistrict) => (
                            <option key={allowedDistrict} value={allowedDistrict}>
                              {formatValue(allowedDistrict)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-2 text-xs text-neutral-500">
                        Lot Placeholder
                        <select
                          value={selectedLotId}
                          onChange={(event) =>
                            setLotSelections((current) => ({
                              ...current,
                              [summary.definition.id]: event.target.value,
                            }))
                          }
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                          disabled={Boolean(openedBusiness) || summary.lotOptions.length === 0}
                        >
                          {summary.lotOptions.map((lot) => (
                            <option key={lot.id} value={lot.id}>
                              {lot.label} ({lot.occupancyLabel})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          District Fit
                        </p>
                        <p className="mt-2 text-xs text-white">
                          Preferred {summary.definition.preferredDistricts.map(formatValue).join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Allowed {summary.definition.allowedDistricts.map(formatValue).join(", ")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          Lot Capacity
                        </p>
                        <p className="mt-2 text-xs text-white">
                          Size {summary.lotSizes.map(formatValue).join(", ") || "Unknown"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {capacityForVariant
                            ? `${capacityForVariant.availableLots} available / ${capacityForVariant.totalLots} total for this variant in ${formatValue(district)}`
                            : "No district capacity summary available yet"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          Staffing Requirements
                        </p>
                        <p className="mt-2 text-xs text-white">
                          Owner 1 • Operators {summary.requiredOperatorSlots}/{summary.totalOperatorSlots}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Optional support up to {summary.optionalSupportSlots}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          Certification Requirements
                        </p>
                        <p className="mt-2 text-xs text-white">
                          {summary.requiredCertificationLabels.length > 0
                            ? summary.requiredCertificationLabels.join(", ")
                            : "No starter certification gate"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Higher-trust permissions may still require more certification later.
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          Staking / Trust
                        </p>
                        <p className="mt-2 text-xs text-white">
                          {formatValue(summary.definition.requiredStakingTier)} stake
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Higher-trust ops at {formatValue(summary.trustRequirement)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          Defense Expectations
                        </p>
                        <p className="mt-2 text-xs text-white">
                          Permissions open at {formatValue(summary.defenseRequirement)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Lot tags:{" "}
                          {selectedLot
                            ? selectedLot.lotTags.map(formatValue).join(", ")
                            : "No lot options"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-neutral-500">
                      Registry occupancy:
                      <span className="ml-2 text-white">
                        {selectedLot ? selectedLot.occupancyLabel : "No lot selected"}
                      </span>
                    </p>

                    <div className="mt-3 space-y-1.5">
                      {summary.evaluation.missingRequirements
                        .filter((check) => check.type !== "staking_tier")
                        .slice(0, 3)
                        .map((check) => (
                          <p key={check.type} className="text-xs text-amber-200">
                            {check.message}
                          </p>
                        ))}
                      {!openedBusiness && summary.setupEligible && (
                        <p className="text-xs text-emerald-200">
                          Setup can proceed. Staking-backed activation and live operations are
                          handled in the next stage.
                        </p>
                      )}
                      {!openedBusiness && lotSelectionBlocked && (
                        <p className="text-xs text-amber-200">
                          Choose an available registry lot before this business can be placed.
                        </p>
                      )}
                      {openedBusiness && (
                        <p className="text-xs text-red-200">
                          Opened on {formatTimestamp(openedBusiness.claimedAt)}.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={
                        !isActive ||
                        !summary.setupEligible ||
                        lotSelectionBlocked ||
                        hasLocalStarterBusinessClaim(missionState, summary.definition.id)
                      }
                      onClick={() => {
                        onMissionStateChange(
                          claimLocalStarterBusiness(missionState, {
                            businessTypeId: summary.definition.id,
                            district,
                            lotId: selectedLot?.id ?? null,
                            lotLabel: selectedLot?.label ?? null,
                            openedViaBusinessNftClass: selectedBusinessNftClassId,
                            claimedAt: new Date().toISOString(),
                          } satisfies LocalStarterBusinessRecord)
                        );
                      }}
                      className="mt-4 rounded-xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-100 transition enabled:hover:border-red-700 enabled:hover:bg-red-900/50 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-neutral-500"
                    >
                      {openedBusiness
                        ? "Starter Business Opened"
                        : !isActive
                        ? "Choose This Variant To Open"
                        : lotSelectionBlocked
                        ? "Lot Required"
                        : "Complete Setup"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
          </div>
        )}
      </div>
    </div>
  );
}
