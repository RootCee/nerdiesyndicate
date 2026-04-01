interface LearningCardProps {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate';
  source: string;
  href: string;
}

const DIFFICULTY_STYLES: Record<LearningCardProps['difficulty'], string> = {
  Beginner: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  Intermediate: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
};

export default function LearningCard({
  title,
  description,
  difficulty,
  source,
  href,
}: LearningCardProps) {
  return (
    <article className="rounded-2xl border border-red-900/20 bg-zinc-900/90 p-6 shadow-[0_0_0_1px_rgba(127,29,29,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${DIFFICULTY_STYLES[difficulty]}`}>
          {difficulty}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-neutral-300">
          {source}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-neutral-400">{description}</p>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        Start Learning
      </a>
    </article>
  );
}
