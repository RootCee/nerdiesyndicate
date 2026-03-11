import { ethers } from 'ethers';
import { Link } from 'react-router-dom';
import MintingForm from '../MintingForm';
import abi from '../contractABI';
import twitter from '../images/twitter.png';
import discord from '../images/discord.png';
import telegram from '../images/telegram.png';
import instagram from '../images/instagram.png';

const handleMint = async (quantity: number): Promise<ethers.ContractTransaction> => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error("MetaMask not detected");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const userAddress = await signer.getAddress();

  const contract = new ethers.Contract('0x4d410D24fAcd00EB9470d4261db855b57c9CDc0e', abi, signer);
  const pricePerNFT = ethers.utils.parseEther("0.01");
  const valueToSend = pricePerNFT.mul(quantity);

  try {
    const tx = await contract.mint(userAddress, quantity, {
      value: valueToSend,
    });
    return tx;
  } catch (err) {
    console.error('Error minting NFT:', err);
    throw err;
  }
};

export default function Mint() {
  return (
    <>
      {/* Hero / Intro */}
      <section className="pt-28 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-sm text-neutral-500 hover:text-white transition mb-6 inline-block">
            &larr; Back to Signals
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Nerdie Syndicate <span className="text-red-700">NFT</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            200 unique ERC-6551 NFTs on Base. Each one is your key to the advanced
            Nerdie Blaq Signals dashboard, exclusive holder events, and the Nerdie City alpha pass.
          </p>
        </div>
      </section>

      {/* NFT Utility */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="bg-zinc-900 border border-red-900/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">What You Unlock</h2>
            <ul className="space-y-4">
              {[
                { title: "Signal Dashboard", desc: "Full access to the advanced Nerdie Blaq Signals dashboard with real-time data." },
                { title: "ERC-6551 Token-Bound Wallet", desc: "Each NFT has its own wallet. Link it to manage assets directly." },
                { title: "Nerdie City Alpha Pass", desc: "Early access to Nerdie City, the 3D blockchain game." },
                { title: "Exclusive Events", desc: "Virtual competitions, chess battles, rap battles, and coding courses." },
                { title: "Community Marketplace", desc: "Access to the Nerdie Blaq marketplace for trading and staking." },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="text-red-600 mt-1 text-lg">&#10003;</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-neutral-500 text-sm">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Mint Form */}
          <div className="nft-mint-embed">
            <MintingForm onMint={handleMint} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">How to Mint</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Connect Wallet", desc: "Click the Connect Wallet button in the top right. MetaMask, Coinbase, or any supported wallet." },
              { step: "2", title: "Choose Quantity", desc: "Select how many NFTs you want to mint (1-5). Each costs 0.01 ETH on Base." },
              { step: "3", title: "Mint & Unlock", desc: "Confirm the transaction. Once minted, you can link your ERC-6551 wallet and access the dashboard." },
            ].map((item) => (
              <div key={item.step} className="bg-zinc-900 border border-red-900/20 rounded-2xl p-6 text-center">
                <div className="w-10 h-10 bg-red-800 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-neutral-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-12 px-4 text-center">
        <div className="flex justify-center items-center gap-6 mb-8">
          <a href="https://twitter.com/rootcee" target="_blank" rel="noopener noreferrer">
            <img src={twitter} alt="Twitter" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
          <a href="https://discord.com/invite/S874axwJyY" target="_blank" rel="noopener noreferrer">
            <img src={discord} alt="Discord" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
          <a href="https://t.me/+RPRDDLSZWSk3ZjZh" target="_blank" rel="noopener noreferrer">
            <img src={telegram} alt="Telegram" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
          <a href="https://instagram.com/rootcee_" target="_blank" rel="noopener noreferrer">
            <img src={instagram} alt="Instagram" className="w-8 h-8 opacity-60 hover:opacity-100 transition" />
          </a>
        </div>
        <p className="text-neutral-600 text-sm">&copy; 2025 Nerdie Blaq. All rights reserved.</p>
      </section>
    </>
  );
}
