export const CERTIFICATION_MINT_TELEMETRY_RELATIVE_PATH =
  '.runtime/certification-mint-telemetry.ndjson';

export type CertificationMintTelemetryEventType =
  | 'mint_requested'
  | 'signature_verified'
  | 'quiz_revalidated'
  | 'already_owned'
  | 'mint_submitted'
  | 'mint_confirmed'
  | 'mint_failed';

export type CertificationMintTelemetryOutcome = 'info' | 'success' | 'warning' | 'failure';

export interface CertificationMintTelemetryEvent {
  id: string;
  requestId: string;
  timestamp: string;
  missionId: string;
  certificationId: number | null;
  walletAddress: string;
  type: CertificationMintTelemetryEventType;
  outcome: CertificationMintTelemetryOutcome;
  detail: string;
  source: 'mock' | 'backend_mint_route';
  txHash?: string | null;
  errorCode?: string | null;
  contractAddress?: string | null;
  chainId?: number | null;
  httpStatus?: number | null;
  minted?: boolean | null;
  alreadyOwned?: boolean | null;
  refreshProofRecommended?: boolean | null;
}

type BuildCertificationMintTelemetryEventInput = {
  requestId: string;
  missionId: string;
  certificationId: number | null;
  walletAddress: string;
  type: CertificationMintTelemetryEventType;
  outcome: CertificationMintTelemetryOutcome;
  detail: string;
  txHash?: string | null;
  errorCode?: string | null;
  contractAddress?: string | null;
  chainId?: number | null;
  httpStatus?: number | null;
  minted?: boolean | null;
  alreadyOwned?: boolean | null;
  refreshProofRecommended?: boolean | null;
  timestamp?: string;
};

function sanitizeSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'evt';
}

export function maskTelemetryWalletAddress(walletAddress: string) {
  const normalized = walletAddress.trim();

  if (normalized.length <= 10) {
    return normalized || 'unknown-wallet';
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
}

export function buildCertificationMintTelemetryEvent(
  input: BuildCertificationMintTelemetryEventInput
): CertificationMintTelemetryEvent {
  const timestamp = input.timestamp ?? new Date().toISOString();

  return {
    id: `${sanitizeSegment(input.requestId)}-${sanitizeSegment(input.type)}-${Date.parse(timestamp)}`,
    requestId: input.requestId,
    timestamp,
    missionId: input.missionId,
    certificationId: input.certificationId,
    walletAddress: maskTelemetryWalletAddress(input.walletAddress),
    type: input.type,
    outcome: input.outcome,
    detail: input.detail.trim(),
    source: 'backend_mint_route',
    txHash: input.txHash ?? null,
    errorCode: input.errorCode ?? null,
    contractAddress: input.contractAddress ?? null,
    chainId: input.chainId ?? null,
    httpStatus: input.httpStatus ?? null,
    minted: input.minted ?? null,
    alreadyOwned: input.alreadyOwned ?? null,
    refreshProofRecommended: input.refreshProofRecommended ?? null,
  };
}
