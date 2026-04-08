import { Link } from 'react-router-dom';
import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';
import {
  BUSINESS_CONTACT_EMAIL_PLACEHOLDER,
  CLUBHOUSE_NAME,
  FARCASTER_URL,
  LEGAL_ENTITY_NAME,
} from '../lib/site';

const socialLinks = [
  {
    href: 'https://twitter.com/rootcee',
    label: 'Twitter',
    icon: twitter,
  },
  {
    href: 'https://discord.com/invite/S874axwJyY',
    label: 'Discord',
    icon: discord,
  },
  {
    href: 'https://t.me/+RPRDDLSZWSk3ZjZh',
    label: 'Telegram',
    icon: telegram,
  },
  {
    href: 'https://instagram.com/rootcee_',
    label: 'Instagram',
    icon: instagram,
  },
] as const;

export default function PublicSiteFooter() {
  return (
    <section className="px-4 py-14 text-center">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-zinc-800 bg-zinc-900/85 p-8 shadow-[0_0_35px_rgba(24,24,27,0.28)] md:p-10">
        <div className="flex flex-wrap items-center justify-center gap-6">
          {socialLinks.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
              <img src={link.icon} alt={link.label} className="h-8 w-8 opacity-60 transition hover:opacity-100" />
            </a>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/privacy"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
          >
            Terms of Service
          </Link>
          <Link
            to="/disclaimer"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
          >
            Disclaimer
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-neutral-100 transition hover:border-zinc-500 hover:text-white"
          >
            Contact
          </Link>
          <a
            href={FARCASTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-red-800/40 bg-red-900/20 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-900/30 hover:text-white"
          >
            Follow on Farcaster
          </a>
        </div>

        <p className="mt-6 text-sm text-neutral-400">
          {CLUBHOUSE_NAME} is operated by {LEGAL_ENTITY_NAME}.
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          Privacy, terms, and business inquiries: {BUSINESS_CONTACT_EMAIL_PLACEHOLDER}
        </p>
        <p className="mt-4 text-sm text-neutral-600">© {LEGAL_ENTITY_NAME}</p>
      </div>
    </section>
  );
}
