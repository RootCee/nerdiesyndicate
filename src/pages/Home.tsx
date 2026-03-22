import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllSupabaseRows, fetchSupabaseRows, isSupabaseConfigured } from '../lib/supabase';
import mainlogo from '../images/mainlogo.png';
import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';

type StatsRow = Record<string, unknown>;

type BotPerformanceStats = {
  winRate: string;
  signalsLogged: string;
  botStatus: 'ACTIVE' | 'STANDBY' | 'OFFLINE';
  pnl: string;
  winRateSub: string;
  botStatusSub: string;
  pnlSub: string;
};

const DEFAULT_BOT_STATS: BotPerformanceStats = {
  winRate: '--',
  signalsLogged: '--',
  botStatus: 'OFFLINE',
  pnl: '--',
  winRateSub: 'live summary from signal_outcomes',
  botStatusSub: 'no recent data',
  pnlSub: 'live summary from signal_outcomes',
};

const BOT_ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const BOT_STANDBY_WINDOW_MS = 6 * 60 * 60 * 1000;

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function getString(row: StatsRow | undefined, keys: string[]) {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return null;
}

function getNumber(row: StatsRow | undefined, keys: string[]) {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function getTimestampValue(row: StatsRow | undefined) {
  const timestamps = [
    getString(row, ['created_at']),
    getString(row, ['closed_at']),
    getString(row, ['updated_at']),
    getString(row, ['timestamp']),
  ]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((value) => !Number.isNaN(value));

  if (!timestamps.length) return null;
  return Math.max(...timestamps);
}

function getBotStatus(latestActivity: number | undefined | null): BotPerformanceStats['botStatus'] {
  if (!latestActivity) return 'OFFLINE';

  const age = Date.now() - latestActivity;
  if (age <= BOT_ACTIVE_WINDOW_MS) return 'ACTIVE';
  if (age <= BOT_STANDBY_WINDOW_MS) return 'STANDBY';
  return 'OFFLINE';
}

function getBotStatusSub(status: BotPerformanceStats['botStatus']) {
  if (status === 'ACTIVE') return 'latest bot_performance update is fresh';
  if (status === 'STANDBY') return 'bot data is present but not recent';
  return 'data stale or unavailable';
}

function normalizeOutcomeStatus(value: string | null) {
  if (!value) return null;

  const upper = value.trim().toUpperCase();
  if (upper.includes('WIN') || upper.includes('TP') || upper.includes('TAKE_PROFIT')) return 'WIN';
  if (upper.includes('LOSS') || upper.includes('LOSE') || upper.includes('SL') || upper.includes('STOP')) return 'LOSS';

  return null;
}

function formatMetric(value: number | string | null) {
  if (value === null) return '--';
  if (typeof value === 'number') return formatCount(value);

  const trimmed = value.trim();
  if (!trimmed) return '--';

  const parsed = Number(trimmed);
  if (Number.isFinite(parsed)) return formatCount(parsed);
  return trimmed;
}

function formatPercentMetric(value: number | string | null) {
  if (value === null) return '--';

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return typeof value === 'string' && value.trim() ? value.trim() : '--';
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(parsed)}%`;
}

function formatPnlMetric(value: number | string | null) {
  if (value === null) return '--';

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return typeof value === 'string' && value.trim() ? value.trim() : '--';
  }

  const sign = parsed > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(parsed)}%`;
}

function getLatestActivity(rows: StatsRow[]) {
  return rows.reduce<number | null>((latest, row) => {
    const timestamp = getTimestampValue(row);
    if (timestamp === null) return latest;
    if (latest === null || timestamp > latest) return timestamp;
    return latest;
  }, null);
}

function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto">
        <img src={mainlogo} alt="Nerdie Blaq" className="w-48 md:w-64 mx-auto mb-8" />
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.1]">
          AI-Powered Crypto<br />
          <span className="text-red-700">Signals</span>, Delivered.
        </h1>
        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          Nerdie Blaq Signals combines AI-driven BTC market analysis with a real-time trading bot
          to deliver live crypto signals straight to your Telegram.
        </p>
        <p className="text-sm text-neutral-500 mb-10">
          Free signals for everyone. VIP for $NERDIE holders. Dashboard for NFT holders.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://t.me/+RPRDDLSZWSk3ZjZh"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-full transition text-lg"
          >
            Get Free Signals
          </a>
          <Link
            to="/vip"
            className="px-8 py-3.5 border border-red-800 text-red-400 hover:bg-red-900/30 font-semibold rounded-full transition text-lg"
          >
            Unlock VIP
          </Link>
        </div>
      </div>
    </section>
  );
}

function BotProofSection() {
  const [stats, setStats] = useState<BotPerformanceStats>(DEFAULT_BOT_STATS);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      if (!isSupabaseConfigured()) {
        setStats(DEFAULT_BOT_STATS);
        return;
      }

      try {
        const [performanceRows, outcomeRows] = await Promise.all([
          fetchSupabaseRows<StatsRow>('bot_performance', {
            select: '*',
            order: 'created_at.desc',
            limit: '1',
          }).catch(() => []),
          fetchAllSupabaseRows<StatsRow>('signal_outcomes', {
            select: '*',
            order: 'created_at.desc',
          }).catch(() => []),
        ]);

        if (cancelled) return;

        const latestPerformance = performanceRows[0];
        const signals = outcomeRows.length;
        const wins = outcomeRows.filter((row) => normalizeOutcomeStatus(getString(row, ['status'])) === 'WIN').length;
        const losses = outcomeRows.filter((row) => normalizeOutcomeStatus(getString(row, ['status'])) === 'LOSS').length;
        const decidedTrades = wins + losses;
        const fallbackWinRate = decidedTrades > 0 ? (wins / decidedTrades) * 100 : null;
        const fallbackPnl = outcomeRows.reduce((total, row) => total + (getNumber(row, ['pnl']) ?? 0), 0);
        const latestActivity = getLatestActivity(
          latestPerformance ? [latestPerformance, ...outcomeRows] : outcomeRows
        );
        const botStatus = getBotStatus(latestActivity);
        const winRate =
          getNumber(latestPerformance, ['win_rate', 'winRate']) ?? fallbackWinRate;
        const pnl =
          getNumber(latestPerformance, ['realized_pnl', 'realizedPnl', 'pnl_realized']) ??
          getNumber(latestPerformance, ['unrealized_pnl', 'unrealizedPnl', 'pnl_unrealized']) ??
          fallbackPnl;
        const performanceLabel = latestPerformance ? 'live summary from bot_performance' : 'live summary from signal_outcomes';

        setStats({
          winRate: formatPercentMetric(winRate),
          signalsLogged: formatMetric(signals),
          botStatus,
          pnl: formatPnlMetric(pnl),
          winRateSub: latestPerformance || outcomeRows.length ? performanceLabel : 'no performance data',
          botStatusSub: getBotStatusSub(botStatus),
          pnlSub: latestPerformance || outcomeRows.length ? performanceLabel : 'no performance data',
        });
      } catch {
        if (!cancelled) setStats(DEFAULT_BOT_STATS);
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { label: 'Win Rate', value: stats.winRate, sub: stats.winRateSub },
    { label: 'Bot Status', value: stats.botStatus, sub: stats.botStatusSub },
    { label: 'Signals Logged', value: stats.signalsLogged, sub: 'signal_outcomes.count' },
    { label: 'P&L', value: stats.pnl, sub: stats.pnlSub },
  ];

  return (
    <section id="bot-proof" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-3">
          Live Bot Performance
        </h2>
        <p className="text-neutral-500 text-center mb-12 max-w-xl mx-auto">
          The Nerdie Blaq signal engine runs 24/7, analyzing BTC markets and generating trade calls in real time.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900 border border-red-900/20 rounded-2xl p-6 md:p-8 text-center hover:border-red-800/50 transition"
            >
              <p className="text-3xl md:text-4xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-xs text-neutral-600">{stat.sub}</p>
              {stat.label === "Bot Status" && (
                <span
                  className={`inline-block mt-2 h-2.5 w-2.5 rounded-full ${
                    stats.botStatus === 'ACTIVE'
                      ? 'bg-green-500 animate-pulse'
                      : stats.botStatus === 'STANDBY'
                      ? 'bg-amber-400'
                      : 'bg-red-500/80'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          The Nerdie Blaq Ecosystem
        </h2>
        <p className="text-neutral-500 mb-12 max-w-2xl mx-auto">
          Signals are just the beginning. Nerdie Blaq is a full Web3 ecosystem: trading signals,
          a deflationary token, NFT-gated tools, staking, gaming, and community.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Signals", desc: "AI-powered crypto signals delivered live to Telegram", icon: "S" },
            { title: "$NERDIE", desc: "Deflationary utility token on Base powering the ecosystem", icon: "N" },
            { title: "Syndicate NFT", desc: "200 ERC-6551 NFTs that unlock the dashboard and alpha access", icon: "F" },
            { title: "Nerdie City", desc: "3D blockchain game, staking, competitions, and community events", icon: "C" },
          ].map((item) => (
            <div key={item.title} className="bg-zinc-900 border border-red-900/15 rounded-2xl p-6 text-left">
              <div className="w-10 h-10 bg-red-900/30 border border-red-800/30 rounded-lg flex items-center justify-center text-red-500 font-bold text-sm mb-4 font-display">
                {item.icon}
              </div>
              <h3 className="text-white font-bold mb-2 text-sm">{item.title}</h3>
              <p className="text-neutral-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccessTiersSection() {
  const tiers = [
    {
      name: "Free Signals",
      price: "Free",
      description: "Start trading with real signals",
      features: [
        "Daily BTC market updates",
        "Up to 3 signals per day",
        "Community Telegram access",
        "Basic market analysis",
      ],
      cta: "Join Free Telegram",
      ctaHref: "https://t.me/+RPRDDLSZWSk3ZjZh",
      ctaType: "external" as const,
      highlight: false,
    },
    {
      name: "VIP Signals",
      price: "Hold 10K $NERDIE",
      description: "Every signal, no limits",
      features: [
        "All signals, unlimited",
        "Priority delivery (faster alerts)",
        "Full outcome tracking & win rate",
        "VIP-only Telegram channel",
        "Premium market commentary",
      ],
      cta: "Learn About VIP",
      ctaHref: "/vip",
      ctaType: "route" as const,
      highlight: true,
    },
    {
      name: "Dashboard",
      price: "Hold Syndicate NFT",
      description: "Advanced tools for power users",
      features: [
        "Full signal dashboard & history",
        "Bot performance analytics",
        "Portfolio tracking",
        "Staking overview",
        "Community leaderboard",
      ],
      cta: "Explore Dashboard",
      ctaHref: "/dashboard",
      ctaType: "route" as const,
      highlight: false,
    },
  ];

  return (
    <section id="access-tiers" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-3">
          Choose Your Access
        </h2>
        <p className="text-neutral-500 text-center mb-12 max-w-xl mx-auto">
          Three tiers designed for different levels of commitment.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 flex flex-col ${
                tier.highlight
                  ? "bg-red-950/40 border-2 border-red-800 ring-1 ring-red-800/30"
                  : "bg-zinc-900 border border-red-900/20"
              }`}
            >
              {tier.highlight && (
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3">Most Popular</span>
              )}
              <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
              <p className="text-red-500 text-sm font-semibold mb-1">{tier.price}</p>
              <p className="text-neutral-500 text-sm mb-6">{tier.description}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-neutral-300 text-sm">
                    <span className="text-red-600 mt-0.5">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {tier.ctaType === "route" ? (
                <Link
                  to={tier.ctaHref}
                  className={`block text-center py-3 rounded-full font-semibold transition ${
                    tier.highlight
                      ? "bg-red-800 hover:bg-red-700 text-white"
                      : "border border-red-800 text-red-400 hover:bg-red-900/30"
                  }`}
                >
                  {tier.cta}
                </Link>
              ) : (
                <a
                  href={tier.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 rounded-full font-semibold transition border border-red-800 text-red-400 hover:bg-red-900/30"
                >
                  {tier.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TokenSection() {
  return (
    <section id="token-utility" className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          $NERDIE Token
        </h2>
        <p className="text-neutral-500 mb-10 max-w-2xl mx-auto">
          The utility token powering VIP access, staking rewards, and the entire Nerdie Blaq ecosystem.
          Deflationary by design — less supply over time, more value for holders.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-zinc-900/60 border border-red-900/10 rounded-xl p-6">
            <p className="text-2xl font-bold text-white mb-1">1%</p>
            <p className="text-sm text-neutral-500">Burn on every trade</p>
          </div>
          <div className="bg-zinc-900/60 border border-red-900/10 rounded-xl p-6">
            <p className="text-2xl font-bold text-white mb-1">10%</p>
            <p className="text-sm text-neutral-500">Burn on staking claims</p>
          </div>
          <div className="bg-zinc-900/60 border border-red-900/10 rounded-xl p-6">
            <p className="text-2xl font-bold text-white mb-1">10K</p>
            <p className="text-sm text-neutral-500">$NERDIE = VIP access</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://dexscreener.com/base/0xe398371e809316d747e323b859a25e3c7dba8306"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-full transition"
          >
            View on DexScreener
          </a>
          <a
            href="https://app.uniswap.org/explore/tokens/base/0x4b138bd7e18a3a725a4672814f84b00711c1939d"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-red-800 text-red-400 hover:bg-red-900/30 font-semibold rounded-full transition"
          >
            Buy $NERDIE
          </a>
        </div>
      </div>
    </section>
  );
}

function NftPreviewSection() {
  return (
    <section id="nft-preview" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-zinc-900 border border-red-900/20 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
                NFT Collection
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Nerdie Syndicate NFT
              </h2>
              <p className="text-neutral-400 leading-relaxed mb-6">
                200 unique ERC-6551 NFTs on Base. Each one unlocks the advanced signal dashboard,
                exclusive holder events, the Nerdie City alpha pass, and your own token-bound wallet.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/mint"
                  className="px-6 py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-full transition text-center"
                >
                  Mint NFT (0.01 ETH)
                </Link>
                <Link
                  to="/dashboard"
                  className="px-6 py-3 border border-red-800 text-red-400 hover:bg-red-900/30 font-semibold rounded-full transition text-center"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
            <div className="text-center">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Supply", value: "200" },
                  { label: "Price", value: "0.01 ETH" },
                  { label: "Chain", value: "Base" },
                  { label: "Standard", value: "ERC-6551" },
                ].map((item) => (
                  <div key={item.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <p className="text-white font-bold text-lg">{item.value}</p>
                    <p className="text-neutral-500 text-xs">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="py-20 px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Start Getting Signals Now
        </h2>
        <p className="text-neutral-500 mb-10 max-w-xl mx-auto">
          Free to join. VIP for serious traders. Dashboard for NFT holders.
          Pick your level and start trading smarter with Nerdie Blaq.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="https://t.me/+RPRDDLSZWSk3ZjZh"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-full transition text-lg"
          >
            Join Free Telegram
          </a>
          <Link
            to="/vip"
            className="px-8 py-3.5 border border-red-800 text-red-400 hover:bg-red-900/30 font-semibold rounded-full transition text-lg"
          >
            Unlock VIP
          </Link>
          <Link
            to="/mint"
            className="px-8 py-3.5 border border-zinc-700 text-neutral-400 hover:border-neutral-500 hover:text-white font-semibold rounded-full transition text-lg"
          >
            Mint NFT
          </Link>
        </div>

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
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <BotProofSection />
      <EcosystemSection />
      <AccessTiersSection />
      <TokenSection />
      <NftPreviewSection />
      <FinalCtaSection />
    </>
  );
}
