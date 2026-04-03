import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';

export default function Vip() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Clubhouse | Tools, Signals, NFTs and Community"
        description="Enter Nerdie Blaq Clubhouse to access Web3-native tools, trading intelligence, digital assets, and community experiences built on Base."
        path="/clubhouse"
        canonicalPath="/clubhouse"
      />

      <div className="clubhouse-shell">
      {/* Hero */}
      <section className="pt-28 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 clubhouse-hero-glow pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="clubhouse-pill inline-block rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.34em] mb-6">
            Nerdie Blaq Clubhouse
          </span>
          <h1 className="clubhouse-text-glow text-4xl md:text-6xl font-black text-white mb-6 tracking-[0.12em]">
            Welcome To The <span className="text-emerald-300">Game</span>
          </h1>
          <p className="text-lg text-neutral-300 max-w-3xl mx-auto leading-relaxed mb-4">
            Nerdie Blaq Clubhouse is a Web3-powered creative ecosystem on Base that combines music, trading intelligence, NFTs, and community into one platform. Members gain access to tools, signals, digital assets, and exclusive experiences designed to build value both on-chain and in real life.
          </p>
          <p className="text-sm uppercase tracking-[0.28em] text-[#8d9b9f] mb-10">
            A hidden network of culture, access, and discovery built for those who know where to look.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://app.uniswap.org/explore/tokens/base/0x4b138bd7e18a3a725a4672814f84b00711c1939d"
              target="_blank"
              rel="noopener noreferrer"
              className="clubhouse-primary-btn px-8 py-3 font-semibold rounded-full transition text-lg"
            >
              Buy $NERDIE
            </a>
            <a
              href="https://t.me/+RPRDDLSZWSk3ZjZh"
              target="_blank"
              rel="noopener noreferrer"
              className="clubhouse-secondary-btn px-8 py-3 font-semibold rounded-full transition text-lg"
            >
              Join Free Telegram
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">How Access Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Buy $NERDIE",
                desc: "Acquire 10,000 $NERDIE tokens on Base via Uniswap or any supported DEX.",
              },
              {
                step: "2",
                title: "Connect Wallet",
                desc: "Connect your wallet on this site. We verify your $NERDIE balance automatically.",
              },
              {
                step: "3",
                title: "Access Clubhouse",
                desc: "Once verified, you're granted access to the premium Clubhouse Telegram experience with deeper market access.",
              },
            ].map((item) => (
              <div key={item.step} className="clubhouse-card rounded-2xl p-8 text-center">
                <div className="clubhouse-step w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-5">
                  {item.step}
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{item.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free vs VIP Comparison */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">Public vs Premium Clubhouse</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="clubhouse-card rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">Public Clubhouse</h3>
              <p className="text-neutral-500 text-sm mb-6">Open to everyone</p>
              <ul className="space-y-3">
                {[
                  "Daily BTC market updates",
                  "Up to 3 signals per day",
                  "Community Telegram access",
                  "Basic market analysis",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-neutral-300 text-sm">
                    <span className="text-neutral-600 mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-zinc-800">
                <p className="text-neutral-500 text-sm mb-4">Cost: Free</p>
                <a
                  href="https://t.me/+RPRDDLSZWSk3ZjZh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clubhouse-secondary-btn block text-center py-3 rounded-full font-semibold transition"
                >
                  Join Free
                </a>
              </div>
            </div>

            {/* VIP */}
            <div className="clubhouse-card-premium border-2 ring-1 rounded-2xl p-8 relative">
              <span className="clubhouse-badge absolute -top-3 left-6 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full">
                Recommended
              </span>
              <h3 className="text-xl font-bold text-white mb-2">Premium Clubhouse</h3>
              <p className="text-neutral-500 text-sm mb-6">For committed holders</p>
              <ul className="space-y-3">
                {[
                  "All signals, unlimited",
                  "Priority delivery (faster alerts)",
                  "Full outcome tracking & win rate",
                  "Premium market analysis & commentary",
                  "VIP-only Telegram channel",
                  "Early access to new features",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-neutral-300 text-sm">
                    <span className="text-[#c7b2f8] mt-0.5">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t border-[#3f2d5c]">
                <p className="text-neutral-400 text-sm mb-4">Cost: Hold 10,000 $NERDIE</p>
                <a
                  href="https://app.uniswap.org/explore/tokens/base/0x4b138bd7e18a3a725a4672814f84b00711c1939d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clubhouse-primary-btn block text-center py-3 rounded-full font-semibold transition"
                >
                  Buy $NERDIE
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Info */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="clubhouse-card rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="text-6xl md:text-7xl font-black text-[#8fd7b5] shrink-0 font-display clubhouse-text-glow">10K</div>
              <div className="md:text-left text-center">
                <h3 className="text-xl font-bold text-white mb-3">Why 10,000 $NERDIE?</h3>
                <p className="text-neutral-400 leading-relaxed mb-4">
                  $NERDIE is the heartbeat of the Nerdie Blaq ecosystem. By holding 10,000 tokens,
                  you're not just accessing the premium Clubhouse experience. You're stepping deeper into a deflationary asset with
                  real utility across signals, staking, gaming, and the metaverse.
                </p>
                <ul className="space-y-2 text-sm text-neutral-400">
                  <li>1% burn on every trade — supply shrinks constantly</li>
                  <li>10% burn on staking claims — rewards drive deflation</li>
                  <li>NFT sales inject liquidity — long-term sustainability</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Subscription Note */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="clubhouse-card rounded-2xl p-8">
            <h3 className="text-lg font-bold text-white mb-3">Subscription Option Coming Soon</h3>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-xl mx-auto">
              In the future, we'll offer a monthly subscription option for premium Clubhouse access.
              But right now, holding $NERDIE is the only way in — and the most rewarding.
              Early holders benefit from the lowest entry cost and a deflationary token that grows with the ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* CTA + Footer */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready For The Clubhouse?
          </h2>
          <p className="text-neutral-500 mb-10 max-w-xl mx-auto">
            Buy $NERDIE, connect your wallet, and unlock the full premium Clubhouse experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a
              href="https://app.uniswap.org/explore/tokens/base/0x4b138bd7e18a3a725a4672814f84b00711c1939d"
              target="_blank"
              rel="noopener noreferrer"
              className="clubhouse-primary-btn px-8 py-3 font-semibold rounded-full transition text-lg"
            >
              Buy $NERDIE
            </a>
            <a
              href="https://dexscreener.com/base/0xe398371e809316d747e323b859a25e3c7dba8306"
              target="_blank"
              rel="noopener noreferrer"
              className="clubhouse-secondary-btn px-8 py-3 font-semibold rounded-full transition text-lg"
            >
              View on DexScreener
            </a>
          </div>
          <p className="text-neutral-600 text-sm mb-10">
            Also hold a <Link to="/mint" className="clubhouse-link underline">Nerdie Syndicate NFT</Link> to unlock the full Clubhouse dashboard.
          </p>

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
          <div className="mb-8">
            <a
              href="https://farcaster.xyz/rootcee"
              target="_blank"
              rel="noopener noreferrer"
              className="clubhouse-secondary-btn inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition"
            >
              Follow on Farcaster
            </a>
          </div>
          <p className="text-neutral-600 text-sm">&copy; 2025 Nerdie Blaq. All rights reserved.</p>
        </div>
      </section>
      </div>
    </>
  );
}
