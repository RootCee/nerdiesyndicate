import type { ReactNode } from 'react';
import Seo from '../components/Seo';
import { BUSINESS_CONTACT_EMAIL_PLACEHOLDER, LEGAL_ENTITY_NAME } from '../lib/site';
import PublicSiteFooter from '../components/PublicSiteFooter';

function TermsSection({
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

export default function Terms() {
  return (
    <>
      <Seo
        title="Terms of Service | Nerdie Blaq Fit"
        description="Read the Nerdie Blaq Fit Terms of Service covering fitness and nutrition disclaimers, App Store subscriptions, auto-renewal, cancellation, content rights, and support contact details."
        path="/terms"
        canonicalPath="/terms"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Nerdie Blaq Fit Terms of Service',
            url: 'https://nerdieblaq.xyz/terms',
            description:
              'Terms of Service for Nerdie Blaq Fit and Nerdie Blaq Clubhouse LLC.',
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
            <h1 className="mt-6 text-5xl text-white md:text-7xl">Terms of Service</h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-neutral-300 md:text-lg">
              Welcome to Nerdie Blaq Clubhouse, operated by {LEGAL_ENTITY_NAME} (&ldquo;we,&rdquo;
              &ldquo;our,&rdquo; or &ldquo;us&rdquo;). By accessing or using this platform, you
              agree to the following terms, including the terms that apply to Nerdie Blaq Fit.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-500">
              Effective Date: May 12, 2026
            </p>
          </div>

          <div className="mt-12 grid gap-6">
            <TermsSection title="1. Use of the Platform">
              <p>
                You agree to use the platform only for lawful purposes and in a way that does not
                harm the platform or other users.
              </p>
            </TermsSection>

            <TermsSection title="2. No Financial Advice">
              <p>
                Trading signals and market information are provided for informational and educational
                purposes only and are not financial advice.
              </p>
              <p>
                Nothing on this platform constitutes financial, investment, or trading advice. You
                are solely responsible for your own decisions.
              </p>
            </TermsSection>

            <TermsSection title="3. Fitness and Nutrition Guidance">
              <p>
                Nerdie Blaq Fit may provide workout, fitness, nutrition, meal, progress, and wellness
                guidance. This content is for informational and educational purposes only and is not
                medical advice, diagnosis, or treatment.
              </p>
              <p>
                Consult a qualified medical professional before starting a workout program, changing
                your nutrition, or making health-related decisions, especially if you have any medical
                condition, injury, or concern.
              </p>
              <p>
                You are responsible for exercising safely, using proper form, stopping if you feel
                pain, dizziness, or distress, and choosing activity levels appropriate for your body.
              </p>
            </TermsSection>

            <TermsSection title="4. Subscriptions and App Store Billing">
              <p>
                Nerdie Blaq Fit subscriptions are handled through Apple App Store billing. Subscription
                purchases, renewals, cancellations, refunds, and payment methods are managed by Apple
                under Apple&apos;s applicable terms and policies.
              </p>
              <p>
                Subscriptions may auto-renew unless canceled through your Apple ID settings before the
                renewal date. You can manage or cancel subscriptions in your Apple ID subscription
                settings.
              </p>
            </TermsSection>

            <TermsSection title="5. Digital Products and Services">
              <p>
                We may offer digital products, music, NFTs, or merchandise.
              </p>
              <p>
                All sales are final unless otherwise stated. Delivery and fulfillment may be handled
                by third-party providers.
              </p>
            </TermsSection>

            <TermsSection title="6. Third-Party Platforms">
              <p>
                The site may link to third-party platforms for payments, music streaming, storefronts,
                social channels, wallet providers, and community access. Those services are outside
                our control and may have separate rules, fees, and policies.
              </p>
              <p>
                We are not responsible for the availability, accuracy, or policies of third-party
                services.
              </p>
            </TermsSection>

            <TermsSection title="7. Wallets and Blockchain">
              <p>
                Use of Web3 features requires a compatible wallet.
              </p>
              <p>You are solely responsible for:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Securing your wallet.</li>
                <li>Managing your private keys.</li>
                <li>Any transactions conducted.</li>
              </ul>
              <p>We do not control blockchain networks or transactions.</p>
            </TermsSection>

            <TermsSection title="8. Intellectual Property">
              <p>
                All content, branding, and materials on this platform are owned by or licensed to{' '}
                {LEGAL_ENTITY_NAME} and may not be used without permission.
              </p>
              <p>
                Nerdie Blaq Fit app content, training systems, images, text, designs, branding,
                workout names, and related materials belong to {LEGAL_ENTITY_NAME} or its licensors.
              </p>
            </TermsSection>

            <TermsSection title="9. Limitation of Liability">
              <p>
                The platform is provided &ldquo;as is&rdquo; without warranties of any kind.
              </p>
              <p>
                We are not liable for any losses, damages, or outcomes resulting from use of the
                platform, including trading decisions, fitness activity, nutrition choices,
                subscription management, or third-party interactions.
              </p>
            </TermsSection>

            <TermsSection title="10. Changes to the Platform">
              <p>
                We may modify, update, or discontinue features at any time without notice.
              </p>
            </TermsSection>

            <TermsSection title="11. Updates to Terms">
              <p>
                We may update these Terms at any time. Continued use of the platform indicates
                acceptance.
              </p>
            </TermsSection>

            <TermsSection title="12. Contact">
              <p>
                For questions, contact{' '}
                <a
                  href={`mailto:${BUSINESS_CONTACT_EMAIL_PLACEHOLDER}`}
                  className="text-red-300 underline decoration-red-800/60 underline-offset-4"
                >
                  {BUSINESS_CONTACT_EMAIL_PLACEHOLDER}
                </a>
                .
              </p>
            </TermsSection>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </>
  );
}
