import { ethers } from "ethers";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getMockCertificationMissions, evaluateCertificationMissionPass } from "../../src/lib/missions";
import {
  DEFAULT_CERTIFICATION_CONTRACT_ADDRESS,
  getCertificationContractCertificationId,
} from "../../src/lib/certificationContractConfig";
import { buildCertificationMintApprovalMessage } from "../../src/lib/certificationMinting";
import {
  buildCertificationMintTelemetryEvent,
  CERTIFICATION_MINT_TELEMETRY_RELATIVE_PATH,
} from "../../src/lib/certificationTelemetry";

const DEFAULT_BASE_RPC = "https://mainnet.base.org";
const BASE_CHAIN_ID = 8453;
const CERTIFICATION_CONTRACT_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function mintCertification(address to, uint256 id)",
] as const;

type MintTelemetryContext = {
  requestId: string;
  missionId: string;
  certificationId: number | null;
  walletAddress: string;
  contractAddress?: string | null;
};

function getServerRpcUrl() {
  return (
    process.env.CERTIFICATION_MINTER_RPC_URL ||
    process.env.BASE_RPC_URL ||
    process.env.VITE_BASE_RPC_URL ||
    process.env.ALCHEMY_RPC_URL ||
    process.env.VITE_ALCHEMY_RPC_URL ||
    DEFAULT_BASE_RPC
  );
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function normalizeWalletAddress(walletAddress: string) {
  return ethers.utils.getAddress(walletAddress);
}

function createTelemetryRequestId() {
  return `cert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveTelemetryFilePath() {
  return path.resolve(process.cwd(), CERTIFICATION_MINT_TELEMETRY_RELATIVE_PATH);
}

async function appendTelemetryLine(line: string) {
  const filePath = resolveTelemetryFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${line}\n`, "utf8");
}

async function recordTelemetryEvent(
  context: MintTelemetryContext,
  event: {
    type:
      | "mint_requested"
      | "signature_verified"
      | "quiz_revalidated"
      | "already_owned"
      | "mint_submitted"
      | "mint_confirmed"
      | "mint_failed";
    outcome: "info" | "success" | "warning" | "failure";
    detail: string;
    txHash?: string | null;
    errorCode?: string | null;
    httpStatus?: number | null;
    minted?: boolean | null;
    alreadyOwned?: boolean | null;
    refreshProofRecommended?: boolean | null;
  }
) {
  try {
    const telemetryEvent = buildCertificationMintTelemetryEvent({
      requestId: context.requestId,
      missionId: context.missionId,
      certificationId: context.certificationId,
      walletAddress: context.walletAddress,
      contractAddress: context.contractAddress ?? null,
      chainId: BASE_CHAIN_ID,
      ...event,
    });

    await appendTelemetryLine(JSON.stringify(telemetryEvent));
  } catch (telemetryError) {
    console.error(
      "[certification-telemetry] failed to append event",
      telemetryError instanceof Error ? telemetryError.message : telemetryError
    );
  }
}

async function readCertificationOwnership(
  contract: ethers.Contract,
  walletAddress: string,
  certificationId: number
) {
  const balance = (await contract.balanceOf(walletAddress, certificationId)) as ethers.BigNumber;
  return balance.gt(ethers.constants.Zero);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const requestId = createTelemetryRequestId();
  let telemetryContext: MintTelemetryContext = {
    requestId,
    missionId: "unknown-mission",
    certificationId: null,
    walletAddress: typeof req.body?.walletAddress === "string" ? req.body.walletAddress : "unknown-wallet",
    contractAddress: process.env.CERTIFICATION_SBT_ADDRESS?.trim() || DEFAULT_CERTIFICATION_CONTRACT_ADDRESS,
  };

  try {
    const {
      missionId,
      walletAddress,
      answers,
      signature,
      message,
    } = req.body ?? {};

    if (typeof missionId === "string") {
      telemetryContext = {
        ...telemetryContext,
        missionId,
      };
    }

    if (!missionId || typeof missionId !== "string") {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because missionId was missing.",
        errorCode: "missing_mission_id",
        httpStatus: 400,
        minted: false,
      });
      return res.status(400).json({ ok: false, error: "Missing missionId" });
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because walletAddress was missing.",
        errorCode: "missing_wallet_address",
        httpStatus: 400,
        minted: false,
      });
      return res.status(400).json({ ok: false, error: "Missing walletAddress" });
    }

    telemetryContext = {
      ...telemetryContext,
      walletAddress,
    };

    if (!signature || typeof signature !== "string") {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because signature was missing.",
        errorCode: "missing_signature",
        httpStatus: 400,
        minted: false,
      });
      return res.status(400).json({ ok: false, error: "Missing signature" });
    }

    const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    telemetryContext = {
      ...telemetryContext,
      walletAddress: normalizedWalletAddress,
    };
    const expectedMessage = buildCertificationMintApprovalMessage({
      walletAddress: normalizedWalletAddress,
      missionId,
    });

    if (message !== expectedMessage) {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because the signed approval message did not match the canonical payload.",
        errorCode: "invalid_mint_approval_message",
        httpStatus: 400,
        minted: false,
      });
      return res.status(400).json({ ok: false, error: "Invalid mint approval message" });
    }

    await recordTelemetryEvent(telemetryContext, {
      type: "mint_requested",
      outcome: "info",
      detail: "Mint request accepted for backend validation.",
      httpStatus: 202,
      minted: false,
    });

    const recoveredSigner = ethers.utils.verifyMessage(expectedMessage, signature);

    if (normalizeWalletAddress(recoveredSigner) !== normalizedWalletAddress) {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because the wallet signature did not match the recipient wallet.",
        errorCode: "signature_wallet_mismatch",
        httpStatus: 403,
        minted: false,
      });
      return res.status(403).json({ ok: false, error: "Signature does not match walletAddress" });
    }

    await recordTelemetryEvent(telemetryContext, {
      type: "signature_verified",
      outcome: "info",
      detail: "Wallet signature matched the canonical mint approval message.",
      httpStatus: 202,
      minted: false,
    });

    const mission = getMockCertificationMissions().find((entry) => entry.id === missionId);

    if (!mission) {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because the certification mission was unknown.",
        errorCode: "unknown_certification_mission",
        httpStatus: 404,
        minted: false,
      });
      return res.status(404).json({ ok: false, error: "Unknown certification mission" });
    }

    const contractCertificationId = getCertificationContractCertificationId(mission.id);
    telemetryContext = {
      ...telemetryContext,
      certificationId: contractCertificationId ?? null,
    };

    if (contractCertificationId == null) {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because the certification mission is not mapped to a supported contract ID.",
        errorCode: "unsupported_certification_mission",
        httpStatus: 400,
        minted: false,
      });
      return res.status(400).json({ ok: false, error: "Unsupported certification mission" });
    }

    const passEvaluation = evaluateCertificationMissionPass(mission, answers ?? {});

    if (!passEvaluation.passed) {
      await recordTelemetryEvent(telemetryContext, {
        type: "mint_failed",
        outcome: "failure",
        detail: "Mint request rejected because the certification answers did not meet the passing threshold.",
        errorCode: "quiz_revalidation_failed",
        httpStatus: 403,
        minted: false,
      });
      return res.status(403).json({
        ok: false,
        error: "Certification answers did not meet the passing threshold",
      });
    }

    await recordTelemetryEvent(telemetryContext, {
      type: "quiz_revalidated",
      outcome: "info",
      detail: "Certification answers passed server-side revalidation.",
      httpStatus: 202,
      minted: false,
    });

    const provider = new ethers.providers.JsonRpcProvider(getServerRpcUrl(), {
      name: "base",
      chainId: BASE_CHAIN_ID,
    });
    const signer = new ethers.Wallet(
      getRequiredEnv("CERTIFICATION_MINTER_PRIVATE_KEY"),
      provider
    );
    const contractAddress =
      process.env.CERTIFICATION_SBT_ADDRESS?.trim() ||
      DEFAULT_CERTIFICATION_CONTRACT_ADDRESS;
    const readContract = new ethers.Contract(
      contractAddress,
      CERTIFICATION_CONTRACT_ABI,
      provider
    );
    const writeContract = new ethers.Contract(
      contractAddress,
      CERTIFICATION_CONTRACT_ABI,
      signer
    );

    for (const prerequisiteMissionId of mission.prerequisiteCertificationMissionIds ?? []) {
      const prerequisiteCertificationId =
        getCertificationContractCertificationId(prerequisiteMissionId);

      if (prerequisiteCertificationId == null) {
        await recordTelemetryEvent(telemetryContext, {
          type: "mint_failed",
          outcome: "failure",
          detail: `Mint request rejected because prerequisite mission ${prerequisiteMissionId} is not mapped to a supported contract ID.`,
          errorCode: "unsupported_prerequisite_certification",
          httpStatus: 400,
          minted: false,
        });
        return res.status(400).json({
          ok: false,
          error: `Unsupported prerequisite certification: ${prerequisiteMissionId}`,
        });
      }

      const hasPrerequisite = await readCertificationOwnership(
        readContract,
        normalizedWalletAddress,
        prerequisiteCertificationId
      );

      if (!hasPrerequisite) {
        await recordTelemetryEvent(telemetryContext, {
          type: "mint_failed",
          outcome: "failure",
          detail: `Mint request rejected because prerequisite certification ${prerequisiteMissionId} was not owned onchain.`,
          errorCode: "missing_prerequisite_certification",
          httpStatus: 403,
          minted: false,
        });
        return res.status(403).json({
          ok: false,
          error: `Missing prerequisite certification: ${prerequisiteMissionId}`,
        });
      }
    }

    const alreadyOwned = await readCertificationOwnership(
      readContract,
      normalizedWalletAddress,
      contractCertificationId
    );

    if (alreadyOwned) {
      await recordTelemetryEvent(telemetryContext, {
        type: "already_owned",
        outcome: "success",
        detail: "Certification was already owned, so no new mint transaction was submitted.",
        httpStatus: 200,
        minted: false,
        alreadyOwned: true,
        refreshProofRecommended: true,
      });
      return res.status(200).json({
        ok: true,
        walletAddress: normalizedWalletAddress,
        missionId: mission.id,
        contractCertificationId,
        minted: false,
        alreadyOwned: true,
        transactionHash: null,
        refreshProofRecommended: true,
      });
    }

    const tx = await writeContract.mintCertification(
      normalizedWalletAddress,
      contractCertificationId
    );

    await recordTelemetryEvent(telemetryContext, {
      type: "mint_submitted",
      outcome: "info",
      detail: "Mint transaction submitted on Base.",
      txHash: tx.hash,
      httpStatus: 202,
      minted: true,
      alreadyOwned: false,
      refreshProofRecommended: true,
    });

    await tx.wait(1);

    await recordTelemetryEvent(telemetryContext, {
      type: "mint_confirmed",
      outcome: "success",
      detail: "Mint transaction confirmed and proof refresh is recommended.",
      txHash: tx.hash,
      httpStatus: 200,
      minted: true,
      alreadyOwned: false,
      refreshProofRecommended: true,
    });

    return res.status(200).json({
      ok: true,
      walletAddress: normalizedWalletAddress,
      missionId: mission.id,
      contractCertificationId,
      minted: true,
      alreadyOwned: false,
      transactionHash: tx.hash,
      refreshProofRecommended: true,
    });
  } catch (error) {
    await recordTelemetryEvent(telemetryContext, {
      type: "mint_failed",
      outcome: "failure",
      detail:
        error instanceof Error ? error.message : "Unable to mint certification because of an unexpected server error.",
      errorCode: "mint_route_exception",
      httpStatus: 500,
      minted: false,
    });

    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to mint certification",
    });
  }
}
