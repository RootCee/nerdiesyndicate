import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAccount, useChainId } from 'wagmi';
import Seo from '../components/Seo';
import { useNFTs } from '../hooks/useNFTs';
import { useTBA } from '../hooks/useTBA';
import NFTCard from '../components/NFTCard';
import NFTDetailModal from '../components/NFTDetailModal';
import MissionHarnessPanel from '../components/MissionHarnessPanel';
import VerticalSliceStatePanel from '../components/VerticalSliceStatePanel';
import BusinessCollectionTab from '../components/BusinessCollectionTab';
import BusinessStakingTab from '../components/BusinessStakingTab';
import SignalsBoard from '../components/signals/SignalsBoard';
import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';
import { CONTRACTS, BASE_CHAIN_ID } from '../lib/contracts';
import { createLocalMissionSubjectState } from '../lib/missionHarness';
import { buildBusinessSurfaceActionGuidance } from '../lib/businessActionGuidance';
import {
  restoreLocalMissionStateByTokenIdFromJson,
  serializeLocalVerticalSliceSnapshot,
} from '../lib/verticalSlicePersistence';
import { useTokenMetadata } from '../lib/tokenMetadata';
import { resolveNFTGameplayProfile } from '../lib/nftGameplayProfile';
import type { LocalMissionSubjectState } from '../lib/missionHarness';

// ─── State: No wallet connected ───
function NoWalletState() {
  return (
    <section className="pt-28 pb-20 px-4 min-h-[70vh] flex items-center">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight font-body">
          Connect Your <span className="text-red-600">Wallet</span>
        </h1>
        <p className="text-neutral-400 text-lg leading-relaxed mb-8 max-w-lg mx-auto">
          Connect your wallet using the button in the top-right corner to access the Nerdie Blaq Clubhouse dashboard.
        </p>
        <p className="text-neutral-600 text-sm">
          Supports MetaMask, Coinbase Wallet, WalletConnect, and more.
        </p>
      </div>
    </section>
  );
}

// ─── State: Wallet connected but no NFT ───
function NoNFTState({
  address,
  chainId,
  balance,
  nftsCount,
  nftsError,
  debug,
}: {
  address: string | null;
  chainId: number | null;
  balance: number;
  nftsCount: number;
  nftsError: string | null;
  debug: {
    walletAddress: string | null;
    contractAddress: string;
    rpcUrl: string | null;
    balance: number;
    totalSupply: number | null;
    ownedTokenIds: number[];
  };
}) {
  return (
    <section className="pt-28 pb-20 px-4 min-h-[70vh] flex items-center">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-20 h-20 bg-red-900/30 border border-red-800/40 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight font-body">
          Dashboard <span className="text-red-600">Locked</span>
        </h1>
        <p className="text-neutral-400 text-lg leading-relaxed mb-8 max-w-lg mx-auto">
          You need to hold at least one Nerdie Syndicate NFT to access the dashboard.
          Mint yours for 0.01 ETH on Base.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/mint"
            className="px-8 py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-full transition text-lg"
          >
            Mint NFT
          </Link>
          <a
            href="https://opensea.io/collection/nerdie-syndicate"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-red-800 text-red-400 hover:bg-red-900/30 font-semibold rounded-full transition text-lg"
          >
            Buy on OpenSea
          </a>
        </div>
        <WalletDiagnostics
          address={address}
          chainId={chainId}
          balance={balance}
          nftsCount={nftsCount}
          nftsError={nftsError}
          debug={debug}
        />
      </div>
    </section>
  );
}

// ─── Loading state ───
function LoadingState() {
  return (
    <section className="pt-28 pb-20 px-4 min-h-[70vh] flex items-center">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 border-4 border-red-800 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2 font-body">Loading Dashboard</h2>
        <p className="text-neutral-500">Verifying your NFT holdings...</p>
      </div>
    </section>
  );
}

// ─── Dashboard tabs ───
const TABS = [
  { id: 'player', label: 'Player', disabled: false },
  { id: 'assets', label: 'Assets', disabled: false },
  { id: 'operations', label: 'Operations', disabled: false },
  { id: 'city', label: 'City', disabled: false },
  { id: 'signals', label: 'Signals', disabled: false },
] as const;

type TabId = typeof TABS[number]['id'];

function WalletDiagnostics({
  address,
  chainId,
  balance,
  nftsCount,
  nftsError,
  debug,
}: {
  address: string | null;
  chainId: number | null;
  balance: number;
  nftsCount: number;
  nftsError: string | null;
  debug: {
    walletAddress: string | null;
    contractAddress: string;
    rpcUrl: string | null;
    balance: number;
    totalSupply: number | null;
    ownedTokenIds: number[];
  };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/85 p-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Wallet Diagnostics</p>
          <p className="mt-1 text-sm text-neutral-300">
            Double-check the connected address, Base network, and NFT ownership lookup.
          </p>
        </div>
        <span className="text-sm font-medium text-neutral-400">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="mt-4 grid gap-3 text-sm text-neutral-300 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Connected Wallet</p>
            <p className="mt-2 break-all">{address ?? 'Not connected'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Detected Chain</p>
            <p className="mt-2">{chainId ? `${chainId}${chainId === 8453 ? ' (Base)' : ''}` : 'Unknown'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">NFT Contract</p>
            <p className="mt-2 break-all">{debug.contractAddress}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Read RPC</p>
            <p className="mt-2 break-all">{debug.rpcUrl ?? 'Unknown'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Contract Balance</p>
            <p className="mt-2">{balance}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Loaded NFTs</p>
            <p className="mt-2">{nftsCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Total Supply Scanned</p>
            <p className="mt-2">{debug.totalSupply ?? 'Unknown'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Owned Token IDs</p>
            <p className="mt-2 break-words">
              {debug.ownedTokenIds.length > 0 ? debug.ownedTokenIds.join(', ') : 'None found'}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 md:col-span-2">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Status</p>
            <p className="mt-2 break-words">
              {nftsError
                ? `NFT lookup error: ${nftsError}`
                : chainId && chainId !== 8453
                ? 'Wallet is connected to a non-Base network. Switch the wallet to Base and refresh.'
                : debug.walletAddress !== address
                ? 'Wallet mismatch detected between app session and NFT lookup.'
                : 'Wallet and NFT lookup appear aligned.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDashboardLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function CollapsibleDashboardSection({
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-zinc-900/40"
      >
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-300">
          {isOpen ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {isOpen ? <div className="border-t border-zinc-800 px-5 py-5">{children}</div> : null}
    </div>
  );
}

// ─── Main Dashboard (NFT holder view) ───
function DashboardContent({ address }: { address: string | null }) {
  const chainId = useChainId();
  const [activeTab, setActiveTab] = useState<TabId>('player');
  const [signalsRefreshKey, setSignalsRefreshKey] = useState(0);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [missionSubjectTokenId, setMissionSubjectTokenId] = useState<number | null>(null);
  const [missionStateByTokenId, setMissionStateByTokenId] = useState<Record<number, LocalMissionSubjectState>>({});
  const [verticalSliceSnapshotDraft, setVerticalSliceSnapshotDraft] = useState('');
  const [verticalSliceStatus, setVerticalSliceStatus] = useState<string | null>(null);
  const [assetSectionsOpen, setAssetSectionsOpen] = useState({
    businessCollection: false,
    businessStaking: false,
  });
  const { nfts, balance, loading: nftsLoading, error: nftsError, debug, refetch } = useNFTs(address);
  const tokenIds = nfts.map((n) => n.tokenId);
  const { tbas, loading: tbaLoading } = useTBA(tokenIds);
  const nerdieTokenMetadata = useTokenMetadata(BASE_CHAIN_ID, CONTRACTS.NERDIE_TOKEN);
  const tokenIdSignature = tokenIds.join(',');

  const tbaMap = new Map(tbas.map((t) => [t.tokenId, t]));
  const nftCards = nfts.map((nft) => ({
    nft,
    gameplayProfile: resolveNFTGameplayProfile(
      nft.tokenId,
      nft.attributes,
      missionStateByTokenId[nft.tokenId]
        ? {
            totalXP: missionStateByTokenId[nft.tokenId].totalXP,
            reputationScore: missionStateByTokenId[nft.tokenId].reputationScore,
            heatScore: missionStateByTokenId[nft.tokenId].heatScore,
            rankPoints: missionStateByTokenId[nft.tokenId].rankPoints,
            lastSource: missionStateByTokenId[nft.tokenId].lastSource,
          }
        : undefined
    ),
    tba: tbaMap.get(nft.tokenId),
  }));
  const selectedCard = nftCards.find(({ nft }) => nft.tokenId === selectedTokenId);
  const activePlayerCard =
    nftCards.find(({ nft }) => nft.tokenId === missionSubjectTokenId) ?? nftCards[0] ?? null;
  const botSlotSummary = nftCards.reduce(
    (summary, nft) => {
      const slotStatus = nft.gameplayProfile.progression.botSlots;
      summary.unlockedSlots += slotStatus.unlockedSlots;
      summary.maxSlots += slotStatus.maxSlots;
      return summary;
    },
    { unlockedSlots: 0, maxSlots: 0 }
  );
  const openedBusinesses = Object.values(missionStateByTokenId).flatMap(
    (subjectState) => subjectState.openedStarterBusinesses
  );
  const activeMissionState =
    activePlayerCard != null
      ? missionStateByTokenId[activePlayerCard.nft.tokenId] ??
        createLocalMissionSubjectState(activePlayerCard.gameplayProfile)
      : null;
  const assetActionGuidance =
    activePlayerCard && activeMissionState
      ? buildBusinessSurfaceActionGuidance(
          activePlayerCard.gameplayProfile,
          activeMissionState
        )
      : null;
  const districtOccupancy = (['neon_market', 'dark_alley', 'cyber_hq'] as const).map((district) => ({
    district,
    count: openedBusinesses.filter((business) => business.district === district).length,
  }));
  const toggleAssetSection = (section: keyof typeof assetSectionsOpen) =>
    setAssetSectionsOpen((current) => ({
      ...current,
      [section]: !current[section],
    }));

  useEffect(() => {
    if (tokenIds.length === 0) {
      setMissionSubjectTokenId(null);
      return;
    }

    setMissionSubjectTokenId((current) =>
      current != null && tokenIds.includes(current)
        ? current
        : tokenIds[0]
    );
  }, [tokenIdSignature]);

  if (!address) {
    return <NoWalletState />;
  }

  if (nftsLoading) {
    return <LoadingState />;
  }

  if (nftsError) {
    return (
      <section className="pt-28 pb-20 px-4 min-h-[70vh] flex items-center">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-400 mb-4">{nftsError}</p>
          <button
            onClick={refetch}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (balance === 0) {
    return (
      <NoNFTState
        address={address}
        chainId={chainId ?? null}
        balance={balance}
        nftsCount={nfts.length}
        nftsError={nftsError}
        debug={debug}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-8 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight font-body">
                Nerdie Syndicate <span className="text-red-600">Dashboard</span>
              </h1>
              <p className="text-neutral-500 text-sm mt-1">
                {address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : 'Wallet not connected'}{' '}
                &middot; {balance} NFT{balance !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => {
                refetch();
                setSignalsRefreshKey((value) => value + 1);
              }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-neutral-300 text-sm font-medium rounded-lg transition"
            >
              Refresh
            </button>
          </div>
          <WalletDiagnostics
            address={address}
            chainId={chainId ?? null}
            balance={balance}
            nftsCount={nfts.length}
            nftsError={nftsError}
            debug={debug}
          />
        </div>
      </section>

      {/* Tabs */}
      <section className="px-4 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-red-600 text-white'
                  : tab.disabled
                  ? 'border-transparent text-neutral-600 cursor-not-allowed'
                  : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-600'
              }`}
            >
              {tab.label}
              {tab.disabled && (
                <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 text-neutral-600 text-[10px] rounded-full">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Tab Content */}
      <section className="py-10 px-4 min-h-[50vh]">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'player' && (
            <>
              {!activePlayerCard ? (
                <div className="text-center py-20">
                  <p className="text-neutral-500">No NFTs found in this wallet.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Active Character</p>
                      <p className="mt-2 text-lg font-black text-white">
                        {activePlayerCard.nft.name}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        #{activePlayerCard.nft.tokenId}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Level</p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {activePlayerCard.gameplayProfile.progression.profile.level.currentLevel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Reputation</p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {activePlayerCard.gameplayProfile.progression.profile.reputation?.score ?? 0}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {activePlayerCard.gameplayProfile.progression.profile.reputation?.band ?? 'unknown'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Heat</p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {activePlayerCard.gameplayProfile.progression.profile.heat?.score ?? 0}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {activePlayerCard.gameplayProfile.progression.profile.heat?.band ?? 'cold'}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
                    <NFTCard
                      tokenId={activePlayerCard.nft.tokenId}
                      image={activePlayerCard.nft.image}
                      name={activePlayerCard.nft.name}
                      attributes={activePlayerCard.nft.attributes}
                      gameplayProfile={activePlayerCard.gameplayProfile}
                      tbaAddress={activePlayerCard.tba?.tbaAddress}
                      ethBalance={activePlayerCard.tba?.ethBalance}
                      nerdieBalance={activePlayerCard.tba?.nerdieBalance}
                      nerdieName={nerdieTokenMetadata?.name}
                      nerdieSymbol={nerdieTokenMetadata?.symbol ?? activePlayerCard.tba?.nerdieSymbol}
                      nerdieLogoUri={nerdieTokenMetadata?.logoURI}
                      onClick={() => setSelectedTokenId(activePlayerCard.nft.tokenId)}
                    />

                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                            Player Identity
                          </p>
                          <p className="mt-2 text-lg font-bold text-white">
                            {activePlayerCard.nft.name} is the current active character identity for the playable slice.
                          </p>
                        </div>
                        <select
                          value={activePlayerCard.nft.tokenId}
                          onChange={(event) => setMissionSubjectTokenId(Number(event.target.value))}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                        >
                          {nftCards.map(({ nft }) => (
                            <option key={nft.tokenId} value={nft.tokenId}>
                              {nft.name} #{nft.tokenId}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            Progression
                          </p>
                          <p className="mt-2 text-sm text-white">
                            XP {activePlayerCard.gameplayProfile.progression.profile.xp.lifetimeXP}
                          </p>
                          <p className="mt-1 text-sm text-neutral-300">
                            Rank {activePlayerCard.gameplayProfile.progression.profile.rank?.visibleRank ?? 'unranked'}
                          </p>
                          <p className="mt-1 text-sm text-neutral-300">
                            Bot slots {activePlayerCard.gameplayProfile.progression.botSlots.unlockedSlots} / {activePlayerCard.gameplayProfile.progression.botSlots.maxSlots}
                          </p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            Character Fit
                          </p>
                          <p className="mt-2 text-sm text-white">
                            District {formatDashboardLabel(activePlayerCard.gameplayProfile.metadata.normalizedTraits.location ?? 'unassigned')}
                          </p>
                          <p className="mt-1 text-sm text-neutral-300">
                            Role {formatDashboardLabel(activePlayerCard.gameplayProfile.metadata.normalizedTraits.roleInNerdieCity ?? 'unassigned')}
                          </p>
                          <p className="mt-1 text-sm text-neutral-300">
                            Starter tool {formatDashboardLabel(activePlayerCard.gameplayProfile.metadata.starterTool.id)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                          Player View Purpose
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                          This section is now focused on character identity and progression only. Asset inventory,
                          business operations, and future city placement have been separated into their own views.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {tbaLoading && nfts.length > 0 && (
                <p className="text-neutral-600 text-xs text-center mt-6">Loading token-bound account data...</p>
              )}
            </>
          )}

          {activeTab === 'assets' && (
            <>
              {nfts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-neutral-500">No NFTs found in this wallet.</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Character NFTs</p>
                      <p className="mt-2 text-2xl font-black text-white">{nfts.length}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Active Bot Slots</p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {botSlotSummary.unlockedSlots}
                        <span className="text-base font-semibold text-neutral-500"> / {botSlotSummary.maxSlots}</span>
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Assets View</p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-300">
                        Character NFTs, Business NFTs, and staking tools are grouped here as owned assets.
                      </p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Character Assets</p>
                        <p className="mt-2 text-sm text-neutral-300">
                          Owned character NFTs remain visible here as the player’s core owned roster.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {nftCards.map(({ nft, gameplayProfile, tba }) => {
                        return (
                          <NFTCard
                            key={nft.tokenId}
                            tokenId={nft.tokenId}
                            image={nft.image}
                            name={nft.name}
                            attributes={nft.attributes}
                            gameplayProfile={gameplayProfile}
                            tbaAddress={tba?.tbaAddress}
                            ethBalance={tba?.ethBalance}
                            nerdieBalance={tba?.nerdieBalance}
                            nerdieName={nerdieTokenMetadata?.name}
                            nerdieSymbol={nerdieTokenMetadata?.symbol ?? tba?.nerdieSymbol}
                            nerdieLogoUri={nerdieTokenMetadata?.logoURI}
                            onClick={() => setSelectedTokenId(nft.tokenId)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <CollapsibleDashboardSection
                    title="Business Collection"
                    subtitle="Browse the ERC-1155 business collection and expand when you want to inspect balances or mint."
                    isOpen={assetSectionsOpen.businessCollection}
                    onToggle={() => toggleAssetSection('businessCollection')}
                  >
                    <BusinessCollectionTab
                      walletAddress={address}
                      actionGuidance={assetActionGuidance}
                    />
                  </CollapsibleDashboardSection>
                  <CollapsibleDashboardSection
                    title="Business Staking"
                    subtitle="Open this section when you want to review approvals, staking balances, or reward actions."
                    isOpen={assetSectionsOpen.businessStaking}
                    onToggle={() => toggleAssetSection('businessStaking')}
                  >
                    <BusinessStakingTab
                      walletAddress={address}
                      actionGuidance={assetActionGuidance}
                    />
                  </CollapsibleDashboardSection>
                </>
              )}
              {tbaLoading && nfts.length > 0 && (
                <p className="text-neutral-600 text-xs text-center mt-6">Loading token-bound account data...</p>
              )}
            </>
          )}

          {activeTab === 'operations' && (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Active Operator</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {activePlayerCard?.nft.name ?? 'No character selected'}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {activePlayerCard ? `#${activePlayerCard.nft.tokenId}` : 'Select a character'}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Opened Businesses</p>
                  <p className="mt-2 text-2xl font-black text-white">{openedBusinesses.length}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Operations Focus</p>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-300">
                    Missions, certifications, starter-business setup, and active business operations now live together here.
                  </p>
                </div>
              </div>

              <MissionHarnessPanel
                subjects={nftCards.map(({ nft, gameplayProfile }) => ({
                  tokenId: nft.tokenId,
                  name: nft.name,
                  gameplayProfile,
                }))}
                selectedTokenId={missionSubjectTokenId}
                onSelectTokenId={setMissionSubjectTokenId}
                missionStateByTokenId={missionStateByTokenId}
                onMissionStateChange={(tokenId, nextState) =>
                  setMissionStateByTokenId((current) => ({
                    ...current,
                    [tokenId]: nextState,
                  }))
                }
                onResetSubject={(tokenId) =>
                  setMissionStateByTokenId((current) => {
                    const nextState = { ...current };
                    delete nextState[tokenId];
                    return nextState;
                  })
                }
              />

              <VerticalSliceStatePanel
                snapshotDraft={verticalSliceSnapshotDraft}
                statusMessage={verticalSliceStatus}
                onSnapshotDraftChange={setVerticalSliceSnapshotDraft}
                onExportSnapshot={() => {
                  const snapshot = serializeLocalVerticalSliceSnapshot({
                    subjects: nftCards.map(({ nft, gameplayProfile }) => ({
                      tokenId: nft.tokenId,
                      gameplayProfile,
                      localState:
                        missionStateByTokenId[nft.tokenId] ??
                        createLocalMissionSubjectState(gameplayProfile),
                      ownerAddress: address,
                    })),
                  });

                  setVerticalSliceSnapshotDraft(snapshot);
                  setVerticalSliceStatus('Exported current playable slice state to JSON.');
                }}
                onRestoreSnapshot={() => {
                  try {
                    const restoredState =
                      restoreLocalMissionStateByTokenIdFromJson(verticalSliceSnapshotDraft);
                    setMissionStateByTokenId(restoredState);
                    setVerticalSliceStatus('Restored local playable slice state from JSON.');
                  } catch (error) {
                    setVerticalSliceStatus(
                      error instanceof Error ? error.message : 'Failed to restore slice state.'
                    );
                  }
                }}
              />
            </>
          )}

          {activeTab === 'city' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">City Layer</p>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-300">
                  This view is the placeholder home for district fit, lot placement, and future world occupancy.
                  It reflects the current architecture direction without adding the lot-registry system yet.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {districtOccupancy.map((entry) => (
                  <div key={entry.district} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
                      {formatDashboardLabel(entry.district)}
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">{entry.count}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Local opened businesses currently mapped to this district.
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">Current Role</p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-300">
                    The City section is where district summaries, lot validity, physical placement, and occupancy rules
                    should surface once the metaverse lot registry is implemented.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">What Comes Here Later</p>
                  <ul className="mt-2 space-y-2 text-sm text-neutral-300">
                    <li>Available lots by district and variant</li>
                    <li>Occupied versus inactive placements</li>
                    <li>World capacity versus ownership capacity</li>
                    <li>Defense and contest pressure once those systems are live</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signals' && <SignalsBoard refreshKey={signalsRefreshKey} />}
        </div>
      </section>

      {/* Detail Modal */}
      {selectedCard && (
        <NFTDetailModal
          tokenId={selectedCard.nft.tokenId}
          image={selectedCard.nft.image}
          name={selectedCard.nft.name}
          description={selectedCard.nft.description}
          attributes={selectedCard.nft.attributes}
          gameplayProfile={selectedCard.gameplayProfile}
          tbaAddress={selectedCard.tba?.tbaAddress}
          ethBalance={selectedCard.tba?.ethBalance}
          nerdieBalance={selectedCard.tba?.nerdieBalance}
          nerdieName={nerdieTokenMetadata?.name}
          nerdieSymbol={nerdieTokenMetadata?.symbol ?? selectedCard.tba?.nerdieSymbol}
          nerdieLogoUri={nerdieTokenMetadata?.logoURI}
          onClose={() => setSelectedTokenId(null)}
        />
      )}
    </>
  );
}

// ─── Dashboard Page (route: /dashboard) ───
export default function Dashboard() {
  const { address, isConnected } = useAccount();

  return (
    <>
      <Seo
        title="Nerdie Syndicate Dashboard | Nerdie Blaq"
        description="Token-gated Nerdie Blaq Clubhouse dashboard for NFT holders with activity, businesses, and staking tools."
        path="/dashboard"
        noindex
      />
      <DashboardContent address={isConnected ? address ?? null : null} />

      {/* Footer */}
      <section className="py-16 px-4 text-center">
        <div className="flex justify-center items-center gap-6 mb-8">
          <a href="https://twitter.com/rootcee" target="_blank" rel="noopener noreferrer">
            <img src={twitter} alt="Twitter" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
          <a href="https://discord.com/invite/S874axwJyY" target="_blank" rel="noopener noreferrer">
            <img src={discord} alt="Discord" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
          <a href="https://t.me/+RPRDDLSZWSk3ZjZh" target="_blank" rel="noopener noreferrer">
            <img src={telegram} alt="Telegram" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
          <a href="https://instagram.com/rootcee_" target="_blank" rel="noopener noreferrer">
            <img src={instagram} alt="Instagram" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
        </div>
        <p className="text-neutral-600 text-sm">&copy; 2025 Nerdie Blaq. All rights reserved.</p>
      </section>
    </>
  );
}
