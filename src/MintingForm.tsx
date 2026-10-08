import { useState, type FormEvent } from 'react';
import './MintingForm.css';
import myImage from './images/myImage.png';
import { useSyndicateMint } from './hooks/useSyndicateMint';

export default function MintingForm() {
  const [quantity, setQuantity] = useState(1);
  const {
    isConnected,
    isOnBase,
    totalSupply,
    maxSupply,
    ownedBalance,
    pricePerNft,
    supplyLoading,
    readError,
    actionError,
    transactionHash,
    transactionPending,
    transactionConfirmed,
    isSwitchingChain,
    switchToBase,
    mint,
  } = useSyndicateMint();
  const totalPrice = (Number(pricePerNft) * quantity).toFixed(2);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    await mint(quantity);
  };

  return (
    <div className="centered-form">
      <h1>Nerdie Blaq Syndicate NFT Collection</h1>
      <img src={myImage} alt="My Image" className="my-image" />
      <form onSubmit={handleSubmit}>
        <label>
          Quantity:
          <select
            value={quantity}
            onChange={(event) => setQuantity(Number.parseInt(event.target.value, 10))}
            disabled={transactionPending}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <p>Total price: {totalPrice} ETH</p>
        <p>
          Total NFTs minted:{' '}
          {supplyLoading ? 'Loading supply...' : `${totalSupply ?? 'Unavailable'} / ${maxSupply ?? 'Unavailable'}`}
        </p>
        <p>Your NFTs: {isConnected ? ownedBalance ?? 'Loading...' : 'Connect wallet'}</p>
        {readError ? <p className="mint-error">Unable to read collection data: {readError}</p> : null}
        {actionError ? <p className="mint-error">{actionError}</p> : null}
        {!isConnected ? (
          <p className="mint-status">Use the Connect Wallet button above to continue.</p>
        ) : !isOnBase ? (
          <button
            type="button"
            className="mint-button"
            onClick={() => void switchToBase()}
            disabled={isSwitchingChain}
          >
            {isSwitchingChain ? 'Switching...' : 'Switch to Base'}
          </button>
        ) : (
          <button
            type="submit"
            className="mint-button"
            disabled={transactionPending || supplyLoading || Boolean(readError)}
          >
            {transactionPending ? 'Minting...' : 'Mint NFT'}
          </button>
        )}
        {transactionHash ? (
          <p className="mint-status">
            {transactionConfirmed ? 'Mint confirmed.' : 'Transaction submitted.'}{' '}
            <a
              href={`https://basescan.org/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on BaseScan
            </a>
          </p>
        ) : null}
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
}
