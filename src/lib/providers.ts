import { ethers } from 'ethers';

const ALCHEMY_RPC = import.meta.env.VITE_ALCHEMY_RPC_URL as string | undefined;
const BASE_RPC = import.meta.env.VITE_BASE_RPC_URL as string | undefined;

// Fallback public Base RPC
const DEFAULT_BASE_RPC = 'https://mainnet.base.org';

/** Read-only provider for Base chain. Prefers Alchemy, falls back to public RPC. */
export function getReadProvider(): ethers.providers.JsonRpcProvider {
  const rpcUrl = ALCHEMY_RPC || BASE_RPC || DEFAULT_BASE_RPC;
  return new ethers.providers.JsonRpcProvider(rpcUrl, {
    name: 'base',
    chainId: 8453,
  });
}

/** Get a Web3Provider from the user's connected wallet */
export function getWalletProvider(): ethers.providers.Web3Provider | null {
  if (!window.ethereum) return null;
  return new ethers.providers.Web3Provider(window.ethereum);
}
