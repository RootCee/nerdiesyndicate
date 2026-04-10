import { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useBusinessCollection } from '../hooks/useBusinessCollection';
import { BASE_CHAIN_ID, CONTRACTS, ABIS, getSignerContract } from '../lib/contracts';
import { getWalletProvider } from '../lib/providers';
import {
  getBusinessClassActionGuidanceByTokenId,
  type BusinessSurfaceActionGuidance,
} from '../lib/businessActionGuidance';

interface BusinessCollectionTabProps {
  walletAddress: string | null;
  actionGuidance?: BusinessSurfaceActionGuidance | null;
}

function formatOwnedBalance(value: number | null, walletAddress: string | null) {
  if (!walletAddress) return '0';
  if (value == null) return 'Unavailable';
  return String(value);
}

function getMintAvailabilityLabel(totalMinted: number | null, maxSupply: number | null) {
  if (totalMinted == null || maxSupply == null) return 'Supply unavailable';
  if (totalMinted >= maxSupply) return 'Sold out';
  return `${maxSupply - totalMinted} remaining`;
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
      'Mint failed.'
    );
  }

  return 'Mint failed.';
}

export default function BusinessCollectionTab({
  walletAddress,
  actionGuidance,
}: BusinessCollectionTabProps) {
  const { businesses, loading, error, refetch } = useBusinessCollection(walletAddress);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [pendingTokenId, setPendingTokenId] = useState<number | null>(null);
  const [mintMessage, setMintMessage] = useState<string | null>(null);

  const quantityLookup = useMemo(
    () =>
      businesses.reduce<Record<number, number>>((acc, business) => {
        acc[business.tokenId] = quantities[business.tokenId] ?? 1;
        return acc;
      }, {}),
    [businesses, quantities]
  );

  async function ensureBaseWallet() {
    const walletProvider = getWalletProvider();
    if (!walletProvider) {
      throw new Error('Connect a wallet before minting.');
    }

    await walletProvider.send('eth_requestAccounts', []);
    const network = await walletProvider.getNetwork();

    if (network.chainId !== BASE_CHAIN_ID) {
      if (!window.ethereum?.request) {
        throw new Error('Switch your wallet to Base before minting.');
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
  }

  async function handleMint(tokenId: number, quantity: number, unitPrice: ethers.BigNumber) {
    if (!walletAddress) {
      setMintMessage('Connect your wallet to mint a business NFT.');
      return;
    }

    setPendingTokenId(tokenId);
    setMintMessage(null);

    try {
      await ensureBaseWallet();
      const walletProvider = getWalletProvider();
      if (!walletProvider) {
        throw new Error('Connect a wallet before minting.');
      }

      const signer = walletProvider.getSigner();
      const signerAddress = await signer.getAddress();
      const contract = await getSignerContract(CONTRACTS.BUSINESS_NFT, ABIS.Businesses);
      const totalValue = unitPrice.mul(quantity);
      const walletBalance = await walletProvider.getBalance(signerAddress);

      if (walletBalance.lt(totalValue)) {
        throw new Error(
          `Not enough ETH on Base. Mint cost is ${ethers.utils.formatEther(totalValue)} ETH plus gas.`
        );
      }

      try {
        await contract.estimateGas.mintBusiness(tokenId, quantity, walletAddress, {
          value: totalValue,
        });
      } catch (estimateError: unknown) {
        throw new Error(getReadableError(estimateError));
      }

      const tx = await contract.mintBusiness(tokenId, quantity, walletAddress, {
        value: totalValue,
      });

      setMintMessage(`Mint submitted for token #${tokenId}. Waiting for confirmation...`);
      await tx.wait();
      setMintMessage(`Successfully minted ${quantity} business NFT${quantity > 1 ? 's' : ''} for token #${tokenId}.`);
      refetch();
    } catch (err: unknown) {
      const message = getReadableError(err);
      setMintMessage(message);
    } finally {
      setPendingTokenId(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-red-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-neutral-500">Loading business collection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-2">Failed to load business collection.</p>
        <p className="text-neutral-500 text-sm break-all">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Business Collection</h2>
          <p className="text-neutral-500 text-sm">
            Collection display and minting for the Business ERC-1155 collection on Base.
          </p>
        </div>
        <p className="text-neutral-600 text-sm">
          {walletAddress ? 'Owned balances shown for connected wallet.' : 'Connect a wallet to see owned balances.'}
        </p>
      </div>

      {actionGuidance && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Gameplay Qualification Guidance
          </p>
          <p className="mt-2 text-sm text-neutral-300">
            Assets stay visible here, but business acquisition now reflects the active operator’s
            gameplay path. Current operator: <span className="text-white">{actionGuidance.activeOperatorLabel}</span>
          </p>
        </div>
      )}

      {mintMessage && (
        <div className="rounded-2xl border border-red-900/20 bg-zinc-900/80 px-4 py-3 text-sm text-neutral-300">
          {mintMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {businesses.map((business) => {
          const classGuidance = actionGuidance
            ? getBusinessClassActionGuidanceByTokenId(actionGuidance, business.tokenId)
            : null;

          return (
          <article key={business.tokenId} className="overflow-hidden rounded-2xl border border-red-900/20 bg-zinc-900/80">
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
                  <div>
                    <h3 className="text-lg font-bold text-white">{business.businessName}</h3>
                    <p className="text-neutral-500 text-sm">Token ID #{business.tokenId}</p>
                  </div>
                  {classGuidance && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                        classGuidance.mint.locked
                          ? 'bg-amber-950/80 text-amber-300'
                          : 'bg-emerald-950/80 text-emerald-300'
                      }`}
                    >
                      {classGuidance.mint.label}
                    </span>
                  )}
                </div>
                <p className="text-neutral-600 text-xs mt-1">
                  {getMintAvailabilityLabel(business.totalMinted, business.maxSupply)}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-950/80 p-3">
                  <dt className="text-neutral-500">Mint Price</dt>
                  <dd className="text-white font-semibold">{business.businessPrice} ETH</dd>
                </div>
                <div className="rounded-xl bg-zinc-950/80 p-3">
                  <dt className="text-neutral-500">Owned</dt>
                  <dd className="text-white font-semibold">
                    {formatOwnedBalance(business.ownedBalance, walletAddress)}
                  </dd>
                </div>
                <div className="rounded-xl bg-zinc-950/80 p-3">
                  <dt className="text-neutral-500">Max Supply</dt>
                  <dd className="text-white font-semibold">
                    {business.maxSupply ?? 'Unavailable'}
                  </dd>
                </div>
                <div className="rounded-xl bg-zinc-950/80 p-3">
                  <dt className="text-neutral-500">Total Minted</dt>
                  <dd className="text-white font-semibold">
                    {business.totalMinted ?? 'Unavailable'}
                  </dd>
                </div>
              </dl>

              {classGuidance && (
                <div
                  className={`rounded-xl border px-4 py-3 ${
                    classGuidance.mint.locked
                      ? 'border-amber-900/40 bg-amber-950/20'
                      : 'border-emerald-900/40 bg-emerald-950/20'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Gameplay Gate
                  </p>
                  {classGuidance.mint.missingRequirements.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {classGuidance.mint.missingRequirements.slice(0, 3).map((message) => (
                        <p key={message} className="text-xs text-amber-200">
                          {message}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-emerald-200">
                      Current gameplay qualification is aligned for this business family.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-300">
                    Next action: <span className="text-white">{classGuidance.mint.nextAction}</span>
                  </p>
                </div>
              )}

              <div
                className={`rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3 ${
                  classGuidance?.mint.locked ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-neutral-500 text-sm" htmlFor={`business-qty-${business.tokenId}`}>
                    Mint quantity
                  </label>
                  <select
                    id={`business-qty-${business.tokenId}`}
                    value={quantityLookup[business.tokenId]}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [business.tokenId]: Number.parseInt(event.target.value, 10),
                      }))
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    disabled={pendingTokenId === business.tokenId || classGuidance?.mint.locked}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Total cost</span>
                  <span className="text-white font-semibold">
                    {ethers.utils.formatEther(
                      business.businessPriceRaw.mul(quantityLookup[business.tokenId] || 1)
                    )}{' '}
                    ETH
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleMint(
                      business.tokenId,
                      quantityLookup[business.tokenId] || 1,
                      business.businessPriceRaw
                    )
                  }
                  disabled={
                    classGuidance?.mint.locked ||
                    pendingTokenId === business.tokenId ||
                    !walletAddress ||
                    (business.maxSupply != null &&
                      business.totalMinted != null &&
                      business.totalMinted >= business.maxSupply)
                  }
                  className="w-full rounded-xl bg-red-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-neutral-500"
                >
                  {pendingTokenId === business.tokenId
                    ? 'Minting...'
                    : !walletAddress
                    ? 'Connect Wallet to Mint'
                    : classGuidance?.mint.locked
                    ? 'Qualification Required'
                    : business.maxSupply != null &&
                      business.totalMinted != null &&
                      business.totalMinted >= business.maxSupply
                    ? 'Sold Out'
                    : 'Mint Business NFT'}
                </button>
              </div>
            </div>
          </article>
        )})}
      </div>
    </div>
  );
}
