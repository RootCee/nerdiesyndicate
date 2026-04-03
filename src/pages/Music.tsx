import { useEffect, useRef, useState } from 'react';

const LISTEN_EVERYWHERE_LINK =
  'https://distrokid.com/hyperfollow/buddieroots/blaq?ref=release';
const SPOTIFY_ALBUM_LINK = 'https://open.spotify.com/album/5Tu4S5Ky5HAoCzXp5ByZZD';
const SUPPORT_ARTIST_LINK = 'https://nerdie-blaq-merch.square.site';
const FEATURED_MERCH_LINK = 'https://www.aliveshoes.com/nerdie-blaq-pearl2';
const MERCH_STORE_LINK = 'https://nerdie-blaq-merch.square.site';

const albumCoverImage = 'https://i.scdn.co/image/ab67616d0000b273fe20670781ba73ee7bac8802';
const featuredMerchImage =
  'https://s0.as-img.com/r/pic/1848413/1500/1500/with_box.jpg?bg=f5f5f5&u=1775143311';

const tracks = [
  { title: 'One More Time', runtime: '2:36', src: '/music/blaq/One More Time.mp3' },
  { title: 'One More Dub - Dub', runtime: '2:36', src: '/music/blaq/One More Time Dub.mp3' },
  { title: 'Drive Me Crazy', runtime: '4:11', src: '/music/blaq/Drive Me Crazy.mp3' },
  { title: 'Surface Deep', runtime: '4:18', src: '/music/blaq/Surface Deep.mp3' },
  { title: 'Blaq', runtime: '2:33', src: '/music/blaq/LANDR-BlaqMan-Open-Medium.mp3' },
  { title: 'Rusty Gears', runtime: '4:05', src: '/music/blaq/Rusty Gears Dub.mp3' },
  { title: 'Space Age Dub', runtime: '4:01', src: '/music/blaq/LANDR-RustyGears_Final-Open-Medium.mp3' },
  { title: 'Trust In Yah - Dub', runtime: '4:24', src: '/music/blaq/Trust in Yah.mp3' },
  { title: 'Higher', runtime: '5:19', src: '/music/blaq/Higher.mp3' },
];

const moreReleases = [
  {
    title: 'Blessed Rising',
    year: '2025',
    type: 'Album',
    href: 'https://music.apple.com/us/album/blessed-rising-feat-rootcee/1800600722',
  },
  {
    title: 'N-Dub NFT Album',
    year: '2024',
    type: 'Album',
    href: 'https://distrokid.com/hyperfollow/buddieroots/n-dub-nft-album',
  },
  {
    title: '4:32 HZ',
    year: '2022',
    type: 'Album',
    href: 'https://music.apple.com/cz/album/4-32-hz/1620034458',
  },
  {
    title: 'Harken',
    year: '2020',
    type: 'Album',
    href: 'https://music.apple.com/gb/album/harken/1521345778',
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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function Music() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackIndex, setActiveTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const element = audioRef.current as HTMLAudioElement;

    function onTimeUpdate() {
      setCurrentTime(element.currentTime);
    }

    function onLoadedMetadata() {
      setDuration(element.duration || 0);
    }

    function onEnded() {
      setIsPlaying(false);
      setCurrentTime(0);
    }

    element.addEventListener('timeupdate', onTimeUpdate);
    element.addEventListener('loadedmetadata', onLoadedMetadata);
    element.addEventListener('ended', onEnded);

    return () => {
      element.removeEventListener('timeupdate', onTimeUpdate);
      element.removeEventListener('loadedmetadata', onLoadedMetadata);
      element.removeEventListener('ended', onEnded);
    };
  }, []);

  async function handleTrackSelect(index: number) {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeTrackIndex === index) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
      return;
    }

    const selectedTrack = tracks[index];
    setActiveTrackIndex(index);
    setCurrentTime(0);
    setDuration(0);
    audio.src = selectedTrack.src;
    audio.load();

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  function handleSeek(value: string) {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Number(value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  async function handleBuyAlbum() {
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/music/checkout', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Unable to start checkout');
      }
      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout');
      setCheckoutLoading(false);
    }
  }

  const activeTrack = activeTrackIndex !== null ? tracks[activeTrackIndex] : null;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <audio ref={audioRef} preload="none" />

      <section className="relative overflow-hidden px-4 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.3),_transparent_45%),linear-gradient(180deg,_rgba(9,9,11,0.9),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="mx-auto w-full max-w-md">
              <div className="rounded-[30px] border border-red-900/25 bg-zinc-900/85 p-4 shadow-[0_0_45px_rgba(127,29,29,0.16)]">
                <div className="relative aspect-square overflow-hidden rounded-[24px] border border-red-950/40 bg-zinc-950">
                  <img
                    src={albumCoverImage}
                    alt="BLAQ album cover"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-6">
                    <span className="inline-block rounded-full border border-red-700/30 bg-red-900/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-200">
                      Spotify Release
                    </span>
                    <p className="mt-4 text-4xl text-white">BLAQ</p>
                    <p className="mt-2 text-sm uppercase tracking-[0.28em] text-neutral-300">
                      Buddie Roots
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
                Album Release
              </span>
              <h1 className="mt-6 text-5xl text-white md:text-7xl">BLAQ</h1>
              <p className="mt-3 text-lg uppercase tracking-[0.26em] text-neutral-400">Buddie Roots</p>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-neutral-300 md:text-lg">
                `BLAQ` is built as a cinematic artist statement for the Nerdie Blaq universe. It leans
                into underground ambition, coded independence, and a future-facing sound meant to feel
                premium whether someone streams it first or supports the release directly.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-500 md:text-base">
                The live Spotify release is dated October 31, 2025 and currently lists 9 songs. This
                page is designed to be the central landing point for discovery, streaming, and direct
                support while collectible and download-based extensions are prepared.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={LISTEN_EVERYWHERE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
                >
                  Listen Everywhere
                </a>
                <a
                  href={SPOTIFY_ALBUM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-7 py-3 text-base font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Open on Spotify
                </a>
                <a
                  href={SUPPORT_ARTIST_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 px-7 py-3 text-base font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Support the Artist
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Tracklist"
            title="BLAQ Tracklist"
            description="Stream the uploaded tracks directly from the page with a cleaner custom player built into the release layout."
          />

          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-6 shadow-[0_0_35px_rgba(127,29,29,0.08)] md:p-8">
            <div className="mb-6 rounded-[24px] border border-red-900/20 bg-zinc-950/90 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-red-300">Now Playing</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    {activeTrack ? activeTrack.title : 'Select a track to listen'}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {activeTrack ? `BLAQ • ${activeTrack.runtime}` : 'Choose any song from the release queue below.'}
                  </p>
                </div>
                {activeTrack && (
                  <button
                    type="button"
                    onClick={() => handleTrackSelect(activeTrackIndex!)}
                    className="inline-flex items-center justify-center rounded-full bg-red-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    {isPlaying ? 'Pause' : 'Resume'}
                  </button>
                )}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-zinc-800">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-red-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={(event) => handleSeek(event.target.value)}
                  className="mt-3 w-full accent-red-700"
                  disabled={!activeTrack}
                />
              </div>
            </div>

            <div className="space-y-3">
              {tracks.map((track, index) => {
                const isActive = activeTrackIndex === index;
                return (
                  <div
                    key={track.title}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      isActive
                        ? 'border-red-800/40 bg-red-950/20'
                        : 'border-zinc-800 bg-zinc-950/80'
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleTrackSelect(index)}
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
                            isActive
                              ? 'border-red-700/40 bg-red-800 text-white'
                              : 'border-red-800/30 bg-red-900/20 text-red-300 hover:bg-red-900/35'
                          }`}
                          aria-label={isActive && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                        >
                          {isActive && isPlaying ? 'II' : '▶'}
                        </button>
                        <div>
                          <p className="text-base font-medium text-white">{track.title}</p>
                          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                            Track {String(index + 1).padStart(2, '0')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        {isActive && (
                          <span className="rounded-full border border-red-800/30 bg-red-900/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200">
                            {isPlaying ? 'Playing' : 'Ready'}
                          </span>
                        )}
                        <span className="text-sm font-medium text-neutral-400">{track.runtime}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Support"
            title="Support the Artist"
            description="Offer listeners a clearer path to back the release while direct checkout, album bundles, and collectible editions are still evolving."
          />

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[28px] border border-red-900/20 bg-zinc-900/90 p-8 shadow-[0_0_35px_rgba(127,29,29,0.12)]">
              <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                Direct Support
              </span>
              <h3 className="mt-4 text-2xl font-bold text-white">Buy Album</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                This is the spot we can upgrade next into a real direct-purchase flow for `BLAQ` from your own site.
              </p>
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-neutral-500">Price</p>
                <p className="mt-2 text-3xl font-bold text-white">$9.99</p>
                <p className="mt-2 text-sm text-neutral-500">Placeholder digital album pricing</p>
              </div>
              <button
                type="button"
                onClick={handleBuyAlbum}
                disabled={checkoutLoading}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-red-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {checkoutLoading ? 'Preparing Checkout...' : 'Buy Album'}
              </button>
              {checkoutError && (
                <p className="mt-3 text-sm text-red-300">{checkoutError}</p>
              )}
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-8">
              <span className="inline-block rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">
                Artist Support
              </span>
              <h3 className="mt-4 text-2xl font-bold text-white">Support the Artist</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Back Buddie Roots directly while future album bundles, signed editions, and exclusive supporter drops come online.
              </p>
              <a
                href={SUPPORT_ARTIST_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
              >
                Support the Artist
              </a>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-8">
              <span className="inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Coming Next
              </span>
              <h3 className="mt-4 text-2xl font-bold text-white">Direct Delivery</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                Next we can replace the placeholder button with a real checkout and secure post-purchase delivery from the site.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="More Releases"
            title="More Buddie Roots Releases"
            description="A quick path to other Buddie Roots projects while the in-site music experience expands."
          />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {moreReleases.map((release) => (
              <div
                key={release.title}
                className="rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-6 shadow-[0_0_35px_rgba(127,29,29,0.08)]"
              >
                <span className="inline-block rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300">
                  {release.type}
                </span>
                <h3 className="mt-4 text-2xl font-bold text-white">{release.title}</h3>
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-neutral-500">{release.year}</p>
                <a
                  href={release.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-6 py-3 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Visit Release
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Featured Merch"
            title="Featured Merch Item of the Month"
            description="Tie the music release into the broader Nerdie Blaq ecosystem with a featured product spotlight and a quick path into the wider merch lineup."
          />

          <div className="grid items-center gap-8 rounded-[30px] border border-red-900/20 bg-zinc-900/90 p-6 shadow-[0_0_40px_rgba(127,29,29,0.12)] lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
            <div className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950">
              <img
                src={featuredMerchImage}
                alt="Nerdie Blaq Pearl 2"
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                Featured Merch Item of the Month
              </span>
              <h3 className="mt-4 text-3xl font-bold text-white">Nerdie Blaq Pearl 2</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400 md:text-base">
                A premium footwear drop that pairs the music world with the broader visual identity of Nerdie Blaq. Clean, collectible, and built to stand out.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={FEATURED_MERCH_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-red-800 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-700"
                >
                  Shop Featured Item
                </a>
                <a
                  href={MERCH_STORE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-7 py-3 text-base font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
                >
                  Visit Merch Store
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
