import { ethers } from "ethers";
import { getMockCertificationMissions, evaluateCertificationMissionPass } from "../../src/lib/missions";
import {
  DEFAULT_CERTIFICATION_CONTRACT_ADDRESS,
  getCertificationContractCertificationId,
} from "../../src/lib/certificationContractConfig";
import { buildCertificationMintApprovalMessage } from "../../src/lib/certificationMinting";

const DEFAULT_BASE_RPC = "https://mainnet.base.org";
const BASE_CHAIN_ID = 8453;
const CERTIFICATION_CONTRACT_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function mintCertification(address to, uint256 id)",
] as const;

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

  try {
    const {
      missionId,
      walletAddress,
      answers,
      signature,
      message,
    } = req.body ?? {};

    if (!missionId || typeof missionId !== "string") {
      return res.status(400).json({ ok: false, error: "Missing missionId" });
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ ok: false, error: "Missing walletAddress" });
    }

    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ ok: false, error: "Missing signature" });
    }

    const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
    const expectedMessage = buildCertificationMintApprovalMessage({
      walletAddress: normalizedWalletAddress,
      missionId,
    });

    if (message !== expectedMessage) {
      return res.status(400).json({ ok: false, error: "Invalid mint approval message" });
    }

    const recoveredSigner = ethers.utils.verifyMessage(expectedMessage, signature);

    if (normalizeWalletAddress(recoveredSigner) !== normalizedWalletAddress) {
      return res.status(403).json({ ok: false, error: "Signature does not match walletAddress" });
    }

    const mission = getMockCertificationMissions().find((entry) => entry.id === missionId);

    if (!mission) {
      return res.status(404).json({ ok: false, error: "Unknown certification mission" });
    }

    const contractCertificationId = getCertificationContractCertificationId(mission.id);

    if (contractCertificationId == null) {
      return res.status(400).json({ ok: false, error: "Unsupported certification mission" });
    }

    const passEvaluation = evaluateCertificationMissionPass(mission, answers ?? {});

    if (!passEvaluation.passed) {
      return res.status(403).json({
        ok: false,
        error: "Certification answers did not meet the passing threshold",
      });
    }

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

    await tx.wait(1);

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
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to mint certification",
    });
  }
}
