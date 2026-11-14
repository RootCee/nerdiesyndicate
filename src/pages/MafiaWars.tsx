import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

// The public preview uses the game's built-in lite destruction fallback so
// WebGPU driver initialization cannot strand visitors on the loading screen.
const MULTIPLAYER_GAME_PATH = '/mafia-wars/play';
const SINGLE_PLAYER_GAME_PATH = '/mafia-wars/game/?phys=0&standalone=1';

const controls = [
  { keys: 'W A S D', action: 'Move through the neighborhood' },
  { keys: 'MOUSE', action: 'Look around and control the camera' },
  { keys: 'SHIFT', action: 'Run' },
  { keys: 'SPACE', action: 'Jump' },
  { keys: 'C', action: 'Crouch or stand' },
  { keys: 'E', action: 'Interact: doors, residents, the bank, City Hall, Roots Lounge' },
  { keys: 'Q / R', action: 'Next weapon / reload' },
  { keys: 'V', action: 'Change the camera view' },
  { keys: 'ESC', action: 'Release the mouse cursor or close a panel' },
];

// Controller mapping: the same table the game shows in its Controller settings (src/gamepad-input.js, standard layout).
const padControls = [
  { xbox: 'Left stick', ps: 'Left stick', action: 'Move' },
  { xbox: 'L3 (click left stick)', ps: 'L3', action: 'Sprint until you let go of the stick' },
  { xbox: 'Right stick', ps: 'Right stick', action: 'Look around' },
  { xbox: 'R3 (click right stick)', ps: 'R3', action: 'Crouch or stand' },
  { xbox: 'A', ps: '✕', action: 'Jump · confirm in menus' },
  { xbox: 'B', ps: '○', action: 'Back or close a menu' },
  { xbox: 'X', ps: '□', action: 'Interact: doors, residents, bank, City Hall, Roots Lounge' },
  { xbox: 'Y', ps: '△', action: 'Next weapon' },
  { xbox: 'LB / RB', ps: 'L1 / R1', action: 'Previous weapon / reload' },
  { xbox: 'LT / RT', ps: 'L2 / R2', action: 'Aim / fire (hold)' },
  { xbox: 'View', ps: 'Share / Create', action: 'Tap: camera view · hold: controller settings' },
  { xbox: 'Menu', ps: 'Options', action: 'City map' },
  { xbox: 'D-pad', ps: 'D-pad', action: 'Move between menu buttons' },
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
                href={MULTIPLAYER_GAME_PATH}
                className="mafia-preview-play inline-flex min-w-[240px] items-center justify-center rounded-full px-8 py-4 text-base font-black uppercase tracking-[0.13em] transition sm:text-lg"
              >
                Enter Public City
              </a>
              <a
                href={SINGLE_PLAYER_GAME_PATH}
                className="inline-flex min-w-[240px] items-center justify-center rounded-full border border-amber-200/35 bg-black/25 px-8 py-4 text-base font-bold uppercase tracking-[0.1em] text-amber-100 transition hover:border-amber-200/70 hover:text-white"
              >
                Single-Player City
              </a>
              <Link
                to="/mafia-wars/bank"
                className="inline-flex min-w-[240px] items-center justify-center rounded-full border border-amber-200/35 bg-black/25 px-8 py-4 text-base font-bold uppercase tracking-[0.1em] text-amber-100 transition hover:border-amber-200/70 hover:text-white"
              >
                My Wallet
              </Link>
              <Link
                to="/"
                className="inline-flex min-w-[240px] items-center justify-center rounded-full border border-white/15 bg-black/25 px-8 py-4 text-base font-bold text-neutral-200 transition hover:border-amber-200/40 hover:text-white"
              >
                Back to Nerdie Blaq
              </Link>
            </div>
            <a href="#how-to-play" className="mt-6 inline-block text-sm font-bold uppercase tracking-[0.14em] text-amber-200 underline decoration-amber-300/40 underline-offset-4 hover:text-white">
              How to Play / Connect Controller
            </a>
          </section>

          <section id="how-to-play" className="mafia-preview-panel mt-8 rounded-3xl p-6 sm:p-8" aria-labelledby="how-to-play-title">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">How to Play</p>
            <h2 id="how-to-play-title" className="text-2xl font-bold text-white sm:text-3xl">Connect a controller</h2>
            <p className="mt-3 text-sm text-neutral-400">
              Nerdie City supports Xbox and PlayStation controllers in the browser. Keyboard, mouse and touch keep working alongside a controller.
            </p>
            <ol className="mt-6 grid gap-4 text-sm text-neutral-300 sm:grid-cols-2">
              <li className="rounded-2xl border border-white/5 bg-black/20 p-4"><b className="text-amber-200">1. Pair or plug in.</b> Xbox: hold the pair button on top until the logo flashes, then choose it in your computer's or phone's Bluetooth settings, or connect it with a USB cable. PlayStation (DualShock 4 or DualSense): hold PS and Share (or Create) until the light bar flashes, then pair it over Bluetooth, or use a USB cable.</li>
              <li className="rounded-2xl border border-white/5 bg-black/20 p-4"><b className="text-amber-200">2. Launch Nerdie City.</b> On this page, choose <b>Enter Public City</b> (multiplayer) or <b>Single-Player City</b>.</li>
              <li className="rounded-2xl border border-white/5 bg-black/20 p-4"><b className="text-amber-200">3. Wake the controller.</b> Click or tap inside the game once, then press any button. Browsers only report a controller after a button press. To see that it was detected, hold <b>View</b> (Xbox) or <b>Share/Create</b> (PlayStation), or choose <b>Controller settings</b> on the start menu. That panel shows the controller's status and the full button list.</li>
              <li className="rounded-2xl border border-white/5 bg-black/20 p-4"><b className="text-amber-200">4. Play.</b> The prompts change to your controller's buttons, for example <b>[X] ENTER</b> on Xbox or <b>[□] ENTER</b> on PlayStation.</li>
            </ol>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead><tr className="text-xs uppercase tracking-[0.14em] text-amber-300"><th className="py-2 pr-4">Xbox</th><th className="py-2 pr-4">PlayStation</th><th className="py-2">Action</th></tr></thead>
                <tbody>
                  {padControls.map((c) => (
                    <tr key={c.action} className="border-t border-white/5 text-neutral-300"><td className="py-2 pr-4 font-bold text-amber-100">{c.xbox}</td><td className="py-2 pr-4 font-bold text-amber-100">{c.ps}</td><td className="py-2">{c.action}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 grid gap-4 text-sm text-neutral-400 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-bold text-white">Controller not detected?</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Click or tap inside the game, then press a button. The game sits in its own frame on this site, so some browsers only pass the controller to it once it has focus.</li>
                  <li>Check the controller is connected in your device's Bluetooth or USB settings, or try a USB cable.</li>
                  <li>Close other apps that may be using the controller, such as Steam or a remote-play app, then reload the page.</li>
                  <li>Try a recent Chrome or Edge. If the settings panel says <i>limited support</i>, your browser didn't report a standard layout, so only the sticks and the four face buttons work.</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-bold text-white">Known limitations</h3>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Xbox controllers have been tested on the live site. PlayStation controllers use the same browser standard, but haven't been tested on a physical controller yet.</li>
                  <li>Sound starts after your first click or tap, not after a controller press.</li>
                  <li>Typing a gamertag or room code needs a keyboard or touch. The wallet window isn't controller-navigable.</li>
                  <li>Buttons can't be remapped, and there's no vibration.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="mafia-preview-panel rounded-3xl p-6 sm:p-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Before You Enter</p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Desktop playtest controls</h2>
              <p className="mt-3 text-sm text-neutral-400">
                Use a keyboard and mouse, touch, or a controller (see How to Play above). Click inside the game when prompted to enable mouse camera control.
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
