import { ethers } from 'ethers';
import ERC721ABI from '../abis/ERC721.json';
import ERC6551RegistryABI from '../abis/ERC6551Registry.json';
import BusinessesABI from '../abis/NerdieBlaqSyndicateBusinesses.json';
import StakingABI from '../abis/BusinessStakingWithBurn.json';
import ERC20ABI from '../abis/ERC20.json';

// Contract addresses (Base chain)
export const CONTRACTS = {
  NFT: import.meta.env.VITE_NFT_CONTRACT_ADDRESS as string,
  ERC6551_REGISTRY: import.meta.env.VITE_ERC6551_REGISTRY as string,
  TBA_IMPLEMENTATION: import.meta.env.VITE_TBA_IMPLEMENTATION as string,
  BUSINESS_NFT: import.meta.env.VITE_BUSINESS_NFT as string,
  STAKING: import.meta.env.VITE_STAKING_CONTRACT as string,
  NERDIE_TOKEN:
    (import.meta.env.VITE_NERDIE_TOKEN as string | undefined) ||
    '0x4b138bd7e18a3a725a4672814f84b00711c1939d',
} as const;

// Base chain ID
export const BASE_CHAIN_ID = 8453;

// Re-export ABIs for convenience
export const ABIS = {
  ERC721: ERC721ABI,
  ERC6551Registry: ERC6551RegistryABI,
  Businesses: BusinessesABI,
  Staking: StakingABI,
  ERC20: ERC20ABI,
} as const;

/** Get a read-only contract instance using a JsonRpcProvider */
export function getReadContract(
  address: string,
  abi: ethers.ContractInterface,
  provider: ethers.providers.JsonRpcProvider
): ethers.Contract {
  return new ethers.Contract(address, abi, provider);
}

/** Get a signer-connected contract instance from window.ethereum */
export async function getSignerContract(
  address: string,
  abi: ethers.ContractInterface
): Promise<ethers.Contract> {
  if (!window.ethereum) throw new Error('No wallet detected');
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(address, abi, signer);
}

/** Get the connected wallet address */
export async function getWalletAddress(): Promise<string | null> {
  if (!window.ethereum) return null;
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const accounts = await provider.listAccounts();
  return accounts[0] ?? null;
}
