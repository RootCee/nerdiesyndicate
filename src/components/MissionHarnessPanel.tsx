import { useMemo, useState, type ReactNode } from "react";
import BusinessEligibilityPreviewPanel from "./BusinessEligibilityPreviewPanel";
import BusinessOperationsPanel from "./BusinessOperationsPanel";
import {
  applyGeneralContractUtility,
  buildGeneralContractUtilitySummary,
} from "../lib/generalContracts";
import {
  evaluateAllMockCertificationMissions,
  evaluateAllMockMissions,
  getMockCertificationMissions,
  getMockMissionDistricts,
  getMockMissions,
} from "../lib/missions";
import {
  answerCertificationQuestion,
  applyMissionRewards,
  createLocalMissionSubjectState,
  fulfillMissionRequirements,
  type LocalMissionSubjectState,
} from "../lib/missionHarness";
import type { NFTGameplayProfile } from "../lib/nftGameplayProfile";
import type {
  CertificationMissionDefinition,
  MissionDefinition,
  MissionDistrict,
} from "../types/missions";

interface MissionHarnessSubject {
  tokenId: number;
  name: string;
  gameplayProfile: NFTGameplayProfile;
}

interface MissionHarnessPanelProps {
  subjects: MissionHarnessSubject[];
  selectedTokenId: number | null;
  onSelectTokenId: (tokenId: number) => void;
  missionStateByTokenId: Record<number, LocalMissionSubjectState>;
  onMissionStateChange: (tokenId: number, nextState: LocalMissionSubjectState) => void;
  onResetSubject: (tokenId: number) => void;
}

function formatMissionRequirement(type: string) {
  return type.replace(/_/g, " ");
}

function formatDistrictLabel(value: MissionDistrict) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatRoleLabel(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatCertificationQuestionLabel(index: number) {
  return `Q${index + 1}`;
}

function groupMissionsByDistrict(missions: MissionDefinition[]) {
  const districtOrder = getMockMissionDistricts();
  const grouped = districtOrder
    .map((district) => ({
      district,
      missions: missions.filter((mission) => mission.district === district),
    }))
    .filter((entry) => entry.missions.length > 0);

  const generalMissions = missions.filter((mission) => !mission.district);

  return {
    grouped,
    generalMissions,
  };
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-900/40"
      >
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-neutral-500">{subtitle}</p> : null}
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">
          {isOpen ? "Collapse" : "Expand"}
        </span>
      </button>
      {isOpen ? <div className="border-t border-zinc-800 px-4 py-4">{children}</div> : null}
    </div>
  );
}

export default function MissionHarnessPanel({
  subjects,
  selectedTokenId,
  onSelectTokenId,
  missionStateByTokenId,
  onMissionStateChange,
  onResetSubject,
}: MissionHarnessPanelProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    qualification: false,
    certifications: false,
    ownershipSetup: false,
    activationOperations: false,
  });
  const selectedSubject =
    subjects.find((subject) => subject.tokenId === selectedTokenId) ?? subjects[0] ?? null;

  const selectedState = useMemo(() => {
    if (!selectedSubject) {
      return null;
    }

    return (
      missionStateByTokenId[selectedSubject.tokenId] ??
      createLocalMissionSubjectState(selectedSubject.gameplayProfile)
    );
  }, [missionStateByTokenId, selectedSubject]);

  const evaluations = useMemo(() => {
    if (!selectedSubject || !selectedState) {
      return [];
    }

    return evaluateAllMockMissions(
      selectedState.missionProgress,
      selectedSubject.gameplayProfile.progression.profile.level.currentLevel
    );
  }, [selectedState, selectedSubject]);

  const certificationEvaluations = useMemo(() => {
    if (!selectedSubject || !selectedState) {
      return [];
    }

    return evaluateAllMockCertificationMissions(
      selectedState.certificationAnswers,
      selectedSubject.gameplayProfile.progression.profile.level.currentLevel
    );
  }, [selectedState, selectedSubject]);

  if (!selectedSubject || !selectedState) {
    return null;
  }

  const levelState = selectedSubject.gameplayProfile.progression.profile.level;
  const xpState = selectedSubject.gameplayProfile.progression.profile.xp;
  const repState = selectedSubject.gameplayProfile.progression.profile.reputation;
  const heatState = selectedSubject.gameplayProfile.progression.profile.heat;
  const availableMissionIds = new Set(evaluations.map((evaluation) => evaluation.missionId));
  const missionCatalog = getMockMissions().filter((mission) => availableMissionIds.has(mission.id));
  const { grouped, generalMissions } = groupMissionsByDistrict(missionCatalog);
  const certificationCatalog = getMockCertificationMissions().filter((mission) =>
    certificationEvaluations.some((evaluation) => evaluation.missionId === mission.id)
  );
  const subjectDistrict = selectedSubject.gameplayProfile.metadata.normalizedTraits.location;
  const subjectRole = selectedSubject.gameplayProfile.metadata.normalizedTraits.roleInNerdieCity;
  const setSectionOpen = (sectionId: string) =>
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));

  const renderMissionCard = (mission: MissionDefinition) => {
    const evaluation = evaluations.find((entry) => entry.missionId === mission.id);

    if (!evaluation) {
      return null;
    }

    const completedLocally = selectedState.completedMissionIds.includes(mission.id);
    const generalContractUtility = buildGeneralContractUtilitySummary(
      mission,
      selectedState
    );

    return (
      <div key={mission.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{mission.title}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                {mission.category}
              </span>
              {mission.district && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${
                    subjectDistrict === mission.district
                      ? "bg-red-950/80 text-red-200"
                      : "bg-zinc-800 text-neutral-300"
                  }`}
                >
                  {formatDistrictLabel(mission.district)}
                </span>
              )}
              {completedLocally && (
                <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Applied
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-400">{mission.description}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Eligibility: Level {mission.minLevel ?? 1}
              {mission.recommendedRoles?.length
                ? ` • best for ${mission.recommendedRoles.map(formatRoleLabel).join(", ")}`
                : ""}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Rewards: +{mission.rewards.xp} XP
              {mission.rewards.reputation ? `, +${mission.rewards.reputation} reputation` : ""}
              {mission.rewards.heat ? `, +${mission.rewards.heat} heat` : ""}
            </p>
            {generalContractUtility && (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  Operational Use
                </p>
                <p className="mt-2 text-xs text-neutral-300">
                  {generalContractUtility.operationalPurpose}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {generalContractUtility.progressionImpact}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {generalContractUtility.currentUseState}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onMissionStateChange(selectedSubject.tokenId, {
                  ...selectedState,
                  missionProgress: fulfillMissionRequirements(
                    selectedState.missionProgress,
                    mission.requirements
                  ),
                })
              }
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-zinc-600 hover:text-white"
            >
              Auto-Fill
            </button>
            <button
              type="button"
              disabled={!evaluation.completionEligible || completedLocally}
              onClick={() =>
                onMissionStateChange(
                  selectedSubject.tokenId,
                  applyGeneralContractUtility(
                    applyMissionRewards(selectedState, evaluation),
                    mission,
                    evaluation
                  )
                )
              }
              className="rounded-xl border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-200 transition enabled:hover:border-red-700 enabled:hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply Rewards
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {evaluation.progress.map((entry) => (
            <div key={entry.requirementType} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                  {formatMissionRequirement(entry.requirementType)}
                </span>
                <span className="text-xs font-semibold text-white">
                  {entry.current} / {entry.target}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${entry.complete ? "bg-emerald-500" : "bg-red-600"}`}
                  style={{ width: `${Math.min(100, (entry.current / entry.target) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCertificationCard = (mission: CertificationMissionDefinition) => {
    const evaluation = certificationEvaluations.find((entry) => entry.missionId === mission.id);

    if (!evaluation) {
      return null;
    }

    const completedLocally = selectedState.completedMissionIds.includes(mission.id);
    const answerMap = selectedState.certificationAnswers[mission.id] ?? {};

    return (
      <div key={mission.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{mission.title}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                certification
              </span>
              {completedLocally && (
                <span className="rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                  Applied
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-400">{mission.description}</p>
            <p className="mt-2 text-xs text-neutral-500">
              Pass score: {mission.passThreshold} / {mission.questions.length}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Rewards: +{mission.rewards.xp} XP
              {mission.rewards.reputation ? `, +${mission.rewards.reputation} reputation` : ""}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-neutral-300">
            Score: {evaluation.correctAnswers} / {evaluation.totalQuestions}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {mission.questions.map((question, index) => {
            const selectedOptionId = answerMap[question.id];
            const questionResult = evaluation.questionResults.find(
              (result) => result.questionId === question.id
            );

            return (
              <div key={question.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  {formatCertificationQuestionLabel(index)}
                </p>
                <p className="mt-2 text-sm text-white">{question.prompt}</p>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => {
                    const isSelected = selectedOptionId === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          onMissionStateChange(
                            selectedSubject.tokenId,
                            answerCertificationQuestion(
                              selectedState,
                              mission.id,
                              question.id,
                              option.id
                            )
                          )
                        }
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "border-red-700 bg-red-950/40 text-red-100"
                            : "border-zinc-700 bg-zinc-950 text-neutral-300 hover:border-zinc-600 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {questionResult?.answered && (
                  <p className="mt-2 text-xs text-neutral-500">{question.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-neutral-400">
            {evaluation.answeredQuestions < evaluation.totalQuestions
              ? `Answer ${evaluation.totalQuestions - evaluation.answeredQuestions} more question(s) to finish the quiz.`
              : evaluation.completionEligible
              ? "Passing score reached. Certification rewards are ready to apply."
              : "Quiz completed, but the passing score has not been reached yet."}
          </p>
          <button
            type="button"
            disabled={!evaluation.completionEligible || completedLocally}
            onClick={() =>
              onMissionStateChange(
                selectedSubject.tokenId,
                applyMissionRewards(selectedState, evaluation)
              )
            }
            className="rounded-xl border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-200 transition enabled:hover:border-red-700 enabled:hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {completedLocally ? "Certification Applied" : "Apply Certification Rewards"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Mission Test Harness</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-300">
            Local-only mission sandbox for testing XP, reputation, heat, and progression updates against the current NFT gameplay profile.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedSubject.tokenId}
            onChange={(event) => onSelectTokenId(Number(event.target.value))}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            {subjects.map((subject) => (
              <option key={subject.tokenId} value={subject.tokenId}>
                {subject.name} #{subject.tokenId}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onResetSubject(selectedSubject.tokenId)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-neutral-300 transition hover:border-zinc-600 hover:text-white"
          >
            Reset Local State
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Level</p>
          <p className="mt-2 text-xl font-black text-white">{levelState.currentLevel}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">XP</p>
          <p className="mt-2 text-xl font-black text-white">{xpState.lifetimeXP}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {xpState.levelXP}
            {xpState.nextLevelXP > 0 ? ` / ${xpState.nextLevelXP} to next` : " / max level"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Reputation</p>
          <p className="mt-2 text-xl font-black text-white">{repState?.score ?? 0}</p>
          <p className="mt-1 text-xs text-neutral-500">{repState?.band ?? "unknown"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Heat</p>
          <p className="mt-2 text-xl font-black text-white">{heatState?.score ?? 0}</p>
          <p className="mt-1 text-xs text-neutral-500">{heatState?.band ?? "cold"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-neutral-400">
        Subject profile:
        <span className="ml-2 text-white">
          {subjectDistrict ? formatDistrictLabel(subjectDistrict as MissionDistrict) : "No district affinity"}
        </span>
        <span className="mx-2 text-neutral-600">|</span>
        <span className="text-white">
          {subjectRole ? formatRoleLabel(subjectRole) : "No role trait"}
        </span>
      </div>

      <CollapsibleSection
        title="Qualification"
        subtitle="Certifications and mission groups can now be opened one section at a time."
        isOpen={openSections.qualification ?? false}
        onToggle={() => setSectionOpen("qualification")}
      >
        {certificationCatalog.length > 0 && (
          <CollapsibleSection
            title="Certification Missions"
            subtitle={`${certificationCatalog.length} certification mission${certificationCatalog.length === 1 ? "" : "s"}`}
            isOpen={openSections.certifications ?? false}
            onToggle={() => setSectionOpen("certifications")}
          >
            <div className="space-y-3">{certificationCatalog.map(renderCertificationCard)}</div>
          </CollapsibleSection>
        )}

        <div className="space-y-3">
          {grouped.map((entry) => {
            const sectionId = `district:${entry.district}`;

            return (
              <CollapsibleSection
                key={entry.district}
                title={formatDistrictLabel(entry.district)}
                subtitle={`${entry.missions.length} mission${entry.missions.length === 1 ? "" : "s"}`}
                isOpen={openSections[sectionId] ?? false}
                onToggle={() => setSectionOpen(sectionId)}
              >
                <div className="space-y-3">{entry.missions.map(renderMissionCard)}</div>
              </CollapsibleSection>
            );
          })}

          {generalMissions.length > 0 && (
            <CollapsibleSection
              title="General Contracts"
              subtitle={`${generalMissions.length} repeatable contract${generalMissions.length === 1 ? "" : "s"}`}
              isOpen={openSections.generalContracts ?? false}
              onToggle={() => setSectionOpen("generalContracts")}
            >
              <div className="space-y-3">{generalMissions.map(renderMissionCard)}</div>
            </CollapsibleSection>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Ownership / Setup"
        subtitle="Browse sector-backed business variants and expand only the one you want to inspect."
        isOpen={openSections.ownershipSetup ?? false}
        onToggle={() => setSectionOpen("ownershipSetup")}
      >
        <BusinessEligibilityPreviewPanel
          gameplayProfile={selectedSubject.gameplayProfile}
          missionState={selectedState}
          onMissionStateChange={(nextState) =>
            onMissionStateChange(selectedSubject.tokenId, nextState)
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Activation / Operations"
        subtitle="Opened businesses can now be browsed one variant at a time."
        isOpen={openSections.activationOperations ?? false}
        onToggle={() => setSectionOpen("activationOperations")}
      >
        <BusinessOperationsPanel
          gameplayProfile={selectedSubject.gameplayProfile}
          missionState={selectedState}
          onMissionStateChange={(nextState) =>
            onMissionStateChange(selectedSubject.tokenId, nextState)
          }
        />
      </CollapsibleSection>
    </div>
  );
}
