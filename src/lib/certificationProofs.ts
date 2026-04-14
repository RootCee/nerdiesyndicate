import { ethers } from "ethers";
import { getMockCertificationMissions } from "./missions";
import { getReadProvider, getWalletProvider } from "./providers";
import { ABIS, BASE_CHAIN_ID, CONTRACTS, getReadContract } from "./contracts";
import { getCertificationContractCertificationId } from "./certificationContractConfig";
import type { LocalMissionSubjectState } from "./missionHarness";
import type {
  CertificationProofSource,
  CertificationRequirementStatusSummary,
} from "../types/business";
import type { CertificationMissionDefinition } from "../types/missions";

export interface SoulboundCertificationDefinition {
  missionId: CertificationMissionDefinition["id"];
  contractKey: string;
  contractCertificationId: number;
  proofKey: string | null;
  proofLabel: string | null;
  title: string;
}

export interface CertificationProofRecord {
  missionId: CertificationMissionDefinition["id"];
  title: string;
  proofLabel: string | null;
  hasProof: boolean;
  proofSources: CertificationProofSource[];
  contractKey: string | null;
  contractCertificationId: number | null;
}

export interface OperatorCertificationProofSummary {
  supportedMissionIds: CertificationMissionDefinition["id"][];
  certifiedMissionIds: CertificationMissionDefinition["id"][];
  proofsByMissionId: Record<
    CertificationMissionDefinition["id"],
    CertificationProofRecord
  >;
}

export interface CertificationContractProofReadInput {
  walletAddress: string;
  certifications: SoulboundCertificationDefinition[];
}

export interface CertificationContractProofReadRecord {
  missionId: CertificationMissionDefinition["id"];
  owned: boolean;
  contractKey: string;
  contractCertificationId: number;
}

export interface CertificationContractProofReadResult {
  walletAddress: string;
  proofsByMissionId: Partial<
    Record<
      CertificationMissionDefinition["id"],
      CertificationContractProofReadRecord
    >
  >;
}

export interface CertificationContractProofReader {
  readProofs(
    input: CertificationContractProofReadInput
  ): Promise<CertificationContractProofReadResult>;
}

export interface BuildOperatorCertificationProofSummaryInput {
  missionState: LocalMissionSubjectState;
  walletAddress?: string | null;
  contractResult?: CertificationContractProofReadResult | null;
}

function buildSoulboundCertificationDefinitions(): SoulboundCertificationDefinition[] {
  return getMockCertificationMissions().map((mission) => ({
    missionId: mission.id,
    contractKey: mission.proof?.proofKey ?? mission.id,
    contractCertificationId: getCertificationContractCertificationId(mission.id) ?? 0,
    proofKey: mission.proof?.proofKey ?? null,
    proofLabel: mission.proof?.label ?? null,
    title: mission.title,
  }));
}

export const SOULBOUND_CERTIFICATION_DEFINITIONS =
  buildSoulboundCertificationDefinitions();

export const FIRST_SOULBOUND_CERTIFICATION_INTEGRATION_MISSION_ID =
  "business-operator-staking-certification" as const;

const ZERO_BALANCE = ethers.constants.Zero;

export function getSoulboundCertificationDefinitions() {
  return SOULBOUND_CERTIFICATION_DEFINITIONS;
}

export function getSoulboundCertificationDefinition(
  missionId: CertificationMissionDefinition["id"]
) {
  return SOULBOUND_CERTIFICATION_DEFINITIONS.find(
    (definition) => definition.missionId === missionId
  ) ?? null;
}

export function buildCertificationContractProofReadInput(
  walletAddress: string
): CertificationContractProofReadInput {
  return {
    walletAddress,
    certifications: SOULBOUND_CERTIFICATION_DEFINITIONS,
  };
}

function buildEmptyContractProofReadResult(
  walletAddress: string
): CertificationContractProofReadResult {
  return {
    walletAddress,
    proofsByMissionId: {},
  };
}

async function getCertificationReadContract(): Promise<ethers.Contract> {
  const walletProvider = getWalletProvider();

  if (walletProvider) {
    try {
      const network = await walletProvider.getNetwork();

      if (network.chainId === BASE_CHAIN_ID) {
        return getReadContract(
          CONTRACTS.CERTIFICATION_SBT,
          ABIS.CertificationSoulbound,
          walletProvider
        );
      }
    } catch {
      // Fall back to the configured read-only provider below.
    }
  }

  return getReadContract(
    CONTRACTS.CERTIFICATION_SBT,
    ABIS.CertificationSoulbound,
    getReadProvider()
  );
}

export async function readCertificationContractProofs(
  input: CertificationContractProofReadInput
): Promise<CertificationContractProofReadResult> {
  if (!input.walletAddress) {
    return buildEmptyContractProofReadResult(input.walletAddress);
  }

  try {
    const contract = await getCertificationReadContract();
    const proofEntries = await Promise.all(
      input.certifications.map(async (certification) => {
        try {
          const balance = (await contract.balanceOf(
            input.walletAddress,
            certification.contractCertificationId
          )) as ethers.BigNumber;

          return [
            certification.missionId,
            {
              missionId: certification.missionId,
              owned: balance.gt(ZERO_BALANCE),
              contractKey: certification.contractKey,
              contractCertificationId: certification.contractCertificationId,
            },
          ] as const;
        } catch {
          return null;
        }
      })
    );

    return {
      walletAddress: input.walletAddress,
      proofsByMissionId: Object.fromEntries(
        proofEntries.filter(
          (
            entry
          ): entry is readonly [
            CertificationMissionDefinition["id"],
            CertificationContractProofReadRecord,
          ] => entry !== null
        )
      ),
    };
  } catch {
    return buildEmptyContractProofReadResult(input.walletAddress);
  }
}

export async function readOperatorCertificationProofSummary(
  input: Omit<BuildOperatorCertificationProofSummaryInput, "contractResult">
): Promise<OperatorCertificationProofSummary> {
  const contractResult =
    input.walletAddress != null && input.walletAddress !== ""
      ? await readCertificationContractProofs(
          buildCertificationContractProofReadInput(input.walletAddress)
        )
      : null;

  return buildOperatorCertificationProofSummary({
    ...input,
    contractResult,
  });
}

function getUniqueProofSources(
  records: CertificationProofRecord[]
): CertificationProofSource[] {
  return records.reduce<CertificationProofSource[]>((sources, record) => {
    record.proofSources.forEach((source) => {
      if (!sources.includes(source)) {
        sources.push(source);
      }
    });

    return sources;
  }, []);
}

function buildProofRecord(
  missionId: CertificationMissionDefinition["id"],
  missionState: LocalMissionSubjectState,
  contractResult?: CertificationContractProofReadResult | null
): CertificationProofRecord {
  const mission = getMockCertificationMissions().find((entry) => entry.id === missionId);

  if (!mission) {
    throw new Error(`Unknown certification mission: ${missionId}`);
  }

  const contractDefinition = getSoulboundCertificationDefinition(missionId);
  const localProof = missionState.completedMissionIds.includes(missionId);
  const contractProof = contractResult?.proofsByMissionId[missionId]?.owned ?? false;
  const hasProof = localProof || contractProof;
  const proofSources: CertificationProofSource[] = [];

  if (localProof) {
    proofSources.push("local_mission_completion");
  }

  if (contractProof) {
    proofSources.push("future_soulbound_nft");
  }

  return {
    missionId,
    title: mission.title,
    proofLabel: mission.proof?.label ?? null,
    hasProof,
    proofSources,
    contractKey: contractDefinition?.contractKey ?? null,
    contractCertificationId: contractDefinition?.contractCertificationId ?? null,
  };
}

export function buildOperatorCertificationProofSummary({
  missionState,
  walletAddress,
  contractResult,
}: BuildOperatorCertificationProofSummaryInput): OperatorCertificationProofSummary {
  const normalizedWalletAddress = walletAddress?.trim().toLowerCase() ?? null;
  const normalizedContractWalletAddress =
    contractResult?.walletAddress.trim().toLowerCase() ?? null;
  const matchingContractResult =
    normalizedWalletAddress == null ||
    normalizedContractWalletAddress == null ||
    normalizedWalletAddress === normalizedContractWalletAddress
      ? contractResult
      : null;
  const certificationMissionIds = getMockCertificationMissions().map(
    (mission) => mission.id
  );
  const proofEntries = certificationMissionIds.map((missionId) => {
    const proofRecord = buildProofRecord(
      missionId,
      missionState,
      matchingContractResult
    );

    return [
      missionId,
      proofRecord,
    ] as const;
  });
  const proofsByMissionId = Object.fromEntries(proofEntries) as OperatorCertificationProofSummary["proofsByMissionId"];

  return {
    supportedMissionIds: certificationMissionIds,
    certifiedMissionIds: certificationMissionIds
      .filter((missionId) => proofsByMissionId[missionId].hasProof),
    proofsByMissionId,
  };
}

export function buildLocalOperatorCertificationProofSummary(
  missionState: LocalMissionSubjectState
): OperatorCertificationProofSummary {
  return buildOperatorCertificationProofSummary({ missionState });
}

export function hasOperatorCertificationProof(
  proofSummary: OperatorCertificationProofSummary,
  missionId: CertificationMissionDefinition["id"]
): boolean {
  return proofSummary.proofsByMissionId[missionId]?.hasProof ?? false;
}

export function buildCertificationRequirementStatusSummary(
  requiredMissionIds: CertificationMissionDefinition["id"][],
  proofSummary: OperatorCertificationProofSummary
): CertificationRequirementStatusSummary {
  const completedMissionIds = requiredMissionIds.filter((missionId) =>
    hasOperatorCertificationProof(proofSummary, missionId)
  );
  const missingMissionIds = requiredMissionIds.filter(
    (missionId) => !hasOperatorCertificationProof(proofSummary, missionId)
  );
  const completedRecords = completedMissionIds.map(
    (missionId) => proofSummary.proofsByMissionId[missionId]
  );

  return {
    requiredMissionIds,
    completedMissionIds,
    missingMissionIds,
    proofSources: getUniqueProofSources(completedRecords),
    satisfied: missingMissionIds.length === 0,
  };
}
