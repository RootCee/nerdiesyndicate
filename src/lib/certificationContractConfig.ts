import type { CertificationMissionDefinition } from "../types/missions";

export const DEFAULT_CERTIFICATION_CONTRACT_ADDRESS =
  "0x210d5F3F40e11Db0bdF0Bd3292f69FE9dD809eea";

export const CERTIFICATION_CONTRACT_CERTIFICATION_IDS: Record<
  CertificationMissionDefinition["id"],
  number
> = {
  "beginner-defi-certification": 1,
  "business-operator-staking-certification": 2,
};

export function getCertificationContractCertificationId(
  missionId: CertificationMissionDefinition["id"]
): number | null {
  return CERTIFICATION_CONTRACT_CERTIFICATION_IDS[missionId] ?? null;
}
