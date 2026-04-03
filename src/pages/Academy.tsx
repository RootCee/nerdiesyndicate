import LearningCard from '../components/LearningCard';
import Seo from '../components/Seo';

const coursePlaylistUrl = 'https://youtube.com/playlist?list=PLAX8YWrl6eTQsXS3R_onp5efHoLGWjxoC&si=Vgd0nalewfGigNki';
const courseEmbedUrl = 'https://www.youtube.com/embed/videoseries?list=PLAX8YWrl6eTQsXS3R_onp5efHoLGWjxoC';
const ebookUrl = 'https://chatgpt.com/canvas/shared/67dc6d7ba4748191a04565c279d2b21b';

const beginnerPathResources = [
  {
    title: 'Learn HTML',
    description:
      'Start with the building blocks of the web and learn how pages are structured before moving into programming logic.',
    difficulty: 'Beginner' as const,
    source: 'Codecademy',
    href: 'https://www.codecademy.com/learn/learn-html',
  },
  {
    title: 'Learn JavaScript',
    description:
      'Build your programming foundation with core JavaScript concepts used across modern web apps and Web3 interfaces.',
    difficulty: 'Beginner' as const,
    source: 'Codecademy',
    href: 'https://www.codecademy.com/learn/learn-javascript',
  },
];

const programmingResources = [
  {
    title: 'Learn Python 3',
    description:
      'Get comfortable with Python syntax, problem solving, and scripting through a beginner-friendly coding path.',
    difficulty: 'Beginner' as const,
    source: 'Codecademy',
    href: 'https://www.codecademy.com/learn/learn-python-3',
  },
];

const computerScienceResources = [
  {
    title: 'Introduction to Computer Science and Programming in Python',
    description:
      'Work through a deeper academic foundation in programming and computational thinking with MIT OpenCourseWare.',
    difficulty: 'Intermediate' as const,
    source: 'MIT OCW',
    href: 'https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/',
  },
];

const projectPlaceholders = [
  'Portfolio landing page',
  'Signal journal tracker',
  'Personal Python automation script',
];

const comingSoonItems = [
  'Token-gated Solidity fundamentals',
  'Nerdie Blaq dashboard building labs',
  'Members-only project reviews',
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

function ResourceGrid({
  resources,
}: {
  resources: Array<{
    title: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate';
    source: string;
    href: string;
  }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <LearningCard key={resource.href} {...resource} />
      ))}
    </div>
  );
}

export default function Academy() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Academy | Web3, Coding and Builder Education"
        description="Learn through Nerdie Blaq Academy with curated coding, programming, and computer science resources for builders entering the digital economy."
        path="/academy"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Nerdie Blaq Academy Learning Paths',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Beginner Path',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Programming',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Computer Science',
              },
            ],
          },
        ]}
      />
      <section className="relative overflow-hidden px-4 pb-16 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-950/30 via-zinc-950 to-zinc-950" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
            Nerdie Blaq Academy
          </span>
          <h1 className="mt-6 text-5xl text-white md:text-7xl">
            Learn The
            <br />
            <span className="text-red-600">Digital Syndicate</span> Way
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-neutral-400">
            A curated learning hub for people leveling up in coding, programming fundamentals, and computer science through trusted free resources.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-500">
            We do the organizing. You do the learning. Every link opens out to the original provider in a new tab.
          </p>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-red-900/20 bg-zinc-900/90 p-8 md:p-10">
              <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-400">
                Free Intro Course
              </span>
              <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">Watch The Academy Intro Series</h2>
              <p className="mt-4 text-neutral-400 leading-relaxed">
                Start with the original Nerdie Blaq Academy video series, then move into the curated external learning paths below.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                This keeps the Academy rooted in your own ecosystem while still giving people strong outside resources to keep leveling up.
              </p>
              <div className="mt-8 aspect-video w-full overflow-hidden rounded-2xl border border-red-900/20 bg-zinc-950">
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
              <div className="rounded-2xl border border-red-900/20 bg-zinc-900/90 p-8">
                <h3 className="text-xl font-bold text-white">Watch On YouTube</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                  Open the full playlist in YouTube if you want to save it, share it, or watch it in the native player.
                </p>
                <a
                  href={coursePlaylistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 block rounded-full bg-red-800 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Open Playlist
                </a>
              </div>

              <div className="rounded-2xl border border-red-900/20 bg-zinc-900/90 p-8">
                <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-red-400">
                  Free Ebook
                </span>
                <h3 className="mt-4 text-xl font-bold text-white">From 5K to 1 Million</h3>
                <p className="mt-3 text-neutral-400 leading-relaxed">
                  Keep the Academy grounded in mindset, strategy, and digital wealth-building with the original free ebook.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                  It works well as a companion resource alongside the coding and computer science links below.
                </p>
                <a
                  href={ebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 block rounded-full border border-red-800 py-3 text-center text-sm font-semibold text-red-400 transition hover:bg-red-900/30"
                >
                  Open Ebook
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Beginner Path"
            title="Start Here"
            description="A clean on-ramp into web basics and programming logic for people who want structure without overwhelm."
          />
          <ResourceGrid resources={beginnerPathResources} />
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Programming"
            title="Build Core Coding Skills"
            description="Strengthen your practical coding base with beginner-friendly courses that translate well into app building, automation, and Web3 tooling."
          />
          <ResourceGrid resources={programmingResources} />
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Computer Science"
            title="Go Deeper"
            description="When you want more than surface-level tutorials, this section helps you step into stronger computer science fundamentals."
          />
          <ResourceGrid resources={computerScienceResources} />
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Nerdie Blaq Projects"
            title="Project Tracks"
            description="Placeholder project lanes for turning study time into tangible work you can ship, demo, or build into your portfolio."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {projectPlaceholders.map((item) => (
              <div key={item} className="rounded-2xl border border-red-900/15 bg-zinc-900/90 p-6">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-800/30 bg-red-900/30 text-sm font-bold text-red-400">
                  NB
                </div>
                <h3 className="text-lg font-bold text-white">{item}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  Project briefs and guided buildouts can live here in Phase 2.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Coming Soon"
            title="Token-Gated Courses"
            description="Premium Academy tracks can be layered in later for NFT holders, token holders, or community members with verified access."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {comingSoonItems.map((item) => (
              <div key={item} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
                <span className="inline-block rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  Coming Soon
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{item}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  Reserved for gated learning flows, member perks, and deeper Nerdie Blaq education content.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
