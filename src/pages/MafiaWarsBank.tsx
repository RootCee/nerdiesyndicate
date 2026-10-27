import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLocation } from 'react-router-dom';
import { useAccount, useReadContract, useSignMessage, useSwitchChain } from 'wagmi';
import { BASE_CHAIN_ID, CONTRACTS } from '../lib/contracts';
import {
  createFounderSignatureMessage,
  createGameWalletMessage,
  createGameWalletState,
  isFounderSignInText,
  isFounderSignRequest,
  isGameWalletRequest,
  isTrustedGameWalletEvent,
} from '../lib/gameWalletBridge';
import { formatTokenAmount } from '../lib/tokenAmount';
import { normalizeNftUrl } from '../lib/nftMetadata';
import { useNFTs } from '../hooks/useNFTs';
import { useBusinessCollection } from '../hooks/useBusinessCollection';
import Seo from '../components/Seo';

const GAME_URL = '/mafia-wars/game/index.html?phys=0&multiplayer=1&embedded=1';
const NERDIE_BALANCE_ABI = [{
  type: 'function', name: 'balanceOf', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }],
}] as const;

function InventoryImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const imageUrl = normalizeNftUrl(src);

  useEffect(() => setState('loading'), [imageUrl]);
  if (!imageUrl || state === 'failed') {
    return <div className="grid aspect-square place-items-center rounded-xl bg-neutral-900 text-center text-xs uppercase tracking-widest text-neutral-500">Artwork unavailable</div>;
  }
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-900">
      {state === 'loading' && <div role="status" className="absolute inset-0 grid place-items-center text-xs uppercase tracking-widest text-neutral-400">Loading artwork…</div>}
      <img src={imageUrl} alt={alt} loading="lazy" decoding="async" onLoad={() => setState('ready')} onError={() => setState('failed')} className={`h-full w-full object-cover transition-opacity ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}

function WalletInventory({ walletAddress }: { walletAddress: string }) {
  const syndicate = useNFTs(walletAddress);
  const businesses = useBusinessCollection(walletAddress);
  const ownedBusinesses = businesses.businesses.filter((item) => item.ownedBalance === null || item.ownedBalance > 0);
  const syndicateReady = syndicate.loadedWalletAddress?.toLowerCase() === walletAddress.toLowerCase();
  const businessesReady = businesses.loadedWalletAddress?.toLowerCase() === walletAddress.toLowerCase();

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-bold text-white">Syndicate · ERC-721</h3><span className="text-xs text-neutral-400">{syndicate.loading ? 'Reading…' : `${syndicate.balance} owned`}</span></div>
        {!syndicateReady || syndicate.loading ? <p role="status" className="wallet-panel-status">Loading Syndicate ownership and metadata…</p>
          : syndicate.error ? <p role="status" className="wallet-panel-error">Syndicate assets are temporarily unavailable.</p>
            : syndicate.nfts.length === 0 ? <p className="wallet-panel-status">No Syndicate NFTs found.</p>
              : <div className="grid grid-cols-2 gap-3">{syndicate.nfts.map((nft) => <article key={nft.tokenId} className="wallet-inventory-card"><InventoryImage src={nft.image} alt={nft.name} /><h4 className="mt-2 truncate text-sm font-bold text-white">{nft.name}</h4><p className="text-xs text-neutral-500">Syndicate #{nft.tokenId}</p></article>)}</div>}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-bold text-white">Businesses · ERC-1155</h3><span className="text-xs text-neutral-400">{businesses.loading ? 'Reading…' : `${ownedBusinesses.length} types`}</span></div>
        {!businessesReady || businesses.loading ? <p role="status" className="wallet-panel-status">Loading business ownership and metadata…</p>
          : businesses.error ? <p role="status" className="wallet-panel-error">Business assets are temporarily unavailable.</p>
            : ownedBusinesses.length === 0 ? <p className="wallet-panel-status">No Business NFTs found.</p>
              : <div className="grid grid-cols-2 gap-3">{ownedBusinesses.map((business) => <article key={business.tokenId} className="wallet-inventory-card"><InventoryImage src={business.image} alt={business.metadataName || business.businessName} /><h4 className="mt-2 text-sm font-bold text-white">{business.metadataName || business.businessName}</h4><p className="text-xs text-neutral-500">Quantity: {business.ownedBalance ?? 'Unavailable'}</p></article>)}</div>}
      </section>
    </div>
  );
}

export default function MafiaWarsBank() {
  const location = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [walletOpen, setWalletOpen] = useState(() => location.pathname.endsWith('/bank'));
  const { address, chainId, isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const tokenBalance = useReadContract({
    address: CONTRACTS.NERDIE_TOKEN,
    abi: NERDIE_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] as const : undefined,
    chainId: BASE_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });
  const balanceStatus = !isConnected ? 'idle' : tokenBalance.isLoading || tokenBalance.isFetching ? 'loading' : tokenBalance.error ? 'error' : tokenBalance.data !== undefined ? 'ready' : 'error';
  const formattedBalance = tokenBalance.data === undefined ? null : formatTokenAmount(tokenBalance.data, 18);
  const walletState = useMemo(() => createGameWalletState(address, chainId, isConnected, {
    status: balanceStatus,
    formatted: formattedBalance,
  }), [address, chainId, isConnected, balanceStatus, formattedBalance]);
  const walletAddress = walletState.connected ? walletState.address : null;

  const sendWalletState = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(createGameWalletMessage('state', walletState), window.location.origin);
  }, [walletState]);

  useEffect(sendWalletState, [sendWalletState]);
  useEffect(() => {
    if (walletOpen) drawerRef.current?.removeAttribute('inert');
    else drawerRef.current?.setAttribute('inert', '');
  }, [walletOpen]);
  const { signMessageAsync } = useSignMessage();
  // Founder Executive Suite: sign only the City Service's founder sign-in text for this site and wallet.
  const signFounderChallenge = useCallback(async (gameWindow: Window, requestId: string, message: string) => {
    const reply = (result: { signature: `0x${string}` } | { error: string }) => gameWindow.postMessage(createFounderSignatureMessage(requestId, result), window.location.origin);
    if (!walletAddress) return reply({ error: 'Connect your wallet with MY WALLET, then sign in.' });
    if (!isFounderSignInText(message, window.location.host, walletAddress)) return reply({ error: 'That sign-in request was not recognised, so nothing was signed.' });
    try { reply({ signature: await signMessageAsync({ account: walletAddress, message }) }); }
    catch { reply({ error: 'The wallet did not sign. Nothing was changed.' }); }
  }, [signMessageAsync, walletAddress]);
  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const gameWindow = iframeRef.current?.contentWindow;
      if (!gameWindow || !isTrustedGameWalletEvent(event, window.location.origin, gameWindow)) return;
      if (isFounderSignRequest(event.data)) { void signFounderChallenge(gameWindow, event.data.payload.requestId, event.data.payload.message); return; }
      if (!isGameWalletRequest(event.data)) return;
      if (event.data.type === 'request-state') sendWalletState();
      if (event.data.type === 'open-bank') setWalletOpen(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [sendWalletState, signFounderChallenge]);

  return (
    <main className="fixed inset-0 z-[60] overflow-hidden bg-black text-neutral-100">
      <Seo title="Nerdie City | Public City & My Wallet" description="Play Nerdie City while keeping your read-only Base wallet connected." path={location.pathname} noindex />
      <iframe ref={iframeRef} title="Nerdie City Public City" src={GAME_URL} onLoad={sendWalletState} allow="fullscreen; gamepad" className="absolute inset-0 h-full w-full border-0 bg-black" />
      {walletOpen && <button type="button" aria-label="Close My Wallet" className="absolute inset-0 z-10 bg-black/55 backdrop-blur-[2px]" onClick={() => setWalletOpen(false)} />}
      <aside ref={drawerRef} aria-label="My Wallet" aria-modal="true" aria-hidden={!walletOpen} role="dialog" className={`absolute inset-y-0 right-0 z-20 w-full max-w-md transform overflow-y-auto border-l border-amber-300/25 bg-neutral-950/95 p-5 shadow-2xl transition-transform duration-200 [padding-top:max(1.25rem,env(safe-area-inset-top))] [padding-right:max(1.25rem,env(safe-area-inset-right))] [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))] ${walletOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`} onPointerDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Read-only · Base</p><h1 className="mt-1 text-3xl font-black text-white">MY WALLET</h1></div><button type="button" onClick={() => setWalletOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/20 text-xl" aria-label="Close My Wallet">×</button></header>
        <div className="mt-5"><ConnectButton showBalance={false} chainStatus="full" accountStatus={{ smallScreen: 'address', largeScreen: 'address' }} /></div>
        <section className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-200">NERDIE balance</p>
          <p className="mt-2 break-words text-2xl font-black text-white">{!walletAddress ? 'Guest · disconnected' : balanceStatus === 'loading' ? 'Loading…' : balanceStatus === 'error' ? 'Unavailable' : `${formattedBalance} NERDIE`}</p>
          <p className="mt-2 break-all font-mono text-xs text-neutral-400">{walletAddress ?? 'Connect a wallet to view public on-chain assets.'}</p>
          {isConnected && chainId !== BASE_CHAIN_ID && <button type="button" disabled={isSwitching} onClick={() => switchChain({ chainId: BASE_CHAIN_ID })} className="mt-3 min-h-11 rounded-lg bg-amber-300 px-4 text-sm font-bold text-black">{isSwitching ? 'Switching…' : 'Switch to Base'}</button>}
          {balanceStatus === 'error' && <button type="button" onClick={() => void tokenBalance.refetch()} className="mt-3 min-h-10 rounded-lg border border-red-200/30 px-3 text-xs font-bold text-red-100">Retry balance</button>}
        </section>
        <div className="mt-6">{walletAddress ? <WalletInventory walletAddress={walletAddress} /> : <p className="wallet-panel-status">Guest play remains available without a wallet.</p>}</div>
        <p className="mt-6 text-xs leading-relaxed text-neutral-500">This viewer never requests a signature or transaction. The address shared with the game HUD is public display state, not proof of ownership.</p>
      </aside>
    </main>
  );
}
