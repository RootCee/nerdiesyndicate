import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';

const features = [
  {
    title: 'Blaq Mass System v1',
    description:
      'A hypertrophy-first training lane built for focused size work, repeatable effort, and disciplined progression across the week.',
    eyebrow: 'Mass Builder',
  },
  {
    title: 'Blaq Core System',
    description:
      'Core-focused training blocks that support posture, stability, movement quality, and visible midline development.',
    eyebrow: 'Core Control',
  },
  {
    title: 'Weekly workout calendar',
    description:
      'A simple weekly structure that keeps lift days, core work, recovery, and conditioning easy to follow on mobile.',
    eyebrow: 'Weekly Flow',
  },
  {
    title: 'Exercise image cards',
    description:
      'Visual exercise cards make it easier to remember movement selection, stay consistent, and move through sessions with less guesswork.',
    eyebrow: 'Visual Training',
  },
  {
    title: 'Progress tracking',
    description:
      'Track training momentum, session completion, and physique progress with a cleaner accountability loop built for daily use.',
    eyebrow: 'Stay Locked In',
  },
  {
    title: 'Meal guidance',
    description:
      'Simple nutrition guidance helps users support muscle growth, recovery, and consistency without turning the app into a food spreadsheet.',
    eyebrow: 'Fuel Up',
  },
] as const;

const weeklyCalendar = [
  {
    day: 'Mon',
    title: 'Blaq Mass Push',
    detail: 'Chest, shoulders, triceps, and finishers for upper-body volume.',
  },
  {
    day: 'Tue',
    title: 'Core + Conditioning',
    detail: 'Midline stability, low-impact cardio, and movement prep.',
  },
  {
    day: 'Wed',
    title: 'Blaq Mass Pull',
    detail: 'Back, biceps, rear delts, and posture-focused work.',
  },
  {
    day: 'Thu',
    title: 'Mobility Reset',
    detail: 'Recovery flow, stretching, and lighter core activation.',
  },
  {
    day: 'Fri',
    title: 'Lower Body Power',
    detail: 'Quads, glutes, hamstrings, and explosive lower-body work.',
  },
  {
    day: 'Sat',
    title: 'Blaq Core System',
    detail: 'Focused abs, rotational strength, bracing, and balance.',
  },
  {
    day: 'Sun',
    title: 'Reflection + Recovery',
    detail: 'Check-ins, hydration, meal prep, and progress review.',
  },
] as const;

const exerciseCards = [
  {
    title: 'Incline Press',
    focus: 'Upper chest',
    gradient: 'from-[#244734] via-[#15221f] to-[#241238]',
  },
  {
    title: 'Cable Crunch',
    focus: 'Core control',
    gradient: 'from-[#241238] via-[#16111f] to-[#123126]',
  },
  {
    title: 'Split Squat',
    focus: 'Leg drive',
    gradient: 'from-[#123126] via-[#0f1714] to-[#3a1d2f]',
  },
] as const;

const screenshotCards = [
  {
    title: 'Weekly Planner',
    subtitle: 'Schedule workouts, recovery, and accountability in one clean lane.',
    accent: 'from-emerald-500/35 to-violet-500/20',
    metrics: ['5 workouts scheduled', '2 recovery blocks', '1 meal prep reminder'],
  },
  {
    title: 'Progress Dashboard',
    subtitle: 'See streaks, completed sessions, and body-composition checkpoints.',
    accent: 'from-violet-500/30 to-emerald-500/20',
    metrics: ['12 day streak', '+3.8 lb gain', '86% weekly completion'],
  },
  {
    title: 'Exercise Library',
    subtitle: 'Image-first movement cards make every session easier to execute.',
    accent: 'from-[#7c3aed]/30 to-[#14532d]/25',
    metrics: ['Mass chest day', 'Core circuit', 'Leg power block'],
  },
] as const;

const mealGuidance = [
  'Protein-forward meals to support muscle gain and recovery.',
  'Simple meal timing suggestions around training days.',
  'Hydration and consistency reminders built for real routines.',
] as const;

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
    <div className="max-w-3xl">
      <span className="site-accent-pill inline-flex rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em]">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-4xl text-white md:text-5xl">{title}</h2>
      <p className="mt-4 text-base text-neutral-400 md:text-lg">{description}</p>
    </div>
  );
}

function PhoneMockup({
  title,
  subtitle,
  accent,
  metrics,
}: {
  title: string;
  subtitle: string;
  accent: string;
  metrics: readonly string[];
}) {
  return (
    <div className="mx-auto w-full max-w-[290px] rounded-[34px] border border-white/10 bg-[#05070a] p-3 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#090b10] p-4">
        <div className={`absolute inset-0 bg-gradient-to-b ${accent}`} />
        <div className="relative z-10">
          <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-white/15" />
          <div className="rounded-[22px] border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200/80">Nerdie Blaq Fit</p>
            <h3 className="mt-3 text-2xl font-bold uppercase tracking-[0.08em] text-white">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">{subtitle}</p>
            <div className="mt-5 space-y-2">
              {metrics.map((metric) => (
                <div
                  key={metric}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100"
                >
                  {metric}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-emerald-200">
              Placeholder app screen
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Fit() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Fit | Music. Money. Muscle."
        description="Discover Nerdie Blaq Fit, a mobile-first training concept from Nerdie Blaq featuring Blaq Mass System v1, Blaq Core System, workout planning, progress tracking, and meal guidance."
        path="/fit"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Nerdie Blaq Fit',
            description:
              'A public landing page for the Nerdie Blaq Fit training app concept featuring muscle-building programs, weekly planning, exercise cards, progress tracking, and meal guidance.',
            url: 'https://nerdieblaq.xyz/fit',
          },
        ]}
      />

      <section className="relative overflow-hidden px-4 pb-18 pt-28 md:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(18,49,38,0.34),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(36,18,56,0.38),_transparent_30%),linear-gradient(180deg,_rgba(5,7,10,0.85),_#05070a)]" />
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="site-accent-pill inline-flex rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em]">
                Fitness Beta
              </span>
              <h1 className="mt-6 text-5xl text-white md:text-7xl">
                Nerdie Blaq
                <br />
                <span className="text-emerald-300">Fit</span>
              </h1>
              <p className="mt-5 text-xl uppercase tracking-[0.26em] text-neutral-300 md:text-2xl">
                Music. Money. Muscle.
              </p>
              <p className="mt-6 max-w-2xl text-base text-neutral-300 md:text-lg">
                Nerdie Blaq Fit is a disciplined training experience built around muscle-focused programming,
                core development, visual exercise guidance, and weekly accountability. The goal is simple:
                help users stay locked in, build momentum, and look stronger every week.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="https://testflight.apple.com/join/tTVXfskc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-primary-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition"
                >
                  Test the App on TestFlight
                </a>
                <a
                  href="mailto:rootcee@nerdieblaq.xyz"
                  className="site-secondary-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition"
                >
                  Email for Access
                </a>
                <a
                  href="#screenshots"
                  className="site-secondary-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition"
                >
                  Preview the App
                </a>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Focus', value: 'Mass + Core' },
                  { label: 'Format', value: 'Mobile-first' },
                  { label: 'Status', value: 'Beta concept' },
                ].map((item) => (
                  <div key={item.label} className="site-card rounded-[24px] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-x-10 top-8 h-40 rounded-full bg-emerald-500/15 blur-3xl" />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <div className="site-card-premium rounded-[30px] p-6">
                  <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Blaq Mass System v1</p>
                  <h2 className="mt-4 text-3xl font-bold text-white">Built for growth and structure.</h2>
                  <p className="mt-4 text-sm text-neutral-300">
                    Program blocks center around repeatable volume, training consistency, and visible muscle
                    progress without overcomplicating the routine.
                  </p>
                </div>
                <div className="site-card rounded-[30px] p-6">
                  <p className="text-xs uppercase tracking-[0.24em] text-violet-200">Blaq Core System</p>
                  <h2 className="mt-4 text-3xl font-bold text-white">Strength starts in the center.</h2>
                  <p className="mt-4 text-sm text-neutral-300">
                    Core work is treated as foundational, not optional, so stability, posture, and visible abs
                    evolve alongside mass-focused training.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Feature Stack"
            title="A focused training app with the Nerdie Blaq mindset."
            description="The first landing page keeps the message tight: clear programs, consistent structure, visual guidance, and a premium culture-first look that still feels connected to the wider Nerdie Blaq brand."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="site-card rounded-[28px] p-6">
                <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  {feature.eyebrow}
                </span>
                <h3 className="mt-5 text-2xl font-bold text-white">{feature.title}</h3>
                <p className="mt-4 text-sm text-neutral-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <SectionHeader
              eyebrow="Weekly Rhythm"
              title="A weekly workout calendar that keeps the routine moving."
              description="The schedule stays practical: push, pull, legs, core, recovery, and conditioning balanced into one easy weekly flow."
            />
          </div>
          <div className="site-card rounded-[30px] p-5 md:p-6">
            <div className="grid gap-3">
              {weeklyCalendar.map((entry) => (
                <div
                  key={entry.day}
                  className="rounded-[24px] border border-white/8 bg-black/20 px-4 py-4 md:grid md:grid-cols-[72px_1fr] md:items-start md:gap-4"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200">
                    {entry.day}
                  </div>
                  <div className="mt-2 md:mt-0">
                    <h3 className="text-xl font-bold text-white">{entry.title}</h3>
                    <p className="mt-2 text-sm text-neutral-400">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Exercise Cards"
            title="Image-first training cards make sessions easier to follow."
            description="The app’s exercise library is presented as visual cards so users can move faster between movements and stay more confident inside the workout."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {exerciseCards.map((card) => (
              <div key={card.title} className="site-card overflow-hidden rounded-[28px]">
                <div className={`aspect-[4/5] bg-gradient-to-br ${card.gradient} p-5`}>
                  <div className="flex h-full flex-col justify-between rounded-[22px] border border-white/10 bg-black/15 p-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-neutral-200/75">Exercise Preview</p>
                      <h3 className="mt-3 text-3xl font-bold text-white">{card.title}</h3>
                      <p className="mt-2 text-sm uppercase tracking-[0.22em] text-emerald-200">{card.focus}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
                      Placeholder image card
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="screenshots" className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="App Preview"
            title="Placeholder screenshots for the first public concept."
            description="These mock screens give the launch page a stronger product feel now, while leaving room for real UI screenshots once the beta build is ready."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {screenshotCards.map((card) => (
              <PhoneMockup key={card.title} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="site-card-premium rounded-[30px] p-7">
            <span className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-200">
              Progress Tracking
            </span>
            <h2 className="mt-5 text-4xl font-bold text-white">Measure the work so the work compounds.</h2>
            <p className="mt-4 text-sm text-neutral-300">
              Nerdie Blaq Fit is positioned around consistency, not random motivation. Streaks, session
              check-ins, and visible trend lines keep the user focused on what matters.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Workout streak', value: '12 days' },
                { label: 'Mass phase', value: 'Week 4' },
                { label: 'Core score', value: 'Up 18%' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">{item.label}</p>
                  <p className="mt-2 text-xl font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="site-card rounded-[30px] p-7">
            <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Meal Guidance
            </span>
            <h2 className="mt-5 text-4xl font-bold text-white">Simple food guidance that supports the mission.</h2>
            <p className="mt-4 text-sm text-neutral-300">
              Nutrition is framed as a support system for training, recovery, and lean muscle development rather
              than a complex tracker-heavy experience.
            </p>
            <div className="mt-6 space-y-3">
              {mealGuidance.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 pt-8">
        <div className="mx-auto max-w-5xl">
          <div className="site-card-premium rounded-[32px] px-6 py-10 text-center md:px-10">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Nerdie Blaq Fit Beta</p>
            <h2 className="mt-5 text-4xl text-white md:text-6xl">Built for people who want structure and results.</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base text-neutral-300 md:text-lg">
              The first release direction is clear: a branded fitness landing page that feels premium, mobile-ready,
              and ready for future product screenshots, TestFlight links, and beta onboarding when the app is ready.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="https://testflight.apple.com/join/tTVXfskc"
                target="_blank"
                rel="noopener noreferrer"
                className="site-primary-btn inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold transition"
              >
                Test the App on TestFlight
              </a>
              <a
                href="mailto:rootcee@nerdieblaq.xyz"
                className="site-secondary-btn inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold transition"
              >
                Email for Access
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </>
  );
}
