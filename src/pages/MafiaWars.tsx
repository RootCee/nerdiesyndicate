import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

// The public preview uses the game's built-in lite destruction fallback so
// WebGPU driver initialization cannot strand visitors on the loading screen.
const GAME_PATH = '/mafia-wars/game/?phys=0';

const controls = [
  { keys: 'W A S D', action: 'Move through the neighborhood' },
  { keys: 'MOUSE', action: 'Look around and control the camera' },
  { keys: 'SHIFT', action: 'Run' },
  { keys: 'SPACE', action: 'Jump' },
  { keys: 'E', action: 'Enter or exit North Court Apartments' },
  { keys: 'ESC', action: 'Release the mouse cursor' },
];

export default function MafiaWars() {
  return (
    <>
      <Seo
        title="Nerdie City: Mafia Wars | Early Development Preview"
        description="Play the early development preview of Nerdie City: Mafia Wars from Nerdie Blaq Clubhouse."
        path="/mafia-wars"
        noindex
      />

      <main className="mafia-preview-shell min-h-screen px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="mafia-preview-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <section className="mafia-preview-hero overflow-hidden rounded-[2rem] border border-amber-300/20 px-5 py-10 text-center shadow-2xl sm:px-10 sm:py-14 lg:px-16 lg:py-20">
            <div className="mafia-preview-kicker mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.24em]">
              <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.9)]" />
              Early Development Preview
            </div>

            <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-amber-100/75 sm:text-base">
              Nerdie Blaq Clubhouse Presents
            </p>
            <h1 className="mafia-preview-title mx-auto max-w-5xl text-5xl font-black leading-[0.86] text-white sm:text-7xl lg:text-8xl">
              Nerdie City
              <span className="mt-3 block text-amber-300">Mafia Wars</span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-neutral-300 sm:text-lg">
              Explore the neighborhood in third person and experience the first playable chapter of a larger city in development.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={GAME_PATH}
                className="mafia-preview-play inline-flex min-w-[240px] items-center justify-center rounded-full px-8 py-4 text-base font-black uppercase tracking-[0.13em] transition sm:text-lg"
              >
                Play Test Version
              </a>
              <Link
                to="/"
                className="inline-flex min-w-[240px] items-center justify-center rounded-full border border-white/15 bg-black/25 px-8 py-4 text-base font-bold text-neutral-200 transition hover:border-amber-200/40 hover:text-white"
              >
                Back to Nerdie Blaq
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="mafia-preview-panel rounded-3xl p-6 sm:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Before You Enter</p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Desktop playtest controls</h2>
              <p className="mt-3 text-sm text-neutral-400">
                A keyboard and mouse are recommended. Click inside the game when prompted to enable mouse camera control.
              </p>
              <dl className="mt-7 grid gap-3">
                {controls.map((control) => (
                  <div key={control.keys} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                    <dt className="min-w-[88px] rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center text-xs font-black tracking-[0.14em] text-amber-200">
                      {control.keys}
                    </dt>
                    <dd className="text-sm font-semibold text-neutral-300 sm:text-base">{control.action}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside className="mafia-preview-panel rounded-3xl p-6 sm:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Prototype Notice</p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">The city is still being built.</h2>
              <p className="mt-4 text-neutral-300">
                This temporary test release is an early prototype. You may encounter incomplete interactions, performance variation, visual issues, or browser-specific limitations.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-neutral-400">
                <li className="flex gap-3"><span className="text-amber-300">◆</span><span>Free Roam is the public test experience.</span></li>
                <li className="flex gap-3"><span className="text-amber-300">◆</span><span>No wallet connection or purchase is required.</span></li>
                <li className="flex gap-3"><span className="text-amber-300">◆</span><span>Recent desktop Chrome, Edge, Firefox, or Safari recommended.</span></li>
              </ul>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
