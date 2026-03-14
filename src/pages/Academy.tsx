import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';

const coursePlaylistUrl = 'https://youtube.com/playlist?list=PLAX8YWrl6eTQsXS3R_onp5efHoLGWjxoC&si=Vgd0nalewfGigNki';
const courseEmbedUrl = 'https://www.youtube.com/embed/videoseries?list=PLAX8YWrl6eTQsXS3R_onp5efHoLGWjxoC';
const ebookUrl = 'https://chatgpt.com/canvas/shared/67dc6d7ba4748191a04565c279d2b21b';

export default function Academy() {
  return (
    <>
      <section className="pt-28 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/30 via-zinc-950 to-zinc-950 pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 bg-red-900/30 border border-red-800/40 rounded-full text-red-400 text-xs font-semibold uppercase tracking-widest mb-6">
            Nerdie Blaq Academy
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Nerdie Blaq <span className="text-red-600">Academy</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-3xl mx-auto leading-relaxed mb-4">
            Learn DeFi, Web3, trading concepts, and digital income strategies through free resources built for real people trying to level up.
          </p>
          <p className="text-sm text-neutral-500 max-w-3xl mx-auto mb-10">
            Start with the free intro course, study the ebook, and grow with the Nerdie Blaq ecosystem as new lessons, tools, and premium training roll out.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={coursePlaylistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-red-800 hover:bg-red-700 text-white font-semibold rounded-full transition text-lg"
            >
              Start Free Course
            </a>
            <a
              href={ebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 border border-red-800 text-red-400 hover:bg-red-900/30 font-semibold rounded-full transition text-lg"
            >
              Read Free Ebook
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
            <div className="bg-zinc-900 border border-red-900/20 rounded-2xl p-8 md:p-10">
              <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
                Free Intro Course
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Free Intro Course
              </h2>
              <p className="text-neutral-400 leading-relaxed mb-4">
                Jump into the Nerdie Blaq Academy playlist and start learning the foundations of DeFi, Web3, and digital strategy at your own pace.
              </p>
              <p className="text-sm text-neutral-500 leading-relaxed mb-8">
                This free video series is the entry point into the Academy. It is made to help beginners and growing learners understand the space step by step without all the confusion.
              </p>
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-red-900/20 bg-zinc-950">
                <iframe
                  className="h-full w-full"
                  src={courseEmbedUrl}
                  title="Nerdie Blaq Academy free intro course playlist"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900 border border-red-900/20 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-white mb-3">Watch On YouTube</h3>
                <p className="text-neutral-500 text-sm leading-relaxed mb-6">
                  Open the full playlist directly on YouTube if you want to save it, share it, or keep learning inside the app.
                </p>
                <a
                  href={coursePlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 rounded-full font-semibold transition bg-red-800 hover:bg-red-700 text-white"
                >
                  Open Playlist
                </a>
              </div>

              <div className="bg-zinc-900 border border-red-900/20 rounded-2xl p-8">
                <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
                  Free Ebook
                </span>
                <h3 className="text-xl font-bold text-white mb-3">Free Ebook: From 5K to 1 Million</h3>
                <p className="text-neutral-400 leading-relaxed mb-4">
                  A practical mindset and strategy guide for building toward wealth through DeFi, digital investing, and residual income opportunities.
                </p>
                <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                  This ebook is designed to help readers think bigger, move smarter, and understand how to approach DeFi with intention instead of hype.
                </p>
                <a
                  href={ebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 rounded-full font-semibold transition border border-red-800 text-red-400 hover:bg-red-900/30"
                >
                  Open Ebook
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-zinc-900 border border-red-900/20 rounded-2xl p-8 md:p-12 text-center">
            <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
              Community
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Learn With the Community
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-4 max-w-3xl mx-auto">
              The Nerdie Blaq Academy is more than content. It is a growing ecosystem built around education, strategy, and opportunity.
            </p>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-3xl mx-auto">
              As the Academy grows, members will get access to deeper lessons, market insights, premium tools, and more ways to navigate Web3 together.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-4">
              Coming Soon
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Coming Soon
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-4 max-w-3xl mx-auto">
              More courses, deeper breakdowns, premium strategy content, and community tools are on the way.
            </p>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-3xl mx-auto">
              We’re building the next phase of Nerdie Blaq Academy right now. The free course and ebook are just the beginning.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Advanced DeFi strategy lessons',
              'Market breakdowns and signal education',
              'Web3 onboarding guides',
              'Premium Academy content',
              'Community-only resources',
              'NFT dashboard learning integration',
            ].map((item) => (
              <div key={item} className="bg-zinc-900 border border-red-900/15 rounded-2xl p-6">
                <div className="w-10 h-10 bg-red-900/30 border border-red-800/30 rounded-lg flex items-center justify-center text-red-500 font-bold text-sm mb-4 font-display">
                  NB
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{item}</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">
                  More courses coming soon through the Nerdie Blaq Academy ecosystem.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            More courses coming soon
          </h2>
          <p className="text-neutral-500 mb-10 max-w-xl mx-auto">
            Keep learning with the free resources available now while the next Academy releases are being built.
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
          <p className="text-neutral-600 text-sm">&copy; 2025 Nerdie Blaq. All rights reserved.</p>
        </div>
      </section>
    </>
  );
}
