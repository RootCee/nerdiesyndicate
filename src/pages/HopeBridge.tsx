import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';
import { BUSINESS_CONTACT_EMAIL_PLACEHOLDER } from '../lib/site';

const APP_STORE_URL = 'https://apps.apple.com/us/app/hope-bridge/id6761197972';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.rootcee.hopebridge';
const APP_STORE_BADGE_URL =
  'https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg';
const GOOGLE_PLAY_BADGE_URL =
  'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

const capabilities = [
  {
    title: 'Incident and hotspot mapping',
    description: 'Give authorized teams a shared geographic view of incidents and areas that may need coordinated attention.',
  },
  {
    title: 'Outreach triage tracking',
    description: 'Organize outreach activity, priorities, and follow-up work in one focused mobile workflow.',
  },
  {
    title: 'Risk screening tools',
    description: 'Support consistent field assessment and help teams identify cases that require timely follow-up.',
  },
  {
    title: 'Secure team access',
    description: 'Keep operational tools limited to approved organizations, program leaders, and authorized team members.',
  },
] as const;

export default function HopeBridge() {
  const accessEmail = `mailto:${BUSINESS_CONTACT_EMAIL_PLACEHOLDER}?subject=${encodeURIComponent(
    'Hope Bridge Authorized Access Request'
  )}`;

  return (
    <>
      <Seo
        title="Hope Bridge | Community Safety and Outreach Technology"
        description="Hope Bridge helps authorized outreach teams, community organizations, and public-safety partners coordinate response, track follow-ups, and identify high-risk areas."
        path="/hope-bridge"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Hope Bridge',
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: 'iOS, Android',
            description:
              'A mobile community safety and outreach coordination tool for authorized program members.',
            url: 'https://nerdieblaq.xyz/hope-bridge',
          },
        ]}
      />

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_34%),linear-gradient(180deg,_rgba(9,9,11,0.96),_#09090b)]" />
          <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-sky-400/20 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.24),_rgba(5,7,10,0.96))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.34)]">
              <div className="text-center">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/15 bg-white/10 text-5xl font-black tracking-tight text-white shadow-[0_18px_50px_rgba(14,165,233,0.2)]">
                  HB
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                  Community Technology
                </p>
              </div>
            </div>

            <div>
              <span className="inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                Community Safety + Outreach
              </span>
              <h1 className="mt-6 text-5xl font-bold text-white md:text-7xl">Hope Bridge</h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-300">
                Hope Bridge is a mobile coordination tool created to help outreach teams, community organizations,
                and public-safety partners organize response, track follow-ups, and identify high-risk areas using
                real-time incident information.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-400">
                The application is intended for authorized program members. Organizations interested in evaluating
                Hope Bridge can contact the Nerdie Blaq team to discuss access and onboarding.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={accessEmail}
                  className="site-primary-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition"
                >
                  Request Access
                </a>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Hope Bridge on the App Store"
                >
                  <img src={APP_STORE_BADGE_URL} alt="Download on the App Store" className="h-11 w-auto" />
                </a>
                <a
                  href={GOOGLE_PLAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get Hope Bridge on Google Play"
                >
                  <img src={GOOGLE_PLAY_BADGE_URL} alt="Get it on Google Play" className="h-14 w-auto" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Purpose-Built Workflow</p>
              <h2 className="mt-5 text-4xl font-bold text-white md:text-5xl">Built for coordinated outreach.</h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-400 md:text-lg">
                Hope Bridge brings essential field and follow-up workflows into a focused mobile experience designed
                around collaboration, accountability, and timely response.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {capabilities.map((capability) => (
                <article key={capability.title} className="site-card rounded-[28px] p-6 md:p-7">
                  <h3 className="text-2xl font-bold text-white">{capability.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-400 md:text-base">
                    {capability.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 pt-8">
          <div className="mx-auto max-w-5xl rounded-[32px] border border-sky-400/20 bg-[linear-gradient(135deg,_rgba(14,165,233,0.14),_rgba(9,9,11,0.92),_rgba(16,185,129,0.1))] p-8 text-center md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Authorized Access</p>
            <h2 className="mt-5 text-4xl font-bold text-white md:text-5xl">Bring Hope Bridge to your organization.</h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-neutral-300 md:text-lg">
              Contact us to discuss program fit, approved team access, and onboarding. Hope Bridge is not an emergency
              response service; urgent situations should always be directed to the appropriate local emergency services.
            </p>
            <a
              href={accessEmail}
              className="site-primary-btn mt-8 inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold transition"
            >
              Contact Hope Bridge
            </a>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </>
  );
}
