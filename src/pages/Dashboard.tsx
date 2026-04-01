import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { useNFTs } from '../hooks/useNFTs';
import { useTBA } from '../hooks/useTBA';
import NFTCard from '../components/NFTCard';
import NFTDetailModal from '../components/NFTDetailModal';
import BusinessCollectionTab from '../components/BusinessCollectionTab';
import BusinessStakingTab from '../components/BusinessStakingTab';
import SignalsBoard from '../components/signals/SignalsBoard';
import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';

// ─── Wallet connection (uses same window.ethereum as MintingForm) ───
function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    async function check() {
      if (!window.ethereum) return;
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts[0]) setAddress(accounts[0]);
    }
    check();

    if (window.ethereum && !listening) {
      setListening(true);
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAddress(accounts[0] ?? null);
      });
    }
  }, [listening]);

  return address;
}

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
          Connect your wallet using the button in the top-right corner to access the Nerdie Blaq Signals dashboard.
        </p>
        <p className="text-neutral-600 text-sm">
          Supports MetaMask, Coinbase Wallet, WalletConnect, and more.
        </p>
      </div>
    </section>
  );
}

// ─── State: Wallet connected but no NFT ───
function NoNFTState() {
  return (
    <section className="pt-28 pb-20 px-4 min-h-[70vh] flex items-center">
      <div className="max-w-2xl mx-auto text-center">
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
  { id: 'nfts', label: 'My NFTs', disabled: false },
  { id: 'signals', label: 'Signals', disabled: false },
  { id: 'businesses', label: 'Businesses', disabled: false },
  { id: 'staking', label: 'Staking', disabled: false },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main Dashboard (NFT holder view) ───
function DashboardContent({ address }: { address: string | null }) {
  const [activeTab, setActiveTab] = useState<TabId>('signals');
  const [signalsRefreshKey, setSignalsRefreshKey] = useState(0);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const { nfts, balance, loading: nftsLoading, error: nftsError, refetch } = useNFTs(address);
  const tokenIds = nfts.map((n) => n.tokenId);
  const { tbas, loading: tbaLoading } = useTBA(tokenIds);

  const tbaMap = new Map(tbas.map((t) => [t.tokenId, t]));
  const selectedNft = nfts.find((n) => n.tokenId === selectedTokenId);
  const selectedTba = selectedTokenId != null ? tbaMap.get(selectedTokenId) : undefined;

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
    return <NoNFTState />;
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
                Signal <span className="text-red-600">Dashboard</span>
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
          {activeTab === 'nfts' && (
            <>
              {nfts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-neutral-500">No NFTs found in this wallet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {nfts.map((nft) => {
                    const tba = tbaMap.get(nft.tokenId);
                    return (
                      <NFTCard
                        key={nft.tokenId}
                        tokenId={nft.tokenId}
                        image={nft.image}
                        name={nft.name}
                        attributes={nft.attributes}
                        tbaAddress={tba?.tbaAddress}
                        ethBalance={tba?.ethBalance}
                        nerdieBalance={tba?.nerdieBalance}
                        nerdieSymbol={tba?.nerdieSymbol}
                        onClick={() => setSelectedTokenId(nft.tokenId)}
                      />
                    );
                  })}
                </div>
              )}
              {tbaLoading && nfts.length > 0 && (
                <p className="text-neutral-600 text-xs text-center mt-6">Loading token-bound account data...</p>
              )}
            </>
          )}

          {activeTab === 'signals' && <SignalsBoard refreshKey={signalsRefreshKey} />}

          {activeTab === 'businesses' && <BusinessCollectionTab walletAddress={address} />}

          {activeTab === 'staking' && <BusinessStakingTab walletAddress={address} />}
        </div>
      </section>

      {/* Detail Modal */}
      {selectedNft && (
        <NFTDetailModal
          tokenId={selectedNft.tokenId}
          image={selectedNft.image}
          name={selectedNft.name}
          description={selectedNft.description}
          attributes={selectedNft.attributes}
          tbaAddress={selectedTba?.tbaAddress}
          ethBalance={selectedTba?.ethBalance}
          nerdieBalance={selectedTba?.nerdieBalance}
          nerdieSymbol={selectedTba?.nerdieSymbol}
          onClose={() => setSelectedTokenId(null)}
        />
      )}
    </>
  );
}

// ─── Dashboard Page (route: /dashboard) ───
export default function Dashboard() {
  const address = useWallet();

  return (
    <>
      <DashboardContent address={address} />

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
