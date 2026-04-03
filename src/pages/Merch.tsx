import MerchProductCard from '../components/MerchProductCard';
import Seo from '../components/Seo';

const ALIVE_SHOES_LINK = 'https://www.aliveshoes.com/nerdie-blaq-pearl2';
const SQUARE_STORE_LINK = 'https://nerdie-blaq-merch.square.site';
const DISCIPLINE_HOODIE_LINK =
  'https://nerdie-blaq-merch.square.site/product/discipline-xccuses/NWEFH6HCXL4U5TAZD5INGCA2?cs=true&cst=popular';
const NERDIE_BLAQ_X1_LINK = 'https://www.aliveshoes.com/nerdie-blaq-x1';
const SOUL_REBEL_LINK = 'https://www.aliveshoes.com/soul-rebel';

const featuredShoeImage =
  'https://s0.as-img.com/r/pic/1848413/1500/1500/with_box.jpg?bg=f5f5f5&u=1775143311';
const disciplineHoodieImage =
  'https://152590411.cdn6.editmysite.com/uploads/1/5/2/5/152590411/EPM4ZJEQHO2XACCUJ3LU35HG.jpeg?width=2400&optimize=medium';
const nerdieBlaqGoodieImage =
  'https://152590411.cdn6.editmysite.com/uploads/1/5/2/5/152590411/OGYJAHWGSLKMBXUVIF5K2UP3.jpeg?width=2400&optimize=medium';

const apparelProducts = [
  {
    image:
      'https://s0.as-img.com/r/pic/1585566/1500/1500/with_box.jpg?bg=f5f5f5&u=1659060841',
    title: 'Nerdie Blaq x1',
    price: '$219',
    href: NERDIE_BLAQ_X1_LINK,
    badge: 'AliveShoes',
  },
  {
    image:
      'https://s0.as-img.com/r/pic/869747/500/500/with_box.jpg?bg=f5f5f5&u=1631656781',
    title: 'Soul Rebel',
    price: '$219',
    href: SOUL_REBEL_LINK,
    badge: 'AliveShoes',
  },
];

const merchProducts = [
  {
    image: disciplineHoodieImage,
    title: 'Discipline Hoodie',
    price: 'Available on Square',
    href: DISCIPLINE_HOODIE_LINK,
    badge: 'Square',
  },
  {
    image: nerdieBlaqGoodieImage,
    title: 'Nerdie Blaq Goodie',
    price: 'Available on Square',
    href: SQUARE_STORE_LINK,
    badge: 'Square',
  },
];

const merchHighlights = [
  {
    title: 'Streetwear Staples',
    description: 'Browse tees, hoodies, and everyday pieces from the official Nerdie Blaq merch storefront.',
  },
  {
    title: 'Premium Accessories',
    description: 'Explore caps, statement pieces, and limited-run lifestyle items as the catalog grows.',
  },
  {
    title: 'Crypto Payments',
    description: 'Crypto-native checkout is planned for a later phase once the merch experience expands.',
    badge: 'Coming Soon',
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-400">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">{description}</p>
    </div>
  );
}

export default function Merch() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Merch | Footwear, Apparel and Collectibles"
        description="Shop Nerdie Blaq merch including featured footwear, apparel drops, and collectible lifestyle pieces connected to the broader ecosystem."
        path="/merch"
        image={featuredShoeImage}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Nerdie Blaq Pearl 2',
            description: 'Featured Nerdie Blaq footwear drop available through AliveShoes.',
            image: featuredShoeImage,
            brand: {
              '@type': 'Brand',
              name: 'Nerdie Blaq',
            },
            offers: {
              '@type': 'Offer',
              url: ALIVE_SHOES_LINK,
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
            },
          },
        ]}
      />
      <section className="relative overflow-hidden px-4 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-950/30 via-zinc-950 to-zinc-950" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                Featured Drop
              </span>
              <h1 className="mt-6 text-5xl text-white md:text-7xl">
                Nerdie Blaq
                <br />
                <span className="text-red-600">Pearl 2</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400">
                A bold signature sneaker drop with a premium, streetwear-first look designed to feel like a collectible statement piece.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={ALIVE_SHOES_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
                >
                  Shop Now
                </a>
                <span className="rounded-full border border-zinc-700 bg-zinc-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-300">
                  AliveShoes Exclusive
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-red-900/20 bg-zinc-900/80 p-4 shadow-[0_0_40px_rgba(127,29,29,0.14)]">
              <div className="overflow-hidden rounded-[22px] bg-zinc-950">
                <img
                  src={featuredShoeImage}
                  alt="Nerdie Blaq Pearl 2"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Collection"
            title="Current Drops"
            description="A tighter spotlight on the two live footwear drops currently carrying the Nerdie Blaq signature on AliveShoes."
          />

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
            {apparelProducts.map((product) => (
              <MerchProductCard key={product.title} {...product} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Merch"
            title="Featured Merch"
            description="A quick look at standout apparel from the Square storefront, with a direct path into the full Nerdie Blaq merch shop."
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {merchProducts.map((product) => (
              <MerchProductCard key={product.title} {...product} />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {merchHighlights.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-800/30 bg-red-900/30 text-sm font-bold text-red-400">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.description}</p>
                {item.badge && (
                  <span className="mt-4 inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8">
            <a
              href={SQUARE_STORE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
            >
              Visit Full Store
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-900/20 bg-zinc-900/90 p-8 text-center shadow-[0_0_40px_rgba(127,29,29,0.12)] md:p-12">
          <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-400">
            Shop All
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">Visit The Full Store</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-neutral-400 md:text-base">
            Browse the full Nerdie Blaq merch lineup on Square while the in-app storefront continues to evolve.
          </p>
          <a
            href={SQUARE_STORE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-red-800 px-8 py-3 text-base font-semibold text-white transition hover:bg-red-700"
          >
            Visit Full Store
          </a>
        </div>
      </section>
    </>
  );
}
