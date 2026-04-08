import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import logo from './images/logo.png';
import Home from './pages/Home';
import Mint from './pages/Mint';
import Vip from './pages/Vip';
import Dashboard from './pages/Dashboard';
import Academy from './pages/Academy';
import Merch from './pages/Merch';
import Music from './pages/Music';
import Businesses from './pages/Businesses';
import Ecosystem from './pages/Ecosystem';
import MusicThankYou from './pages/MusicThankYou';
import MusicCheckoutCancelled from './pages/MusicCheckoutCancelled';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Disclaimer from './pages/Disclaimer';
import Contact from './pages/Contact';

function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      key: 'clubhouse',
      label: 'Nerdie Blaq Clubhouse',
      href: '/',
      external: false,
      active:
        location.pathname === '/' ||
        location.pathname === '/clubhouse' ||
        location.pathname === '/lander',
    },
    {
      key: 'ecosystem',
      label: 'Ecosystem',
      href: '/ecosystem',
      external: false,
      active: location.pathname === '/ecosystem',
    },
    {
      key: 'academy',
      label: 'Academy',
      href: '/academy',
      external: false,
      active: location.pathname === '/academy',
    },
    {
      key: 'businesses',
      label: 'Businesses',
      href: '/businesses',
      external: false,
      active: location.pathname === '/businesses',
    },
    {
      key: 'music',
      label: 'Music',
      href: '/music',
      external: false,
      active: location.pathname === '/music',
    },
    {
      key: 'merch',
      label: 'Merch',
      href: '/merch',
      external: false,
      active: location.pathname === '/merch',
    },
    {
      key: 'mint',
      label: 'NFT Mint',
      href: '/mint',
      external: false,
      active: location.pathname === '/mint',
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      external: false,
      active: location.pathname === '/dashboard',
    },
    {
      key: 'blog',
      label: 'Blog',
      href: 'https://mirror.xyz/rootcee.eth',
      external: true,
      active: false,
    },
  ] as const;

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <nav className="site-nav fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-10 h-10" />
            <span className="hidden text-xl text-white sm:inline font-brand">Nerdie Blaq</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.key}
                  href={link.href}
                  className="site-nav-link transition"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.key}
                  to={link.href}
                  className={`site-nav-link transition ${link.active ? 'site-nav-link-active' : ''}`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>
          <div className="w-10 md:w-auto" />
        </div>

        <div className="mt-3 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="site-secondary-btn inline-flex min-w-[140px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
            <span>{mobileMenuOpen ? 'Close Menu' : 'Open Menu'}</span>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="site-mobile-shell md:hidden mt-3 rounded-2xl p-3 shadow-2xl">
            <div className="flex flex-col">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileMenu}
                    className="rounded-xl px-3 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-black/20 hover:text-white"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.key}
                    to={link.href}
                    onClick={closeMobileMenu}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-black/20 hover:text-white ${
                      link.active ? 'text-white bg-black/20' : 'text-neutral-200'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lander" element={<Home seoPath="/lander" canonicalPath="/" />} />
      <Route path="/clubhouse" element={<Home seoPath="/clubhouse" canonicalPath="/" />} />
      <Route path="/ecosystem" element={<Ecosystem />} />
      <Route path="/academy" element={<Academy />} />
      <Route path="/businesses" element={<Businesses />} />
      <Route path="/music" element={<Music />} />
      <Route path="/music/thank-you" element={<MusicThankYou />} />
      <Route path="/music/checkout-cancelled" element={<MusicCheckoutCancelled />} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/mint" element={<Mint />} />
      <Route path="/vip" element={<Vip />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export function AppShell({
  showConnectButton = true,
  connectButton = null,
}: {
  showConnectButton?: boolean;
  connectButton?: ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div className="site-shell scroll-smooth">
      <Navbar />

      {showConnectButton && isHydrated ? (
        <div className="fixed top-3 right-4 z-50">{connectButton}</div>
      ) : null}

      <AppRoutes />
    </div>
  );
}
