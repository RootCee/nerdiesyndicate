import { Link } from 'react-router-dom';
import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';

const pillars = [
  {
    title: 'Culture First',
    description: 'Nerdie Blaq Clubhouse starts from music, storytelling, and community identity rather than treating culture as an afterthought.',
  },
  {
    title: 'Utility on Base',
    description: 'The ecosystem is designed around Base so digital assets, access systems, and future experiences can stay close to where the community builds.',
  },
  {
    title: 'Ownership Layers',
    description: 'Tokens, NFTs, business assets, and supporter products each create different ways to participate in the platform.',
  },
];

const roadmapItems = [
  'Expand public educational content and deeper written explainers around the ecosystem.',
  'Continue refining Clubhouse access, trading intelligence, and token-gated experiences.',
  'Grow the business NFT and staking layer into a more visible ownership pathway.',
  'Develop Nerdie City as the metaverse layer where music, NFTs, business ownership, staking, learning, community, and digital identity can converge in one immersive world.',
  'Connect music, collectibles, and supporter products more tightly across releases and campaigns.',
];

const buildStatusItems = [
  {
    label: 'Live Now',
    title: 'Public Clubhouse and Content Layer',
    description: 'The public site, Clubhouse access page, music, merch, Academy, businesses overview, and ecosystem explainer are already live as discoverable public-facing entry points.',
    accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  {
    label: 'Live Now',
    title: 'Token-Gated Utility',
    description: 'The ecosystem already includes holder-gated dashboard access, NFT-linked experiences, and a working structure for deeper member utility inside the product.',
    accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  {
    label: 'In Progress',
    title: 'Business Ownership Expansion',
    description: 'Business NFTs and staking are part of the active product direction, with the public layer explaining the vision while the connected experience continues to mature.',
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  {
    label: 'Long-Term',
    title: 'Nerdie City',
    description: 'Nerdie City is the long-term world-building layer intended to bring music, digital identity, ownership, learning, staking, and community into one immersive Base-native environment.',
    accent: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="px-4 py-12 md:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-bold text-white md:text-4xl">{title}</h2>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-neutral-400 md:text-lg">{children}</div>
      </div>
    </section>
  );
}

export default function Ecosystem() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Clubhouse Ecosystem | Music, Web3, NFTs and Base"
        description="Explore the full Nerdie Blaq Clubhouse ecosystem, including music, trading tools, NFTs, business assets, education, merch, and the long-term vision built on Base."
        path="/ecosystem"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            name: 'Nerdie Blaq Clubhouse Ecosystem',
            description:
              'A long-form public overview of the Nerdie Blaq Clubhouse ecosystem across music, trading tools, NFTs, business assets, education, merch, and Base-native infrastructure.',
            url: 'https://nerdieblaq.xyz/ecosystem',
          },
        ]}
      />

      <section className="relative overflow-hidden px-4 pb-18 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.28),_transparent_40%),linear-gradient(180deg,_rgba(9,9,11,0.94),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
            Public Overview
          </span>
          <h1 className="mt-6 text-5xl text-white md:text-7xl">
            Nerdie Blaq Clubhouse
            <br />
            <span className="text-red-600">Ecosystem</span>
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-relaxed text-neutral-300 md:text-xl">
            Nerdie Blaq Clubhouse is a growing Web3 ecosystem that connects music, trading intelligence,
            NFTs, education, business ownership, and supporter commerce into one story. This page is a
            deeper public-facing guide to what the project is, what it is building on Base, and why the
            ecosystem is designed to create value both culturally and on-chain.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-2xl border border-red-900/20 bg-zinc-900/85 p-6 shadow-[0_0_35px_rgba(127,29,29,0.1)]">
                <h2 className="text-xl font-bold text-white">{pillar.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section id="what-is-clubhouse" title="What is Nerdie Blaq Clubhouse">
        <p>
          Nerdie Blaq Clubhouse is the public umbrella for a multi-part ecosystem that blends creative culture
          with Web3 utility. Instead of being just a music brand, just a token project, or just a trading tool,
          it brings several layers together under one identity.
        </p>
        <p>
          The Clubhouse concept matters because it gives the community a single place to understand how music,
          market intelligence, NFTs, business assets, merch, and education relate to each other. For new visitors,
          it creates context. For supporters, it creates a clearer path from interest to participation.
        </p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">Explore Next</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/clubhouse" className="rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">
              Visit Clubhouse
            </Link>
            <Link to="/music" className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:border-zinc-500 hover:text-white">
              Explore Music
            </Link>
          </div>
        </div>
      </Section>

      <Section id="music-culture" title="Music and Creative Culture">
        <p>
          Music is not a side feature of Nerdie Blaq Clubhouse. It is one of the core pillars that gives the
          ecosystem its voice, story, and emotional gravity. Releases like <em>BLAQ</em> help define the world
          around the project and make the platform feel like a culture-driven brand instead of a purely technical product.
        </p>
        <p>
          This creative layer also strengthens credibility. It shows that the project is not only asking people to
          speculate on assets, but also inviting them into a broader identity built through original art, releases,
          audience building, and direct supporter relationships.
        </p>
        <p>
          Public entry point: <Link to="/music" className="text-red-400 hover:text-red-300">Music</Link>.
        </p>
      </Section>

      <Section id="trading-tools" title="Trading Tools and Signals">
        <p>
          Another part of the ecosystem is the trading intelligence layer. This includes live market observations,
          signal delivery, and a structured presentation of trading-related information for the community. Rather
          than existing in isolation, the signals layer sits inside the broader Clubhouse experience.
        </p>
        <p>
          That design is important because it frames the trading tools as one utility inside a larger ecosystem.
          Users can engage with the public Clubhouse experience first, then move deeper into premium access or
          holder-gated tools depending on their level of commitment.
        </p>
        <p>
          Public entry point: <Link to="/clubhouse" className="text-red-400 hover:text-red-300">Clubhouse</Link>.
        </p>
      </Section>

      <Section id="nfts-ownership" title="NFTs and Digital Ownership">
        <p>
          NFTs in Nerdie Blaq Clubhouse are designed to be more than profile collectibles. They represent a digital
          ownership layer that can unlock access, tie members more closely to the ecosystem, and serve as the basis
          for future on-chain utility.
        </p>
        <p>
          This ownership model supports a more durable relationship between creator and supporter. Instead of simple
          passive following, holders can gain meaningful access to tools, assets, and community experiences.
        </p>
        <p>
          Related public pages: <Link to="/clubhouse" className="text-red-400 hover:text-red-300">Clubhouse</Link> and <Link to="/businesses" className="text-red-400 hover:text-red-300">Businesses</Link>.
        </p>
      </Section>

      <Section id="businesses-staking" title="Business NFTs and Staking">
        <p>
          The business NFT layer expands the ecosystem from personal access into on-chain ownership themes. It suggests
          a broader ambition: not only building a fan community, but experimenting with digital business frameworks that
          can live natively inside the project.
        </p>
        <p>
          Staking introduces another utility dimension by giving holders a reason to stay engaged over time. Together,
          business NFTs and staking point toward a system where participation can be deeper, more structured, and more
          aligned with long-term ecosystem growth.
        </p>
        <p>
          Public entry point: <Link to="/businesses" className="text-red-400 hover:text-red-300">Businesses</Link>.
        </p>
      </Section>

      <Section id="academy-education" title="Academy and Education">
        <p>
          Nerdie Blaq Clubhouse also includes an education layer through the Academy. This matters because strong
          communities are not built only through hype or access. They are built by helping members learn, build, and
          improve their own skills.
        </p>
        <p>
          The Academy gives the ecosystem a more credible public mission. It signals that the project wants to create
          informed participants, not just consumers. Over time, this kind of educational content can also become one
          of the strongest search and credibility assets for the site.
        </p>
        <p>
          Public entry point: <Link to="/academy" className="text-red-400 hover:text-red-300">Academy</Link>.
        </p>
      </Section>

      <Section id="merch-supporters" title="Merch and Supporter Economy">
        <p>
          Merch is the bridge between identity and participation. It gives supporters a simple, familiar way to back
          the project while also expanding the visual footprint of the brand beyond the screen.
        </p>
        <p>
          In the context of Nerdie Blaq Clubhouse, merch is part of a broader supporter economy. Music, products,
          access, and digital assets can reinforce one another instead of existing as disconnected offerings.
        </p>
        <p>
          Public entry point: <Link to="/merch" className="text-red-400 hover:text-red-300">Merch</Link>.
        </p>
      </Section>

      <Section id="built-on-base" title="Built on Base">
        <p>
          Base provides the blockchain foundation for the ecosystem. That matters for both practical and strategic
          reasons. It supports on-chain assets, access patterns, and future extensions while keeping the project tied
          to a growing network that is increasingly relevant in the creator and consumer crypto landscape.
        </p>
        <p>
          Positioning the platform on Base also helps explain the project to grant programs, builders, and ecosystem
          partners. It shows that Nerdie Blaq Clubhouse is not abstractly “Web3,” but intentionally anchored to a
          specific chain and its surrounding community.
        </p>
        <p>
          The project is also building in public across the wider Base and Farcaster ecosystem, which helps keep the
          community layer visible, credible, and connected to the conversations shaping creator-native Web3.
        </p>
      </Section>

      <Section id="proof-of-build" title="Proof of Build">
        <p>
          Nerdie Blaq Clubhouse is not being presented as a purely conceptual roadmap. Parts of the ecosystem are
          already live today, while other parts are clearly in development or positioned as long-term vision.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {buildStatusItems.map((item) => (
            <div key={item.title} className="rounded-2xl border border-red-900/20 bg-zinc-900/85 p-6">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${item.accent}`}>
                {item.label}
              </span>
              <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{item.description}</p>
            </div>
          ))}
        </div>
        <p>
          This separation matters because it helps community members, grant reviewers, and ecosystem partners understand
          what is already operating, what is actively being extended, and where the longer-term world-building layer is headed.
        </p>
      </Section>

      <Section id="vision-roadmap" title="Vision / Roadmap">
        <p>
          The long-term vision for Nerdie Blaq Clubhouse is to keep turning separate pieces into a more unified
          ecosystem. That means stronger pathways between discovery, culture, ownership, utility, and community value.
        </p>
        <p>
          A major part of that long-term direction is Nerdie City. Nerdie City is the metaverse layer of the Nerdie
          Blaq Clubhouse ecosystem, designed to bring together music, NFTs, business ownership, staking, learning,
          community, and digital identity inside one immersive world-building environment.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {roadmapItems.map((item, index) => (
            <div key={item} className="rounded-2xl border border-red-900/20 bg-zinc-900/85 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-800/30 bg-red-900/30 text-sm font-bold text-red-300">
                {index + 1}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-neutral-400">{item}</p>
            </div>
          ))}
        </div>
        <p>
          In practical terms, the roadmap points toward more content depth, stronger ecosystem integration, and clearer
          public storytelling around what the platform is building on Base.
        </p>
      </Section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-red-900/20 bg-zinc-900/90 p-8 shadow-[0_0_40px_rgba(127,29,29,0.12)] md:p-10">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Explore the Ecosystem</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-400">
            If you want the quick path through the public experience, start with the Clubhouse, then move into music,
            businesses, merch, and Academy resources.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { label: 'Clubhouse', href: '/clubhouse' },
              { label: 'Music', href: '/music' },
              { label: 'Merch', href: '/merch' },
              { label: 'Academy', href: '/academy' },
              { label: 'Businesses', href: '/businesses' },
            ].map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <PublicSiteFooter />
    </>
  );
}
