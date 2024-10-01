import { ethers } from 'ethers';
import MintingForm from './MintingForm';
import abi from './contractABI';
// Removed the duplicate imports
import logo from './images/logo.png'; // Adjust the path as needed
import lockin1 from './images/lockin1.png';
import lockin2 from './images/lockin2.png';
import lockin3 from './images/lockin3.png';
import image1 from './images/image1.png';
import image2 from './images/image2.png';
import image3 from './images/image3.png';
import blogpost1 from './images/blogpost1.png';
import blogpost2 from './images/blogpost2.png';
import placeholder from './images/placeholder.png';
import twitter from './images/twitter.png';
import discord from './images/discord.png';
import telegram from './images/telegram.png';
import instagram from './images/instagram.png';
import mainlogo from './images/mainlogo.png';
import { Carousel } from 'react-responsive-carousel';
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
import "react-responsive-carousel/lib/styles/carousel.min.css";

const Header: React.FC = () => {
  // ...same as before...

  return (
    <header>
      <h1>My Header</h1>
    </header>
  );
};
const handleMint = async (quantity: number): Promise<ethers.ContractTransaction> => {
  // This assumes you have MetaMask or another web3 provider enabled
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  // Use your actual contract address
  const contract = new ethers.Contract('0xb9fBFA1c0de2DFC7947C7bbDaD629888461CbE4E', abi, signer);

  try {
    // Define the amount of NFTs to mint and calculate the value of Ether to send
    const pricePerNFT = ethers.utils.parseEther("0.01"); // Change this to the price per NFT in Ether
    const valueToSend = pricePerNFT.mul(quantity);

    // Call the mint function on your contract
    const tx = await contract.mint(quantity, { value: valueToSend });

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    // Return the transaction object
    return tx;
  } catch (err) {
    console.error('Error minting NFT:', err);
    throw err; // Re-throw the error so it can be caught and handled by the caller
  }
};

function Toolbar() {
  return (
    <div className="toolbar">
      <img src={logo} alt="Logo" className="toolbar-logo" />
      <div className="toolbar-tabs">
        <a href="https://www.spatial.io/s/RootCee-Gates-61c67a40a6447c00018eb5e5?share=5226556397810733564" className="toolbar-tab">RootCee Gates</a>
        <a href="https://syndicate-wallet-link.vercel.app/" className="toolbar-tab">Syndicate NFT Wallet</a>
        <a href="https://mirror.xyz/rootcee.eth" className="toolbar-tab">Blog</a>
        <a href="https://nerdiemerch.company.site/products/" className="toolbar-tab">Merch</a>
        <a href="add_site" className="toolbar-tab">Marketplace (Coming Soon)</a>
        <a href="https://linkup.top/rootee" className="toolbar-tab">Links</a>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
    <Toolbar />
    <ThirdwebProvider
      activeChain="optimism"
      clientId="2d743b51e09ce76dd604f51a067a3b4c"
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
                options: [
                  "email",
                  "google",
                  "apple",
                  "facebook",
                ],
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
            options: [
              "email",
              "google",
              "apple",
              "facebook",
            ],
          },
        }),
        trustWallet(),
        zerionWallet(),
        bloctoWallet(),
        frameWallet(),
        rainbowWallet(),
        phantomWallet(),
      ]}
      authConfig={{
        authUrl: "/api/auth",
        domain: "https://example.com",
      }}
    >
      <ConnectWallet
        theme={"dark"}
        auth={{ loginOptional: true }}
        switchToActiveChain={true}
        modalSize={"wide"}
        welcomeScreen={{
          title:
            "Welcome To The Nerdie Blaq Clubhouse",
          img: {
            src: "https://i1.sndcdn.com/artworks-BgT0E2U58re2u0jY-E3EOJw-t240x240.jpg",
            width: 150,
            height: 150,
          },
        }}
        modalTitleIconUrl={
          "https://i1.sndcdn.com/artworks-BgT0E2U58re2u0jY-E3EOJw-t240x240.jpg"
        }
        showThirdwebBranding={false}
      />
    </ThirdwebProvider>
<MintingForm onMint={handleMint} />
    <div className="about-us">
      <img src={mainlogo} alt="Main Logo" className="main-logo" />
      <h2>About Us</h2>
      <p>Welcome to the Nerdie Blaq Clubhouse, the hub of innovation, creativity, and education in the decentralized finance (DeFi) space. Founded by the visionary mind of RootCee, Nerdie Blaq is a pioneering project that converges music, merchandise, art, and educational resources, all within the realm of blockchain technology. From virtual live events that bring together enthusiasts from around the globe to a vibrant NFT community where digital art comes to life, Nerdie Blaq offers a dynamic and engaging experience for all. Join us at the Nerdie Blaq Clubhouse and embark on a journey of discovery, creativity, and empowerment. Together, we'll unlock the potential of blockchain technology and pave the way for a brighter, decentralized future.</p>

      <h2>Blaq Token</h2>
      <p>Our native token, Nerdie Blaq Token (NBT), is an essential part of our ecosystem with a total supply of 432 billion tokens, deployed on the Base Network. NBT Tokens are designed to empower our community members with exclusive access, governance, and participation in minting activities within the Nerdie Blaq Clubhouse.</p>
      <p>Use NBT Tokens to:</p>
      <ul>
        <li>Access Exclusive Areas: Unlock token-gated areas where only token holders can enter.</li>
        <li>Participate in Governance: Have a voice in key decisions and vote on important matters within the clubhouse.</li>
        <li>Mint New Offerings: Be the first to mint and acquire new and exciting assets we offer.</li>
      </ul>
      <p>For trading and more details, visit our token on Uniswap.</p>
      <a href="https://www.omnipump.io/token/0x3c7813aaa4683c344afab0ae23f6a3c5442f820f" target="_blank" rel="noopener noreferrer">
        <button style={{ color: 'white', backgroundColor: 'red', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}>
          Buy Here
        </button>
      </a>
      <a href="https://basescan.org/address/0x3c7813aaa4683c344afab0ae23f6a3c5442f820f" target="_blank" rel="noopener noreferrer">
        <button style={{ color: 'white', backgroundColor: 'red', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '20px' }}>
          View on BaseScan
        </button>
      </a>
    </div>
        <iframe src="https://embed.sound.xyz/v1/playlist/e26f8026-a86b-4613-90db-ef0e693b29ab/dark" style={{borderRadius: '8px', boxShadow: '0px 6px 16px 1px rgba(0, 0, 0, 0.08)'}} width="100%" height="355px" allow="clipboard-write" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>

        <Carousel showThumbs={false} autoPlay={true} infiniteLoop={true} showArrows={false} showStatus={false} showIndicators={false}>
  <div>
    <a href="https://nerdiemerch.company.site/products/Lock-in-Hoodie-p699195941">
      <img src={lockin1} alt="Item 1" style={{ width: '20%', height: 'auto' }} />
      <p>Lock In Hoodie</p>
    </a>
    <a href="https://nerdiemerch.company.site/products/Lock-in-Hoodie-p699195941">
    <button type="button" className="circle-button">Shop Now</button>
    </a>
  </div>
  <div>
    <a href="https://nerdiemerch.company.site/products/Lock-in-Hoodie-p699195941">
      <img src={lockin2} alt="Item 2" style={{ width: '20%', height: 'auto' }} />
      <p>Lock In Hoodie</p>
    </a>
    <a href="https://nerdiemerch.company.site/products/Lock-in-Hoodie-p699195941">
    <button type="button" className="circle-button">Shop Now</button>
    </a>
  </div>
  <div>
    <a href="https://nerdiemerch.company.site/products/Lock-in-Hoodie-p699195941">
      <img src={lockin3} alt="Item 3" style={{ width: '20%', height: 'auto' }} />
      <p>Lock In Hoddie</p>
    </a>
    <a href="https://nerdiemerch.company.site/products/Lock-in-Hoodie-p699195941">
    <button type="button" className="circle-button">Shop Now</button>
    </a>
  </div>
</Carousel>

<div className="nerdie-syndicate-section" id="nerdie-syndicate-section">
  <h2>Nerdie Blaq Syndicate</h2>
  <p>The Mob where innovation meets community in the world of blockchain and gaming. Our project features 404 unique ERC-6551 NFTs, each embodying a mafia-style character with its own story and secrets. Holders gain access to the Nerdie Blaq Clubhouse, exclusive virtual events, and even an alpha pass to Nerdie City, our 3D blockchain game. Join us for chess competitions, rap battles, coding courses, and more as we build a collaborative community driven by passion and learning.</p>
</div>

<div className="image-container">
  <div className="image-item">
    <a href="/images/image1.jpg">
    <img src={image1} alt="Description of image 1" />
    </a>
    <p>Unlock the secrets of the underworld with our exclusive mafia-inspired NFT collection. Join the Syndicate and become part of a community like no other.</p>
  </div>
  <div className="image-item">
    <a href="/images/image2.jpg">
    <img src={image2} alt="Description of image 2" />
    </a>
    <p>Immerse yourself in a world where code is law and every move counts. From chess battles to 3D blockchain adventures, the possibilities are endless. Discover the thrill of the Nerdie Blaq Syndicate today</p>
  </div>
  <div className="image-item">
    <a href="/images/image3.jpg">
    <img src={image3} alt="Description of image 3" />
    </a>
    <p>Step into the shadows and embrace the unknown with our autonomous agents and cryptic puzzles. Join us on a journey of discovery and empowerment in the Nerdie Blaq Syndicate.</p>
  </div>
</div>

<div className="roadmap-section">
  <h2 className="roadmap-title">Roadmap</h2>
  <ul className="roadmap-list">
    <li>
      <h2>Foundation Phase:</h2>
      <ul>
        <li>Build the Nerdie Blaq website and promote the project.</li>
        <li>Develop ERC-6551 registry accounts and connect to the site for testing.</li>
        <li>Create the Nerdie Blaq Syndicate NFT collection and mint.</li>
        <li>Establish a community marketplace for NFT trading.</li>
        <li>Begin development of the Business Staking Game and Nerdie City.</li>
        {/* Add more tasks as needed */}
      </ul>
    </li>
    <li>
      <h2>Community Building:</h2>
      <ul>
        <li>Host virtual events and competitions to engage the community.</li>
        <li>Launch the Nerdie Blaq Chess game and Capture the Flag competitions.</li>
        <li>Implement a leaderboard and point system for NFT holders.</li>
        <li>Initiate the Nerdie Blaq Kids Community for coding boot camps.</li>
        {/* Add more tasks as needed */}
      </ul>
    </li>
    <li>
      <h2>Expansion Phase:</h2>
      <ul>
        <li>Introduce new ways to reward community participation.</li>
        <li>Push marketing efforts to attract diverse audiences.</li>
        <li>Incorporate folklore and historical figures into storytelling and educational content comics.</li>
        <li>Develop agents.</li>
        {/* Add more tasks as needed */}
      </ul>
    </li>
    <li>
      <h2>Growth and Sustainability:</h2>
      <ul>
        <li>Launch the Nerdie Blaq marketplace for in-house staking and farming.</li>
        <li>Continue to refine and expand features based on community feedback.</li>
        <li>Strengthen partnerships and collaborations to enhance project visibility and impact.</li>
        {/* Add more tasks as needed */}
      </ul>
    </li>
  </ul>
</div>

<section id="blog-section">
  <h2 className="blog-title">My Blogs</h2>
  <div className="blog-post">
    <h3>Unveiling the Secrets of the Nerdie Blaq Syndicate: A Pathway to Empowerment and Prosperity</h3>
    <img src={blogpost1} alt="Item 1" style={{ width: '20%', height: 'auto' }} />
    <p>Welcome to the Nerdie Blaq Syndicate – where tradition meets innovation, and where the ethos of the mafia syndicate is reimagined for the digital age...<a href="https://mirror.xyz/rootcee.eth/35HfmjO53F0K0ZzJAkDSiNw_jME6Mq_2D3n_Lm3Du_E">Read More</a></p>
  </div>
  <div className="blog-post">
    <h3>Liberating Through Educating: The Nerdie Blaq Clubhouse and the Legacy of Black Caesar</h3>
    <img src={blogpost2} alt="Item 1" style={{ width: '20%', height: 'auto' }} />
    <p>In the heart of the bustling urban landscape, amidst the rhythmic beats of the streets and the vibrant energy of the community...<a href="https://mirror.xyz/rootcee.eth/WNJ4aDec1A40u_4odBofU2-_KkClKiA_LRyYzOn67Ho?referrerAddress=0xA25dF7E09D6ABB5B3c2ed4B12b1EF9fd46A01937">Read More</a></p>
  </div>
  {/* Add more blog posts as needed */}
  <a href="https://mirror.xyz/rootcee.eth" className="blog-button">Go to Blog Page</a>
</section>

<div className="team-section">
  <div className="team-member">
    <h2>Team Members</h2>
    <img src={placeholder} alt="Item 1" style={{ width: '10%', height: 'auto', borderRadius: '50%' }} />
    <div className="team-member-info">
      <h3 className="team-member-title">RootCee</h3>
      <h4 className="subtext">Creator, Developer, Reggae Artist, Producer</h4>
      <p>
        As the visionary behind Nerdie Blaq, RootCee brings together a fusion of creativity and technology. With a background deeply rooted in reggae music, RootCee's passion for artistry and innovation drives the Nerdie Blaq project forward. As a seasoned producer and musician, RootCee infuses each NFT creation with rhythm and soul, creating a unique blend of digital art and musical expression. With a commitment to pushing boundaries and exploring new horizons, RootCee leads the Nerdie Blaq team in crafting an immersive experience that transcends traditional boundaries.
        Email: <a href="mailto:rootcee@nerdieblaq.xyz">rootcee@nerdieblaq.xyz</a>
      </p>
    </div>
  </div>
  {/* Repeat for other team members */}
</div>

<div className="social-links">
  <a href="https://twitter.com/rootcee"><img src={twitter} alt="Twitter" style={{ width: '20%', height: 'auto' }} /></a>
  <a href="https://discord.com/invite/S874axwJyY"><img src={discord} alt="Discord" style={{ width: '20%', height: 'auto' }} /></a>
  <a href="https://t.me/+RPRDDLSZWSk3ZjZh"><img src={telegram} alt="Telegram" style={{ width: '20%', height: 'auto' }} /></a>
  <a href="https://instagram.com/rootcee_"><img src={instagram} alt="Instagram" style={{ width: '20%', height: 'auto' }} /></a>
</div>
<p>© 2024 Nerdie Blaq Clubhouse</p>
</>
  );
}

export default App; // Add this line to export the App component