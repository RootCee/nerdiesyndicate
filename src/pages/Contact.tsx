import Seo from '../components/Seo';
import PublicSiteFooter from '../components/PublicSiteFooter';
import { BUSINESS_CONTACT_EMAIL_PLACEHOLDER } from '../lib/site';

export default function Contact() {
  return (
    <>
      <Seo
        title="Contact | Nerdie Blaq Clubhouse"
        description="Contact Nerdie Blaq Clubhouse for support, business inquiries, or general questions."
        path="/contact"
        canonicalPath="/contact"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contact',
            url: 'https://nerdieblaq.xyz/contact',
            description: 'Contact page for Nerdie Blaq Clubhouse.',
          },
        ]}
      />

      <section className="relative overflow-hidden px-4 pb-12 pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(153,27,27,0.2),_transparent_42%),linear-gradient(180deg,_rgba(9,9,11,0.96),_#09090b)]" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-8 text-center shadow-[0_0_35px_rgba(24,24,27,0.28)] md:p-12">
            <span className="inline-block rounded-full border border-red-800/40 bg-red-900/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-red-300">
              Contact
            </span>
            <h1 className="mt-6 text-5xl text-white md:text-7xl">Contact</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-300 md:text-lg">
              For support, business inquiries, or questions, reach out directly:
            </p>
            <p className="mt-6">
              <a
                href={`mailto:${BUSINESS_CONTACT_EMAIL_PLACEHOLDER}`}
                className="text-lg font-semibold text-red-300 underline decoration-red-800/60 underline-offset-4 transition hover:text-white"
              >
                {BUSINESS_CONTACT_EMAIL_PLACEHOLDER}
              </a>
            </p>
          </div>
        </div>
      </section>

      <PublicSiteFooter />
    </>
  );
}
