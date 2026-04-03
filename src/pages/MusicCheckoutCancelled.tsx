import { Link } from 'react-router-dom';

export default function MusicCheckoutCancelled() {
  return (
    <section className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(113,113,122,0.18),_transparent_40%),linear-gradient(180deg,_rgba(9,9,11,0.92),_#09090b)]" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="rounded-[32px] border border-zinc-800 bg-zinc-900/90 p-8 text-center shadow-[0_0_35px_rgba(24,24,27,0.3)] md:p-12">
          <span className="inline-block rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">
            Checkout Cancelled
          </span>
          <h1 className="mt-6 text-4xl text-white md:text-6xl">No Problem</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-300 md:text-lg">
            Your purchase was not completed. You can head back to the release page anytime and finish
            checkout when you are ready.
          </p>

          <div className="mt-8">
            <Link
              to="/music"
              className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
            >
              Return to BLAQ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
