import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, ConnectButton, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './lib/wagmi';
import logo from './images/logo.png';
import Home from './pages/Home';
import Mint from './pages/Mint';
import Vip from './pages/Vip';
import Dashboard from './pages/Dashboard';
import Academy from './pages/Academy';

const queryClient = new QueryClient();

function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    {
      key: 'signals',
      label: 'Signals',
      href: isHome ? '#bot-proof' : '/',
      external: false,
      active: isHome,
    },
    {
      key: 'academy',
      label: 'Academy',
      href: '/academy',
      external: false,
      active: location.pathname === '/academy',
    },
    {
      key: 'vip',
      label: 'VIP Access',
      href: '/vip',
      external: false,
      active: location.pathname === '/vip',
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-red-900/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="w-10 h-10" />
          <span className="hidden text-xl text-white sm:inline font-brand">Nerdie Blaq</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-neutral-400 font-medium">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.key}
                href={link.href}
                className="hover:text-white transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ) : link.key === 'signals' && isHome ? (
              <a key={link.key} href={link.href} className="hover:text-white transition">
                {link.label}
              </a>
            ) : (
              <Link
                key={link.key}
                to={link.href}
                className={`hover:text-white transition ${link.active ? 'text-white' : ''}`}
              >
                {link.key === 'signals' && !isHome ? 'Home' : link.label}
              </Link>
            )
          )}
        </div>
        <div className="w-10 md:w-auto" />
        </div>

        <div className="mt-3 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:border-zinc-700 hover:text-white"
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
          <div className="md:hidden mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl">
            <div className="flex flex-col">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileMenu}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-neutral-300 transition hover:bg-zinc-900 hover:text-white"
                  >
                    {link.label}
                  </a>
                ) : link.key === 'signals' && isHome ? (
                  <a
                    key={link.key}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="rounded-xl px-3 py-3 text-sm font-medium text-white transition hover:bg-zinc-900"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.key}
                    to={link.href}
                    onClick={closeMobileMenu}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-zinc-900 hover:text-white ${
                      link.active ? 'text-white bg-zinc-900/80' : 'text-neutral-300'
                    }`}
                  >
                    {link.key === 'signals' && !isHome ? 'Home' : link.label}
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#991b1b',
            accentColorForeground: 'white',
            borderRadius: 'large',
          })}
        >
          <BrowserRouter>
            <div className="scroll-smooth">
              <Navbar />

              <div className="fixed top-3 right-4 z-50">
                <ConnectButton
                  showBalance={false}
                  chainStatus="icon"
                  accountStatus="address"
                />
              </div>

              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/lander" element={<Home />} />
                <Route path="/academy" element={<Academy />} />
                <Route path="/mint" element={<Mint />} />
                <Route path="/vip" element={<Vip />} />
                <Route path="/dashboard" element={<Dashboard />} />
              </Routes>
            </div>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
