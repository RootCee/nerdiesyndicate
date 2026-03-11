import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import logo from './images/logo.png';
import {
  ThirdwebProvider,
  ConnectWallet,
  metamaskWallet,
  coinbaseWallet,
  walletConnect,
  safeWallet,
  embeddedWallet,
  trustWallet,
  zerionWallet,
  bloctoWallet,
  frameWallet,
  rainbowWallet,
  phantomWallet,
} from "@thirdweb-dev/react";
import Home from './pages/Home';
import Mint from './pages/Mint';
import Vip from './pages/Vip';
import Dashboard from './pages/Dashboard';

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
    <ThirdwebProvider
      activeChain="base"
      clientId={import.meta.env.VITE_THIRDWEB_CLIENT_ID}
      supportedWallets={[
        metamaskWallet(),
        coinbaseWallet({ recommended: true }),
        walletConnect(),
        safeWallet({
          personalWallets: [
            metamaskWallet(),
            coinbaseWallet({ recommended: true }),
            walletConnect(),
            embeddedWallet({
              auth: {
                options: ["email", "google", "apple", "facebook"],
              },
            }),
            trustWallet(),
            zerionWallet(),
            bloctoWallet(),
            frameWallet(),
            rainbowWallet(),
            phantomWallet(),
          ],
        }),
        embeddedWallet({
          auth: {
            options: ["email", "google", "apple", "facebook"],
          },
        }),
        trustWallet(),
        zerionWallet(),
        bloctoWallet(),
        frameWallet(),
        rainbowWallet(),
        phantomWallet(),
      ]}
    >
      <BrowserRouter>
        <div className="scroll-smooth">
          <Navbar />

          <div className="fixed top-3 right-4 z-50">
            <ConnectWallet
              theme={"dark"}
              auth={{ loginOptional: true }}
              switchToActiveChain={true}
              modalSize={"wide"}
              welcomeScreen={{
                title: "Welcome To Nerdie Blaq Signals",
                img: {
                  src: "https://i1.sndcdn.com/artworks-BgT0E2U58re2u0jY-E3EOJw-t240x240.jpg",
                  width: 150,
                  height: 150,
                },
              }}
              modalTitleIconUrl="https://i1.sndcdn.com/artworks-BgT0E2U58re2u0jY-E3EOJw-t240x240.jpg"
              showThirdwebBranding={false}
            />
          </div>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mint" element={<Mint />} />
            <Route path="/vip" element={<Vip />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThirdwebProvider>
  );
}

export default App;
