import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';

const featuredBusinesses = [
  {
    name: 'Retail Business',
    summary: 'A business NFT lane designed for creators and operators building consumer-facing storefronts on Base.',
  },
  {
    name: 'Service Business',
    summary: 'A path for digital services, consulting, and execution-driven ventures that can grow inside the ecosystem.',
  },
  {
    name: 'Community Business',
    summary: 'A collaborative business layer built for shared initiatives, local activations, and token-aligned projects.',
  },
];

export default function Businesses() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Businesses | On-Chain Business NFTs on Base"
        description="Explore Nerdie Blaq Businesses, the on-chain business collection on Base connecting community ownership, minting, and ecosystem growth."
        path="/businesses"
      />

      <section className="relative overflow-hidden px-4 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.24),_transparent_42%),linear-gradient(180deg,_rgba(9,9,11,0.94),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
                Base Ecosystem
              </span>
              <h1 className="mt-6 text-5xl text-white md:text-7xl">
                Nerdie Blaq
                <br />
                <span className="text-red-600">Businesses</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-300">
                Businesses extends the Nerdie Blaq ecosystem into on-chain ownership, giving the community a clearer path into business-themed NFTs, minting, and future staking mechanics on Base.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 md:text-base">
                This public page introduces the collection and value proposition, while the full minting and staking experience remains available inside the connected dashboard.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
                >
                  Open Dashboard
                </a>
                <a
                  href="/mint"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-7 py-3 text-base font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Explore NFTs
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-red-900/20 bg-zinc-900/85 p-6 shadow-[0_0_45px_rgba(127,29,29,0.14)]">
              <div className="grid gap-4">
                {featuredBusinesses.map((business, index) => (
                  <div key={business.name} className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-800/30 bg-red-900/30 text-sm font-bold text-red-300">
                      {index + 1}
                    </span>
                    <h2 className="mt-4 text-xl font-bold text-white">{business.name}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-400">{business.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            {
              title: 'Mint Access',
              description: 'Business NFTs can be minted from the connected dashboard with on-chain supply and pricing controls already wired into the app.',
            },
            {
              title: 'Staking Path',
              description: 'The staking layer is already part of the product architecture, giving holders a direct way to put business NFTs to work.',
            },
            {
              title: 'Ecosystem Utility',
              description: 'Businesses are built to complement music, community, digital assets, and broader Nerdie Blaq ecosystem growth.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-red-900/20 bg-zinc-900/90 p-7">
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicSiteFooter />
    </>
  );
}
