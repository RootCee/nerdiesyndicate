import type { ReactNode } from 'react';
import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';
import { BUSINESS_CONTACT_EMAIL_PLACEHOLDER, LEGAL_ENTITY_NAME } from '../lib/site';

function DisclaimerSection({
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

export default function Disclaimer() {
  return (
    <>
      <Seo
        title="Disclaimer | Nerdie Blaq Clubhouse"
        description="Read the Nerdie Blaq Clubhouse disclaimer covering financial content, Web3 risks, third-party services, and platform liability limits."
        path="/disclaimer"
        canonicalPath="/disclaimer"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Disclaimer',
            url: 'https://nerdieblaq.xyz/disclaimer',
            description: 'Disclaimer for Nerdie Blaq Clubhouse and Nerdie Blaq LLC.',
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
            <h1 className="mt-6 text-5xl text-white md:text-7xl">Disclaimer</h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-neutral-300 md:text-lg">
              Nerdie Blaq Clubhouse is operated by {LEGAL_ENTITY_NAME}.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-500">
              Effective Date: April 8, 2026
            </p>
          </div>

          <div className="mt-12 grid gap-6">
            <DisclaimerSection title="Overview">
              <p>The information provided on this platform is for general informational and educational purposes only.</p>
            </DisclaimerSection>

            <DisclaimerSection title="1. No Financial Advice">
              <p>All trading signals, market insights, and related content are not financial, investment, or trading advice.</p>
              <p>You are solely responsible for your own financial decisions. Always conduct your own research before making any investment.</p>
            </DisclaimerSection>

            <DisclaimerSection title="2. No Guarantees">
              <p>We make no guarantees regarding the accuracy, reliability, or profitability of any information provided.</p>
              <p>Past performance does not guarantee future results.</p>
            </DisclaimerSection>

            <DisclaimerSection title="3. Web3 and Blockchain Risks">
              <p>Use of blockchain technologies, cryptocurrencies, and NFTs involves risk, including volatility, loss of funds, and technical issues.</p>
              <p>Users are fully responsible for managing their own wallets and private keys.</p>
            </DisclaimerSection>

            <DisclaimerSection title="4. Third-Party Services">
              <p>This platform may link to or integrate with third-party services such as payment processors, marketplaces, and streaming platforms.</p>
              <p>We are not responsible for the content, policies, or performance of third-party services.</p>
            </DisclaimerSection>

            <DisclaimerSection title="5. Use at Your Own Risk">
              <p>All use of the platform is at your own risk.</p>
              <p>{LEGAL_ENTITY_NAME} is not liable for any losses, damages, or outcomes resulting from use of this platform.</p>
            </DisclaimerSection>

            <DisclaimerSection title="6. Contact">
              <p>For questions or concerns:</p>
              <p>
                <a
                  href={`mailto:${BUSINESS_CONTACT_EMAIL_PLACEHOLDER}`}
                  className="text-red-300 underline decoration-red-800/60 underline-offset-4"
                >
                  {BUSINESS_CONTACT_EMAIL_PLACEHOLDER}
                </a>
              </p>
            </DisclaimerSection>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </>
  );
}
