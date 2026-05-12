import type { ReactNode } from 'react';
import Seo from '../components/Seo';
import {
  BUSINESS_CONTACT_EMAIL_PLACEHOLDER,
  FARCASTER_URL,
  LEGAL_ENTITY_NAME,
} from '../lib/site';
import PublicSiteFooter from '../components/PublicSiteFooter';

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-zinc-800 bg-zinc-900/85 p-6 shadow-[0_0_24px_rgba(24,24,27,0.2)] md:p-8">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-400 md:text-base">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <>
      <Seo
        title="Privacy Policy | Nerdie Blaq Fit"
        description="Read the Nerdie Blaq Fit Privacy Policy covering account data, workout, nutrition, progress data, optional Apple Health data, App Store subscriptions, and support contact details."
        path="/privacy"
        canonicalPath="/privacy"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Nerdie Blaq Fit Privacy Policy',
            url: 'https://nerdieblaq.xyz/privacy',
            description:
              'Privacy Policy for Nerdie Blaq Fit and Nerdie Blaq Clubhouse LLC.',
          },
        ]}
      />

      <section className="relative overflow-hidden px-4 pb-12 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.2),_transparent_42%),linear-gradient(180deg,_rgba(9,9,11,0.96),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
              Legal
            </span>
            <h1 className="mt-6 text-5xl text-white md:text-7xl">Privacy Policy</h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-neutral-300 md:text-lg">
              {LEGAL_ENTITY_NAME} (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;)
              operates the Nerdie Blaq Clubhouse platform. This Privacy Policy explains how we
              collect, use, and protect your information when you use our website, Nerdie Blaq Fit,
              and related services.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-500">
              Effective Date: May 12, 2026
            </p>
          </div>

          <div className="mt-12 grid gap-6">
            <PolicySection title="1. Information We Collect">
              <p>
                We may collect:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Basic information you provide, such as name or email if submitted.</li>
                <li>Account and profile data used to create or manage Nerdie Blaq Fit access.</li>
                <li>Wallet addresses when connecting a Web3 wallet.</li>
                <li>Workout, nutrition, progress, check-in, and training history data entered in Nerdie Blaq Fit.</li>
                <li>Optional Apple Health data, if you choose to connect Apple Health sync.</li>
                <li>Usage data such as pages visited and interactions.</li>
                <li>Analytics data collected through third-party services.</li>
              </ul>
              <p>
                We do not collect sensitive personal information unless voluntarily provided or
                authorized by you through app permissions.
              </p>
            </PolicySection>

            <PolicySection title="2. How We Use Information">
              <p>
                We use collected information to:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Improve the website and user experience.</li>
                <li>Provide access to features and services.</li>
                <li>Deliver Nerdie Blaq Fit app functionality, including workout planning, exercise tracking, meal guidance, progress tracking, and Apple Health sync.</li>
                <li>Process transactions through third-party platforms.</li>
                <li>Communicate updates or relevant information.</li>
              </ul>
            </PolicySection>

            <PolicySection title="3. Apple Health Data">
              <p>
                Apple Health data is optional and is used only when you grant permission through
                Apple Health. Nerdie Blaq Fit may use authorized Health data to support app
                functionality such as activity context, workout tracking, progress views, and sync
                features.
              </p>
              <p>
                Health data is only used for app functionality and is never sold. We do not use
                Apple Health data for advertising or share it with data brokers.
              </p>
            </PolicySection>

            <PolicySection title="4. Subscriptions and Payments">
              <p>
                Nerdie Blaq Fit subscriptions and payments are handled by Apple through App Store
                billing. We do not receive or store full payment card details for App Store
                subscriptions.
              </p>
            </PolicySection>

            <PolicySection title="5. Third-Party Services">
              <p>
                We may use third-party services such as payment processors, analytics providers, and
                external platforms, including Apple App Store billing, Apple Health, storefronts, and
                streaming services.
              </p>
              <p>
                These services operate under their own privacy policies, and we are not responsible
                for their practices.
              </p>
            </PolicySection>

            <PolicySection title="6. Cookies and Tracking">
              <p>
                We may use cookies or similar technologies to understand usage and improve
                performance.
              </p>
            </PolicySection>

            <PolicySection title="7. Data Security">
              <p>
                We take reasonable measures to protect information but cannot guarantee absolute
                security.
              </p>
            </PolicySection>

            <PolicySection title="8. External Links">
              <p>
                Our platform may contain links to external websites. We are not responsible for
                their content or privacy practices.
              </p>
            </PolicySection>

            <PolicySection title="9. Your Choices">
              <p>
                You may choose not to provide certain information or disconnect your wallet at any
                time.
              </p>
              <p>
                You can manage Apple Health permissions in the Health app or iOS Settings. You can
                manage App Store subscriptions through your Apple ID settings.
              </p>
            </PolicySection>

            <PolicySection title="10. Updates">
              <p>
                We may update this Privacy Policy from time to time. Continued use of the site
                indicates acceptance of updates.
              </p>
            </PolicySection>

            <PolicySection title="11. Contact">
              <p>
                For questions, contact {LEGAL_ENTITY_NAME} at{' '}
                <a
                  href={`mailto:${BUSINESS_CONTACT_EMAIL_PLACEHOLDER}`}
                  className="text-red-300 underline decoration-red-800/60 underline-offset-4"
                >
                  {BUSINESS_CONTACT_EMAIL_PLACEHOLDER}
                </a>
                .
              </p>
              <p>
                Official public updates are also available on{' '}
                <a
                  href={FARCASTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-300 underline decoration-red-800/60 underline-offset-4"
                >
                  Farcaster
                </a>
                .
              </p>
            </PolicySection>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </>
  );
}
