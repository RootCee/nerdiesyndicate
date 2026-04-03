interface MerchProductCardProps {
  image: string;
  title: string;
  price: string;
  href: string;
  badge?: string;
}

export default function MerchProductCard({
  image,
  title,
  price,
  href,
  badge,
}: MerchProductCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-red-900/20 bg-zinc-900/90 shadow-[0_0_0_1px_rgba(127,29,29,0.08)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        <img src={image} alt={title} className="h-full w-full object-cover" />
        {badge && (
          <span className="absolute left-4 top-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-neutral-400">{price}</p>
        </div>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Buy Now
        </a>
      </div>
    </article>
  );
}
