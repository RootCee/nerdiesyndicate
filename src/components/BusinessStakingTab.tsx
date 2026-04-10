import { useMemo, useState } from 'react';
import { useBusinessCollection } from '../hooks/useBusinessCollection';
import { useBusinessStaking } from '../hooks/useBusinessStaking';
import {
  getBusinessClassActionGuidanceByTokenId,
  type BusinessSurfaceActionGuidance,
} from '../lib/businessActionGuidance';

interface BusinessStakingTabProps {
  walletAddress: string | null;
  actionGuidance?: BusinessSurfaceActionGuidance | null;
}

function formatValue(value: number | null, walletAddress: string | null) {
  if (!walletAddress) return '0';
  if (value == null) return 'Unavailable';
  return String(value);
}

export default function BusinessStakingTab({
  walletAddress,
  actionGuidance,
}: BusinessStakingTabProps) {
  const { businesses, loading, error, refetch } = useBusinessCollection(walletAddress);
  const [stakeAmounts, setStakeAmounts] = useState<Record<number, number>>({});
  const [unstakeAmounts, setUnstakeAmounts] = useState<Record<number, number>>({});
  const businessTokenIds = useMemo(() => businesses.map((business) => business.tokenId), [businesses]);
  const {
    approvalStatus,
    stakedBalances,
    pendingRewards,
    rewardSymbol,
    loading: stakingLoading,
    status: stakingStatus,
    approve,
    stake,
    unstake,
    claim,
  } = useBusinessStaking(walletAddress, businessTokenIds);

  const stakeAmountLookup = useMemo(
    () =>
      businesses.reduce<Record<number, number>>((acc, business) => {
        acc[business.tokenId] = stakeAmounts[business.tokenId] ?? 1;
        return acc;
      }, {}),
    [businesses, stakeAmounts]
  );

  const unstakeAmountLookup = useMemo(
    () =>
      businesses.reduce<Record<number, number>>((acc, business) => {
        acc[business.tokenId] = unstakeAmounts[business.tokenId] ?? 1;
        return acc;
      }, {}),
    [businesses, unstakeAmounts]
  );

  async function handleApprove() {
    const success = await approve();
    if (success) {
      refetch();
    }
  }

  async function handleStake(tokenId: number, ownedBalance: number | null) {
    const amount = stakeAmountLookup[tokenId] || 0;

    if (amount <= 0) {
      return;
    }

    if (ownedBalance != null && amount > ownedBalance) {
      return;
    }

    const success = await stake(tokenId, amount);
    if (success) {
      refetch();
    }
  }

  async function handleUnstake(tokenId: number, stakedBalance: number | null) {
    const amount = unstakeAmountLookup[tokenId] || 0;

    if (amount <= 0) {
      return;
    }

    if (stakedBalance != null && amount > stakedBalance) {
      return;
    }

    const success = await unstake(tokenId, amount);
    if (success) {
      refetch();
    }
  }

  async function handleClaim(tokenId: number) {
    const success = await claim(tokenId);
    if (success) {
      refetch();
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-red-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading staking view...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-2">Failed to load business staking data.</p>
        <p className="text-neutral-500 text-sm break-all">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Business Staking</h2>
          <p className="text-neutral-500 text-sm">
            Approve the staking contract, then stake, unstake, and claim rewards for your Business NFTs on Base.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              approvalStatus === null
                ? 'bg-zinc-800 text-neutral-400'
                : approvalStatus
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            {approvalStatus === null
              ? 'Wallet Required'
              : approvalStatus
              ? 'Staking Approved'
              : 'Approval Needed'}
          </span>
          <p className="text-neutral-600 text-sm">
            {walletAddress ? 'Approval covers all Business ERC-1155 tokens.' : 'Connect a wallet to manage staking.'}
          </p>
        </div>
      </div>

      {actionGuidance && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Activation Guidance
          </p>
          <p className="mt-2 text-sm text-neutral-300">
            On-chain balances and rewards remain visible here. Gameplay-sensitive activation actions
            now reflect the active operator’s current setup and qualification state.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            Current operator: <span className="text-white">{actionGuidance.activeOperatorLabel}</span>
          </p>
        </div>
      )}

      {stakingStatus.message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            stakingStatus.status === 'error'
              ? 'border-red-900/40 bg-red-950/30 text-red-200'
              : stakingStatus.status === 'success'
              ? 'border-emerald-900/40 bg-emerald-950/30 text-emerald-200'
              : 'border-zinc-800 bg-zinc-900/80 text-neutral-300'
          }`}
        >
          {stakingStatus.message}
        </div>
      )}

      {!approvalStatus && (
        <div
          className={`rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 ${
            actionGuidance?.approval.locked ? 'opacity-80' : ''
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-white font-semibold">Approve Staking Contract</h3>
              <p className="text-sm text-neutral-500 mt-1">
                The staking contract needs operator approval before it can move your Business NFTs.
              </p>
              {actionGuidance?.approval.locked && (
                <>
                  <p className="mt-2 text-xs text-amber-200">
                    {actionGuidance.approval.missingRequirements[0]}
                  </p>
                  <p className="mt-1 text-xs text-neutral-300">
                    Next action: <span className="text-white">{actionGuidance.approval.nextAction}</span>
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleApprove}
              disabled={
                !walletAddress ||
                stakingStatus.status === 'pending' ||
                actionGuidance?.approval.locked
              }
              className="rounded-xl border border-red-700/60 bg-red-950/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-neutral-500"
            >
              {stakingStatus.status === 'pending' && stakingStatus.action === 'approve'
                ? 'Approving...'
                : actionGuidance?.approval.locked
                ? 'Setup Required'
                : 'Approve Staking'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {businesses.map((business) => {
          const stakedBalance = stakedBalances[business.tokenId] ?? (walletAddress ? null : 0);
          const pendingReward = pendingRewards[business.tokenId] ?? (walletAddress ? null : '0');
          const classGuidance = actionGuidance
            ? getBusinessClassActionGuidanceByTokenId(actionGuidance, business.tokenId)
            : null;

          return (
            <article
              key={business.tokenId}
              className="overflow-hidden rounded-2xl border border-red-900/20 bg-zinc-900/80"
            >
              <div className="aspect-[4/3] bg-zinc-950 border-b border-zinc-800 flex items-center justify-center overflow-hidden">
                {business.image ? (
                  <img
                    src={business.image}
                    alt={business.metadataName || business.businessName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="px-6 text-center">
                    <p className="text-white font-semibold">{business.businessName}</p>
                    <p className="text-neutral-600 text-sm mt-2">Metadata image unavailable</p>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">{business.businessName}</h3>
                    {classGuidance && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                          classGuidance.stake.locked
                            ? 'bg-amber-950/80 text-amber-300'
                            : 'bg-emerald-950/80 text-emerald-300'
                        }`}
                      >
                        {classGuidance.stake.label}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-500 text-sm">Token ID #{business.tokenId}</p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-zinc-950/80 p-3">
                    <dt className="text-neutral-500">Owned</dt>
                    <dd className="text-white font-semibold">
                      {formatValue(business.ownedBalance, walletAddress)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-zinc-950/80 p-3">
                    <dt className="text-neutral-500">Staked</dt>
                    <dd className="text-white font-semibold">
                      {walletAddress
                        ? stakedBalance ?? (stakingLoading ? 'Loading...' : 'Unavailable')
                        : '0'}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-zinc-950/80 p-3 col-span-2">
                    <dt className="text-neutral-500">Pending Rewards</dt>
                    <dd className="text-white font-semibold">
                      {walletAddress
                        ? pendingReward ?? (stakingLoading ? 'Loading...' : 'Unavailable')
                        : '0'}{' '}
                      {rewardSymbol}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={() => handleClaim(business.tokenId)}
                  disabled={
                    !walletAddress ||
                    stakingStatus.status === 'pending' ||
                    (stakedBalance ?? 0) <= 0 ||
                    pendingReward == null ||
                    Number.parseFloat(pendingReward) <= 0
                  }
                  className="w-full rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/30 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-neutral-500"
                >
                  {stakingStatus.status === 'pending' &&
                  stakingStatus.action === 'claim' &&
                  stakingStatus.tokenId === business.tokenId
                    ? 'Claiming...'
                    : `Claim ${rewardSymbol}`}
                </button>

                {classGuidance && (
                  <div
                    className={`rounded-xl border px-4 py-3 ${
                      classGuidance.stake.locked
                        ? 'border-amber-900/40 bg-amber-950/20'
                        : 'border-emerald-900/40 bg-emerald-950/20'
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                      Gameplay Gate
                    </p>
                    {classGuidance.stake.missingRequirements.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {classGuidance.stake.missingRequirements.slice(0, 3).map((message) => (
                          <p key={message} className="text-xs text-amber-200">
                            {message}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-200">
                        This business class has an opened gameplay path that is ready for staking-backed activation.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-neutral-300">
                      Next action: <span className="text-white">{classGuidance.stake.nextAction}</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`rounded-xl bg-zinc-950/80 p-3 space-y-2 ${
                      classGuidance?.stake.locked ? 'opacity-75' : ''
                    }`}
                  >
                    <label
                      className="block text-neutral-500 text-sm"
                      htmlFor={`staking-stake-${business.tokenId}`}
                    >
                      Stake amount
                    </label>
                    <input
                      id={`staking-stake-${business.tokenId}`}
                      type="number"
                      min={1}
                      step={1}
                      value={stakeAmountLookup[business.tokenId]}
                      onChange={(event) =>
                        setStakeAmounts((current) => ({
                          ...current,
                          [business.tokenId]: Math.max(
                            1,
                            Number.parseInt(event.target.value || '1', 10) || 1
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      disabled={
                        !walletAddress ||
                        stakingStatus.status === 'pending' ||
                        classGuidance?.stake.locked
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleStake(business.tokenId, business.ownedBalance)}
                      disabled={
                        classGuidance?.stake.locked ||
                        !walletAddress ||
                        !approvalStatus ||
                        stakingStatus.status === 'pending' ||
                        stakeAmountLookup[business.tokenId] <= 0 ||
                        (business.ownedBalance != null &&
                          stakeAmountLookup[business.tokenId] > business.ownedBalance)
                      }
                      className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-neutral-500"
                    >
                      {stakingStatus.status === 'pending' &&
                      stakingStatus.action === 'stake' &&
                      stakingStatus.tokenId === business.tokenId
                        ? 'Staking...'
                        : classGuidance?.stake.locked
                        ? 'Setup Required'
                        : 'Stake'}
                    </button>
                  </div>

                  <div className="rounded-xl bg-zinc-950/80 p-3 space-y-2">
                    <label
                      className="block text-neutral-500 text-sm"
                      htmlFor={`staking-unstake-${business.tokenId}`}
                    >
                      Unstake amount
                    </label>
                    <input
                      id={`staking-unstake-${business.tokenId}`}
                      type="number"
                      min={1}
                      step={1}
                      value={unstakeAmountLookup[business.tokenId]}
                      onChange={(event) =>
                        setUnstakeAmounts((current) => ({
                          ...current,
                          [business.tokenId]: Math.max(
                            1,
                            Number.parseInt(event.target.value || '1', 10) || 1
                          ),
                        }))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                      disabled={!walletAddress || stakingStatus.status === 'pending'}
                    />
                    <button
                      type="button"
                      onClick={() => handleUnstake(business.tokenId, stakedBalance)}
                      disabled={
                        !walletAddress ||
                        stakingStatus.status === 'pending' ||
                        unstakeAmountLookup[business.tokenId] <= 0 ||
                        ((stakedBalance ?? 0) <= 0) ||
                        (stakedBalance != null &&
                          unstakeAmountLookup[business.tokenId] > stakedBalance)
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-neutral-500"
                    >
                      {stakingStatus.status === 'pending' &&
                      stakingStatus.action === 'unstake' &&
                      stakingStatus.tokenId === business.tokenId
                        ? 'Unstaking...'
                        : 'Unstake'}
                    </button>
                  </div>
                </div>

                {walletAddress &&
                  business.ownedBalance != null &&
                  stakeAmountLookup[business.tokenId] > business.ownedBalance && (
                    <p className="text-xs text-amber-300">
                      Stake amount cannot exceed your wallet-owned balance.
                    </p>
                  )}

                {walletAddress &&
                  stakedBalance != null &&
                  unstakeAmountLookup[business.tokenId] > stakedBalance && (
                    <p className="text-xs text-amber-300">
                      Unstake amount cannot exceed your currently staked balance.
                    </p>
                  )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
