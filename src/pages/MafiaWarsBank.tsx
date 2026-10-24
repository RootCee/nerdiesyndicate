import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { formatUnits } from 'viem';
import { BASE_CHAIN_ID, CONTRACTS } from '../lib/contracts';
import {
  createGameWalletMessage,
  createGameWalletState,
  isGameWalletRequest,
  isTrustedGameWalletEvent,
} from '../lib/gameWalletBridge';
import { useNFTs } from '../hooks/useNFTs';
import { useBusinessCollection } from '../hooks/useBusinessCollection';
import Seo from '../components/Seo';

const GAME_URL = '/mafia-wars/game/?phys=0&multiplayer=1';
const NERDIE_BALANCE_ABI = [{
  type: 'function',
  name: 'balanceOf',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: 'balance', type: 'uint256' }],
}] as const;
const NERDIE_DECIMALS_ABI = [{
  type: 'function',
  name: 'decimals',
  stateMutability: 'view',
  inputs: [],
  outputs: [{ name: '', type: 'uint8' }],
}] as const;

function formatTokenAmount(value: bigint, decimals: number): string {
  const [whole, fraction = ''] = formatUnits(value, decimals).split('.');
  const trimmedFraction = fraction.slice(0, 4).replace(/0+$/, '');
  return `${whole}${trimmedFraction ? `.${trimmedFraction}` : ''}`;
}

function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function InventoryImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = safeImageUrl(src);

  if (!imageUrl || failed) {
    return (
      <div className="grid aspect-square place-items-center rounded-xl bg-neutral-900 text-xs uppercase tracking-widest text-neutral-500">
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="aspect-square w-full rounded-xl bg-neutral-900 object-cover"
    />
  );
}

function BankBusinessInventory({ walletAddress }: { walletAddress: string }) {
  const inventory = useBusinessCollection(walletAddress);
  const ownedBusinesses = inventory.businesses.filter(
    (business) => business.ownedBalance === null || business.ownedBalance > 0,
  );
  const dataReady = inventory.loadedWalletAddress?.toLowerCase() === walletAddress.toLowerCase();

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">Businesses · ERC-1155</h3>
        {inventory.loading && <span className="text-xs text-neutral-400">Reading balances…</span>}
      </div>
      {!dataReady || inventory.loading ? (
        <p role="status" className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">Loading business ownership and metadata…</p>
      ) : inventory.error ? (
        <p role="status" className="rounded-xl border border-red-300/20 bg-red-950/20 p-4 text-sm text-red-100">Business balances could not be read from Base. Please retry later.</p>
      ) : ownedBusinesses.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">No business NFTs are currently reported for this wallet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {ownedBusinesses.map((business) => (
            <article key={business.tokenId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <InventoryImage src={business.image} alt={business.metadataName || business.businessName} />
              <h4 className="mt-3 text-sm font-bold text-white">{business.metadataName || business.businessName}</h4>
              <p className="mt-1 text-xs text-neutral-500">Business #{business.tokenId}</p>
              <p className="mt-2 text-sm font-semibold text-amber-100">
                Quantity: {business.ownedBalance === null ? 'Unavailable' : business.ownedBalance}
              </p>
              {business.ownedBalance === null && <p className="mt-1 text-xs text-red-200">This token balance could not be read.</p>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default function MafiaWarsBank() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inventoryRef = useRef<HTMLElement>(null);
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();
  const [bankRequested, setBankRequested] = useState(false);
  const [inventoryRequested, setInventoryRequested] = useState(false);
  const walletState = useMemo(
    () => createGameWalletState(address, chainId, isConnected),
    [address, chainId, isConnected],
  );
  const walletAddress = walletState.connected ? walletState.address : null;
  const nftInventory = useNFTs(inventoryRequested ? walletAddress : null);
  const tokenBalance = useReadContract({
    address: CONTRACTS.NERDIE_TOKEN,
    abi: NERDIE_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] as const : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });
  const tokenDecimals = useReadContract({
    address: CONTRACTS.NERDIE_TOKEN,
    abi: NERDIE_DECIMALS_ABI,
    functionName: 'decimals',
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const sendWalletState = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      createGameWalletMessage('state', walletState),
      window.location.origin,
    );
  }, [walletState]);

  useEffect(() => {
    sendWalletState();
  }, [sendWalletState]);

  useEffect(() => {
    const onGameMessage = (event: MessageEvent<unknown>) => {
      const gameWindow = iframeRef.current?.contentWindow;
      if (
        !gameWindow
        || !isTrustedGameWalletEvent(event, window.location.origin, gameWindow)
        || !isGameWalletRequest(event.data)
      ) return;

      if (event.data.type === 'request-state') {
        sendWalletState();
      } else if (event.data.type === 'open-bank') {
        setBankRequested(true);
        setInventoryRequested(true);
        inventoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('message', onGameMessage);
    return () => window.removeEventListener('message', onGameMessage);
  }, [sendWalletState]);

  const tokenReadError = tokenBalance.error || tokenDecimals.error;
  const tokenIsLoading = tokenBalance.isLoading || tokenBalance.isFetching || tokenDecimals.isLoading || tokenDecimals.isFetching;
  const tokenBalanceText = tokenBalance.data === undefined || tokenDecimals.data === undefined
    ? null
    : formatTokenAmount(tokenBalance.data, Number(tokenDecimals.data));
  const isBaseConnected = !isConnected || chainId === BASE_CHAIN_ID;
  const nftDataReady = nftInventory.loadedWalletAddress?.toLowerCase() === walletAddress?.toLowerCase();

  return (
    <>
      <Seo
        title="Nerdie City Bank | Wallet & Assets"
        description="View your read-only NERDIE, Syndicate, and Nerdie Blaq Businesses assets in Nerdie City."
        path="/mafia-wars/bank"
        noindex
      />
      <main className="mafia-preview-shell min-h-screen px-4 pb-16 pt-28 text-neutral-100 sm:px-6 lg:px-8">
        <div className="mafia-preview-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="mafia-preview-panel mb-6 flex flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Nerdie City · Read-only</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">Bank & Wallet</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                View NERDIE and Nerdie Blaq assets on Base. This interface cannot send transactions or move assets.
              </p>
            </div>
            <ConnectButton showBalance={false} chainStatus="full" accountStatus={{ smallScreen: 'avatar', largeScreen: 'address' }} />
          </header>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
            <div className="mafia-preview-panel overflow-hidden rounded-3xl">
              <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Public City</p>
                  <p className="mt-1 text-sm text-neutral-400">Guest entry remains available. Wallet connection is optional.</p>
                </div>
                <a
                  href={GAME_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/40 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/10"
                >
                  Open game separately
                </a>
              </div>
              <iframe
                ref={iframeRef}
                title="Nerdie City Public City"
                src={GAME_URL}
                onLoad={sendWalletState}
                allow="fullscreen; gamepad"
                className="block h-[58vh] min-h-[420px] w-full border-0 bg-black sm:h-[68vh] sm:min-h-[540px]"
              />
            </div>

            <aside className="mafia-preview-panel flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Wallet status</p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">Connected address</p>
                  <p className="mt-2 break-all font-mono text-sm text-white">
                    {walletAddress ?? 'Guest · no wallet connected'}
                  </p>
                  <p className="mt-3 text-xs text-neutral-400">
                    Network: {isConnected ? (chainId === BASE_CHAIN_ID ? 'Base Mainnet · 8453' : `Connected chain · ${chainId ?? 'unknown'}`) : 'Base Mainnet · 8453 (read-only)'}
                  </p>
                </div>
              </div>

              {isConnected && !isBaseConnected && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 p-4">
                  <p className="text-sm font-semibold text-amber-100">Your wallet is connected to another network.</p>
                  <p className="mt-1 text-xs text-amber-100/70">Asset reads remain on Base. Switch the wallet network for a consistent experience.</p>
                  <button
                    type="button"
                    disabled={isSwitching}
                    onClick={() => switchChain({ chainId: BASE_CHAIN_ID })}
                    className="mt-3 min-h-11 rounded-lg bg-amber-300 px-4 text-sm font-bold text-neutral-950 disabled:opacity-60"
                  >
                    {isSwitching ? 'Switching…' : 'Switch to Base'}
                  </button>
                  {switchError && <p role="alert" className="mt-2 text-xs text-red-200">Could not switch networks. Choose Base in your wallet and retry.</p>}
                </div>
              )}

              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-200">NERDIE balance</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {!walletAddress
                    ? 'Connect wallet'
                    : tokenIsLoading
                      ? 'Loading…'
                      : tokenReadError
                        ? 'Unavailable'
                        : tokenBalanceText ?? 'Unavailable'}
                </p>
                <p className="mt-1 text-xs text-neutral-400">NERDIE · Base · Read-only</p>
                {walletAddress && tokenReadError && (
                  <div className="mt-2 flex items-center gap-3">
                    <p role="status" className="text-xs text-red-200">The NERDIE balance could not be read.</p>
                    <button
                      type="button"
                      onClick={() => { void Promise.all([tokenBalance.refetch(), tokenDecimals.refetch()]); }}
                      className="min-h-9 rounded-lg border border-red-200/30 px-3 text-xs font-bold text-red-100"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <p className="mt-auto text-xs leading-relaxed text-neutral-500">
                Wallet connection is optional. Connecting only reads public on-chain data; no signature, approval, or transaction is requested.
              </p>
            </aside>
          </section>

          <section
            ref={inventoryRef}
            id="bank-inventory"
            tabIndex={-1}
            className={`mt-6 scroll-mt-24 rounded-3xl border p-5 transition sm:p-7 ${bankRequested ? 'border-amber-300/60 ring-2 ring-amber-300/20' : 'border-amber-300/15'} bg-black/50`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Bank inventory</p>
                <h2 className="mt-2 text-2xl font-black text-white">Your Nerdie Blaq assets</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  {inventoryRequested
                    ? 'Balances and ownership are read directly from Base mainnet.'
                    : 'Load your on-chain inventory when you are ready. Asset discovery uses read-only requests.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {bankRequested && <span className="text-xs font-bold uppercase tracking-widest text-amber-200">Opened from the game</span>}
                {walletAddress && (
                  <button
                    type="button"
                    onClick={() => setInventoryRequested(true)}
                    disabled={inventoryRequested}
                    className="min-h-11 rounded-xl border border-amber-200/40 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-default disabled:opacity-60"
                  >
                    {inventoryRequested ? 'Inventory loaded' : 'Load wallet inventory'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-white">Syndicate · ERC-721</h3>
                {walletAddress && <span className="text-xs text-neutral-400">{nftInventory.loading ? 'Reading ownership…' : `${nftInventory.balance} owned`}</span>}
              </div>
              {!walletAddress ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">Connect a wallet to view owned Syndicate NFTs. Guest play does not require a wallet.</p>
              ) : !inventoryRequested ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">Load wallet inventory to scan Syndicate ownership and fetch NFT metadata.</p>
              ) : !nftDataReady || nftInventory.loading ? (
                <p role="status" className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">Loading NFT ownership and metadata…</p>
              ) : nftInventory.error ? (
                <p role="status" className="rounded-xl border border-red-300/20 bg-red-950/20 p-4 text-sm text-red-100">Syndicate ownership could not be read from Base. Please retry later.</p>
              ) : nftInventory.nfts.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">No Syndicate NFTs are currently reported for this wallet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {nftInventory.nfts.map((nft) => (
                    <article key={nft.tokenId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <InventoryImage src={nft.image} alt={nft.name} />
                      <h4 className="mt-3 truncate text-sm font-bold text-white">{nft.name}</h4>
                      <p className="mt-1 text-xs text-neutral-500">Syndicate #{nft.tokenId}</p>
                      {nft.description && <p className="mt-2 line-clamp-3 text-xs text-neutral-400">{nft.description}</p>}
                      {nft.attributes.length > 0 && (
                        <dl className="mt-3 space-y-1">
                          {nft.attributes.slice(0, 4).map((trait) => (
                            <div key={`${nft.tokenId}-${trait.trait_type}`} className="flex justify-between gap-2 text-[11px]">
                              <dt className="truncate text-neutral-500">{trait.trait_type}</dt>
                              <dd className="truncate text-neutral-300">{String(trait.value)}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8">
              {!walletAddress ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">Connect a wallet to view owned business NFTs.</p>
              ) : !inventoryRequested ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-neutral-400">Load wallet inventory to read business ownership and metadata.</p>
              ) : (
                <BankBusinessInventory walletAddress={walletAddress} />
              )}
            </div>
          </section>

          <section className="mafia-preview-panel mt-6 rounded-3xl p-5 sm:p-7" aria-labelledby="bank-history-title">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Future feature</p>
            <h2 id="bank-history-title" className="mt-2 text-xl font-black text-white">Transaction history</h2>
            <p className="mt-2 text-sm text-neutral-400">
              No transaction history is available in this read-only preview. This area is reserved for a future verified activity view.
            </p>
          </section>

          <p className="mt-6 text-center text-xs leading-relaxed text-neutral-500">
            Asset discovery uses public Base reads and public metadata. Never share a seed phrase or private key; this preview never requests either.
          </p>
        </div>
      </main>
    </>
  );
}
