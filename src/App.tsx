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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-red-900/20">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="w-10 h-10" />
          <span className="text-lg font-bold text-white hidden sm:inline font-display">Nerdie Blaq</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-neutral-400 font-medium">
          {isHome ? (
            <a href="#bot-proof" className="hover:text-white transition">Signals</a>
          ) : (
            <Link to="/" className="hover:text-white transition">Home</Link>
          )}
          <Link to="/academy" className={`hover:text-white transition ${location.pathname === '/academy' ? 'text-white' : ''}`}>Academy</Link>
          <Link to="/vip" className={`hover:text-white transition ${location.pathname === '/vip' ? 'text-white' : ''}`}>VIP Access</Link>
          <Link to="/mint" className={`hover:text-white transition ${location.pathname === '/mint' ? 'text-white' : ''}`}>NFT Mint</Link>
          <Link to="/dashboard" className={`hover:text-white transition ${location.pathname === '/dashboard' ? 'text-white' : ''}`}>Dashboard</Link>
          <a href="https://mirror.xyz/rootcee.eth" className="hover:text-white transition" target="_blank" rel="noopener noreferrer">Blog</a>
        </div>
        <div className="w-10 md:w-auto" />
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
