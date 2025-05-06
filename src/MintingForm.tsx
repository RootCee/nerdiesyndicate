import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from './contractABI';
import './MintingForm.css';
import myImage from './images/myImage.png';

const contractAddress = '0x4d410D24fAcd00EB9470d4261db855b57c9CDc0e';
const pricePerNFT = ethers.utils.parseEther('0.01'); // Price per NFT in ETH

interface MintingFormProps {
  onMint: (quantity: number) => Promise<ethers.ContractTransaction>;
}

const MintingForm: React.FC<MintingFormProps> = ({ onMint }) => {
  const [quantity, setQuantity] = useState(1);
  const [totalSupply, setTotalSupply] = useState(0);
  const [myBalance, setMyBalance] = useState(0);
  const [maxSupply, setMaxSupply] = useState(0);
  const totalPrice = ethers.utils.formatEther(pricePerNFT.mul(quantity));

  useEffect(() => {
    const fetchContractData = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();

        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const totalSupply = await contract.totalSupply();
        const maxSupply = await contract.MAX_SUPPLY();
        const myBalance = await contract.balanceOf(userAddress);

        setTotalSupply(totalSupply.toNumber());
        setMaxSupply(maxSupply.toNumber());
        setMyBalance(myBalance.toNumber());
      }
    };

    fetchContractData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another Ethereum wallet and refresh the page.');
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    const balance = await provider.getBalance(userAddress);
    const cost = ethers.utils.parseEther((0.01 * quantity).toString());

    if (balance.lt(cost)) {
      alert('You do not have enough ETH to mint this NFT.');
      return;
    }

    try {
      const tx = await onMint(quantity);
      const receipt = await tx.wait();
      console.log('Transaction receipt', receipt);
    } catch (error) {
      console.error("Minting failed:", error);
      alert("Minting failed. Check the console for details.");
    }
  };

  return (
    <div className="centered-form">
      <h1>Nerdie Blaq Syndicate NFT Collection</h1>
      <img src={myImage} alt="My Image" className="my-image" />
      <form onSubmit={handleSubmit}>
        <label>
          Quantity:
          <select value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}>
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <p>Total price: {totalPrice} ETH</p>
        <p>Total NFTs minted: {totalSupply} / {maxSupply}</p>
        <p>Your NFTs: {myBalance}</p>
        <button type="submit" className="mint-button">Mint NFT</button>
        <button
          type="button"
          className="link-button"
          onClick={() => window.location.href = 'https://nerdiesyndicatedashboard.vercel.app/'}
        >
          Link 6551 NFT Wallet
        </button>
      </form>
    </div>
  );
};

export default MintingForm;
