import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';
import { BUSINESS_CONTACT_EMAIL_PLACEHOLDER, LEGAL_ENTITY_NAME } from '../lib/site';

const supportTopics = [
  'Account and profile help',
  'Billing and App Store subscription questions',
  'Subscription cancellation guidance',
  'Technical issues and bug reports',
  'Apple Health sync questions',
  'Workout tracking and progress logging help',
] as const;

export default function Support() {
  return (
    <>
      <Seo
        title="Nerdie Blaq Fit Support | Nerdie Blaq"
        description="Get Nerdie Blaq Fit support for account, billing, subscription, technical, Apple Health, workout tracking, and progress tracking questions."
        path="/support"
        canonicalPath="/support"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Nerdie Blaq Fit Support',
            description:
              'Support page for Nerdie Blaq Fit account, billing, subscription, technical, Apple Health, and workout tracking help.',
            url: 'https://nerdieblaq.xyz/support',
          },
        ]}
      />

      <section className="relative overflow-hidden px-4 pb-12 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.2),_transparent_42%),linear-gradient(180deg,_rgba(9,9,11,0.96),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
              Support
            </span>
            <h1 className="mt-6 text-5xl text-white md:text-7xl">Nerdie Blaq Fit Support</h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-neutral-300 md:text-lg">
              Need help with Nerdie Blaq Fit? Contact {LEGAL_ENTITY_NAME} for account, billing,
              subscription, technical, Apple Health, workout tracking, or progress tracking support.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-red-900/20 bg-zinc-900/90 p-7 shadow-[0_0_35px_rgba(127,29,29,0.12)]">
              <p className="text-sm uppercase tracking-[0.24em] text-red-300">Support Email</p>
              <a
                href={`mailto:${BUSINESS_CONTACT_EMAIL_PLACEHOLDER}`}
                className="mt-4 block break-words text-3xl font-bold text-white transition hover:text-red-200 md:text-4xl"
              >
                {BUSINESS_CONTACT_EMAIL_PLACEHOLDER}
              </a>
              <p className="mt-5 text-sm leading-relaxed text-neutral-400">
                For App Store billing or subscription issues, include the email tied to your Apple ID
                if you are comfortable sharing it. Do not send passwords, private keys, or sensitive
                health details by email.
              </p>
            </div>

            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-7">
              <h2 className="text-2xl font-bold text-white">We can help with</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {supportTopics.map((topic) => (
                  <div key={topic} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-neutral-300">
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </>
  );
}
