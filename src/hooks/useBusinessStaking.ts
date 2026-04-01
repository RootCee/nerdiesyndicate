import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { ABIS, BASE_CHAIN_ID, CONTRACTS, getSignerContract } from '../lib/contracts';
import { getReadProvider, getWalletProvider } from '../lib/providers';

export type BusinessStakingAction = 'approve' | 'stake' | 'unstake' | 'claim' | null;

export interface BusinessStakingStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  action: BusinessStakingAction;
  tokenId: number | null;
  message: string | null;
}

interface StakeSnapshot {
  amount: number | null;
  pendingReward: string | null;
}

interface UseBusinessStakingReturn {
  approvalStatus: boolean | null;
  stakedBalances: Record<number, number | null>;
  pendingRewards: Record<number, string | null>;
  rewardSymbol: string;
  loading: boolean;
  status: BusinessStakingStatus;
  approve: () => Promise<boolean>;
  stake: (tokenId: number, amount: number) => Promise<boolean>;
  unstake: (tokenId: number, amount: number) => Promise<boolean>;
  claim: (tokenId: number) => Promise<boolean>;
  refetch: () => void;
}

function getReadableError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      reason?: string;
      message?: string;
      data?: { message?: string };
      error?: { message?: string; data?: { message?: string } };
    };

    return (
      maybeError.reason ||
      maybeError.data?.message ||
      maybeError.error?.data?.message ||
      maybeError.error?.message ||
      maybeError.message ||
      'Transaction failed.'
    );
  }

  return 'Transaction failed.';
}

function toSafeNumber(value: ethers.BigNumber): number | null {
  try {
    return value.toNumber();
  } catch {
    return null;
  }
}

async function ensureBaseWallet() {
  const walletProvider = getWalletProvider();
  if (!walletProvider) {
    throw new Error('Connect a wallet before using staking.');
  }

  await walletProvider.send('eth_requestAccounts', []);
  const network = await walletProvider.getNetwork();

  if (network.chainId !== BASE_CHAIN_ID) {
    if (!window.ethereum?.request) {
      throw new Error('Switch your wallet to Base before using staking.');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
      });
    } catch {
      throw new Error('Please switch your wallet to Base and try again.');
    }
  }

  return walletProvider;
}

export function useBusinessStaking(
  walletAddress: string | null,
  tokenIds: number[]
): UseBusinessStakingReturn {
  const [approvalStatus, setApprovalStatus] = useState<boolean | null>(null);
  const [stakedBalances, setStakedBalances] = useState<Record<number, number | null>>({});
  const [pendingRewards, setPendingRewards] = useState<Record<number, string | null>>({});
  const [rewardSymbol, setRewardSymbol] = useState('NERDIE');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<BusinessStakingStatus>({
    status: 'idle',
    action: null,
    tokenId: null,
    message: null,
  });
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!walletAddress) {
        if (!cancelled) {
          setApprovalStatus(null);
          setStakedBalances(
            tokenIds.reduce<Record<number, number | null>>((acc, tokenId) => {
              acc[tokenId] = 0;
              return acc;
            }, {})
          );
          setPendingRewards(
            tokenIds.reduce<Record<number, string | null>>((acc, tokenId) => {
              acc[tokenId] = '0';
              return acc;
            }, {})
          );
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const provider = getReadProvider();
        const businessContract = new ethers.Contract(CONTRACTS.BUSINESS_NFT, ABIS.Businesses, provider);
        const stakingContract = new ethers.Contract(CONTRACTS.STAKING, ABIS.Staking, provider);
        const rewardTokenContract = new ethers.Contract(CONTRACTS.NERDIE_TOKEN, ABIS.ERC20, provider);

        const [approved, rewardTokenDecimalsRaw, rewardTokenSymbol] = await Promise.all([
          businessContract.isApprovedForAll(walletAddress, CONTRACTS.STAKING).catch(() => null),
          rewardTokenContract.decimals().catch(() => 18),
          rewardTokenContract.symbol().catch(() => 'NERDIE'),
        ]);
        const rewardTokenDecimals =
          typeof rewardTokenDecimalsRaw === 'number' ? rewardTokenDecimalsRaw : 18;
        const stakes = await Promise.all(
          tokenIds.map(async (tokenId): Promise<readonly [number, StakeSnapshot]> => {
            const stakeInfo = await stakingContract.stakes(walletAddress, tokenId).catch(() => null);
            if (!stakeInfo) {
              return [tokenId, { amount: null, pendingReward: null }] as const;
            }

            const amountRaw =
              stakeInfo.amount && ethers.BigNumber.isBigNumber(stakeInfo.amount)
                ? stakeInfo.amount
                : Array.isArray(stakeInfo) && ethers.BigNumber.isBigNumber(stakeInfo[0])
                ? stakeInfo[0]
                : null;

            const pendingRewardRaw =
              stakeInfo.pendingReward && ethers.BigNumber.isBigNumber(stakeInfo.pendingReward)
                ? stakeInfo.pendingReward
                : Array.isArray(stakeInfo) && ethers.BigNumber.isBigNumber(stakeInfo[2])
                ? stakeInfo[2]
                : null;

            return [
              tokenId,
              {
                amount: amountRaw ? toSafeNumber(amountRaw) : null,
                pendingReward: pendingRewardRaw
                  ? ethers.utils.formatUnits(pendingRewardRaw, rewardTokenDecimals)
                  : '0',
              },
            ] as const;
          })
        );

        if (!cancelled) {
          setApprovalStatus(typeof approved === 'boolean' ? approved : null);
          setRewardSymbol(typeof rewardTokenSymbol === 'string' && rewardTokenSymbol ? rewardTokenSymbol : 'NERDIE');
          setStakedBalances(
            Object.fromEntries(stakes.map(([tokenId, value]) => [tokenId, value.amount]))
          );
          setPendingRewards(
            Object.fromEntries(stakes.map(([tokenId, value]) => [tokenId, value.pendingReward]))
          );
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setStatus({
            status: 'error',
            action: null,
            tokenId: null,
            message: getReadableError(error),
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, tokenIds, fetchKey]);

  async function approve() {
    if (!walletAddress) {
      setStatus({
        status: 'error',
        action: 'approve',
        tokenId: null,
        message: 'Connect your wallet to approve staking.',
      });
      return false;
    }

    setStatus({
      status: 'pending',
      action: 'approve',
      tokenId: null,
      message: 'Approval submitted. Waiting for confirmation...',
    });

    try {
      await ensureBaseWallet();
      const contract = await getSignerContract(CONTRACTS.BUSINESS_NFT, ABIS.Businesses);
      await contract.estimateGas.setApprovalForAll(CONTRACTS.STAKING, true);
      const tx = await contract.setApprovalForAll(CONTRACTS.STAKING, true);
      await tx.wait();

      setStatus({
        status: 'success',
        action: 'approve',
        tokenId: null,
        message: 'Staking approval confirmed.',
      });
      setFetchKey((value) => value + 1);
      return true;
    } catch (error: unknown) {
      setStatus({
        status: 'error',
        action: 'approve',
        tokenId: null,
        message: getReadableError(error),
      });
      return false;
    }
  }

  async function stake(tokenId: number, amount: number) {
    if (!walletAddress) {
      setStatus({
        status: 'error',
        action: 'stake',
        tokenId,
        message: 'Connect your wallet to stake.',
      });
      return false;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      setStatus({
        status: 'error',
        action: 'stake',
        tokenId,
        message: 'Enter a valid stake amount greater than zero.',
      });
      return false;
    }

    setStatus({
      status: 'pending',
      action: 'stake',
      tokenId,
      message: `Stake submitted for token #${tokenId}. Waiting for confirmation...`,
    });

    try {
      await ensureBaseWallet();
      const contract = await getSignerContract(CONTRACTS.STAKING, ABIS.Staking);
      await contract.estimateGas.stake(tokenId, amount);
      const tx = await contract.stake(tokenId, amount);
      await tx.wait();

      setStatus({
        status: 'success',
        action: 'stake',
        tokenId,
        message: `Successfully staked ${amount} for token #${tokenId}.`,
      });
      setFetchKey((value) => value + 1);
      return true;
    } catch (error: unknown) {
      setStatus({
        status: 'error',
        action: 'stake',
        tokenId,
        message: getReadableError(error),
      });
      return false;
    }
  }

  async function unstake(tokenId: number, amount: number) {
    if (!walletAddress) {
      setStatus({
        status: 'error',
        action: 'unstake',
        tokenId,
        message: 'Connect your wallet to unstake.',
      });
      return false;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      setStatus({
        status: 'error',
        action: 'unstake',
        tokenId,
        message: 'Enter a valid unstake amount greater than zero.',
      });
      return false;
    }

    setStatus({
      status: 'pending',
      action: 'unstake',
      tokenId,
      message: `Unstake submitted for token #${tokenId}. Waiting for confirmation...`,
    });

    try {
      await ensureBaseWallet();
      const contract = await getSignerContract(CONTRACTS.STAKING, ABIS.Staking);
      await contract.estimateGas.unstake(tokenId, amount);
      const tx = await contract.unstake(tokenId, amount);
      await tx.wait();

      setStatus({
        status: 'success',
        action: 'unstake',
        tokenId,
        message: `Successfully unstaked ${amount} for token #${tokenId}.`,
      });
      setFetchKey((value) => value + 1);
      return true;
    } catch (error: unknown) {
      setStatus({
        status: 'error',
        action: 'unstake',
        tokenId,
        message: getReadableError(error),
      });
      return false;
    }
  }

  async function claim(tokenId: number) {
    if (!walletAddress) {
      setStatus({
        status: 'error',
        action: 'claim',
        tokenId,
        message: 'Connect your wallet to claim rewards.',
      });
      return false;
    }

    setStatus({
      status: 'pending',
      action: 'claim',
      tokenId,
      message: `Claim submitted for token #${tokenId}. Waiting for confirmation...`,
    });

    try {
      await ensureBaseWallet();
      const contract = await getSignerContract(CONTRACTS.STAKING, ABIS.Staking);
      await contract.estimateGas.claimReward(tokenId);
      const tx = await contract.claimReward(tokenId);
      await tx.wait();

      setStatus({
        status: 'success',
        action: 'claim',
        tokenId,
        message: `Successfully claimed rewards for token #${tokenId}.`,
      });
      setFetchKey((value) => value + 1);
      return true;
    } catch (error: unknown) {
      setStatus({
        status: 'error',
        action: 'claim',
        tokenId,
        message: getReadableError(error),
      });
      return false;
    }
  }

  return {
    approvalStatus,
    stakedBalances,
    pendingRewards,
    rewardSymbol,
    loading,
    status,
    approve,
    stake,
    unstake,
    claim,
    refetch: () => setFetchKey((value) => value + 1),
  };
}
