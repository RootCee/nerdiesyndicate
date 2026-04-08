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
        title="Terms of Service | Nerdie Blaq Clubhouse"
        description="Read the Terms of Service for Nerdie Blaq Clubhouse and Nerdie Blaq LLC, including site use rules, disclaimers, third-party links, digital products, and limitation of liability."
        path="/terms"
        canonicalPath="/terms"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Terms of Service',
            url: 'https://nerdieblaq.xyz/terms',
            description:
              'Terms of Service for Nerdie Blaq Clubhouse and Nerdie Blaq LLC.',
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
              agree to the following terms.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-500">
              Effective Date: April 8, 2026
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

            <TermsSection title="3. Digital Products and Services">
              <p>
                We may offer digital products, music, NFTs, or merchandise.
              </p>
              <p>
                All sales are final unless otherwise stated. Delivery and fulfillment may be handled
                by third-party providers.
              </p>
            </TermsSection>

            <TermsSection title="4. Third-Party Platforms">
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

            <TermsSection title="5. Wallets and Blockchain">
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

            <TermsSection title="6. Intellectual Property">
              <p>
                All content, branding, and materials on this platform are owned by or licensed to{' '}
                {LEGAL_ENTITY_NAME} and may not be used without permission.
              </p>
            </TermsSection>

            <TermsSection title="7. Limitation of Liability">
              <p>
                The platform is provided &ldquo;as is&rdquo; without warranties of any kind.
              </p>
              <p>
                We are not liable for any losses, damages, or outcomes resulting from use of the
                platform, including trading decisions or third-party interactions.
              </p>
            </TermsSection>

            <TermsSection title="8. Changes to the Platform">
              <p>
                We may modify, update, or discontinue features at any time without notice.
              </p>
            </TermsSection>

            <TermsSection title="9. Updates to Terms">
              <p>
                We may update these Terms at any time. Continued use of the platform indicates
                acceptance.
              </p>
            </TermsSection>

            <TermsSection title="10. Contact">
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
