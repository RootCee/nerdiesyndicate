import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from './contractABI';
import './MintingForm.css';
import myImage from './images/myImage.png';

const contractAddress = '0xb9fBFA1c0de2DFC7947C7bbDaD629888461CbE4E';
const pricePerNFT = ethers.utils.parseEther('0.01'); // Price per NFT in ETH

const MintingForm = () => {
  const [quantity, setQuantity] = useState(1);
  const [totalSupply, setTotalSupply] = useState(0);
  const [myBalance, setMyBalance] = useState(0);
  const [maxSupply, setMaxSupply] = useState(0);
  const totalPrice = ethers.utils.formatEther(pricePerNFT.mul(quantity));

  useEffect(() => {
    const fetchContractData = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const totalSupply = await contract.totalSupply();
        const maxSupply = await contract.MAX_SUPPLY();
        const myBalance = await contract.balanceOf(window.ethereum.selectedAddress);
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
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
  
    // Get the user's balance
    const balance = await provider.getBalance(window.ethereum.selectedAddress);
    const cost = ethers.utils.parseEther((0.01 * quantity).toString());
  
    // Check if the user has enough ETH
    if (balance.lt(cost)) {
      alert('You do not have enough ETH to mint this NFT.');
      return;
    }
  
    const tx = await contract.mint(quantity, {
      value: cost // Send the correct amount of ETH
    });
    const receipt = await tx.wait();
    console.log('Transaction receipt', receipt);
  };

  return (
    <div className="centered-form">
      <h1>Nerdie Blaq Syndicate NFT Collection</h1>
      <img src={myImage} alt="My Image" className="my-image" /> {/* Added class name */}
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
        <button type="submit" className="mint-button">Mint NFT</button> {/* Added class name */}
        <button type="button" className="link-button" onClick={() => window.location.href='https://syndicate-wallet-link.vercel.app/'}>Link 6551 NFT Wallet</button>
      </form>
    </div>
  );
};

export default MintingForm; // This should be at the top level, outside the MintingForm function