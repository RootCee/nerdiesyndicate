import type { CertificationMissionAnswerState } from "../types/missions";

export interface CertificationMintRequestInput {
  missionId: string;
  walletAddress: string;
  answers: CertificationMissionAnswerState[string];
  signature: string;
}

export interface CertificationMintResponse {
  ok: boolean;
  walletAddress: string;
  missionId: string;
  contractCertificationId: number;
  minted: boolean;
  alreadyOwned: boolean;
  transactionHash: string | null;
  refreshProofRecommended: boolean;
  error?: string;
}

export function buildCertificationMintApprovalMessage(input: {
  walletAddress: string;
  missionId: string;
}) {
  return [
    "Nerdie Syndicate Certification Mint",
    `Wallet: ${input.walletAddress.toLowerCase()}`,
    `Mission: ${input.missionId}`,
    "Chain: Base (8453)",
  ].join("\n");
}

export async function requestCertificationMint(
  input: CertificationMintRequestInput
): Promise<CertificationMintResponse> {
  const response = await fetch("/api/certifications/mint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      message: buildCertificationMintApprovalMessage({
        walletAddress: input.walletAddress,
        missionId: input.missionId,
      }),
    }),
  });

  const data = (await response.json()) as CertificationMintResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? "Unable to mint certification.");
  }

  return data;
}
