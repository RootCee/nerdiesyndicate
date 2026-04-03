import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getReadProvider } from '../lib/providers';
import { CONTRACTS, ABIS } from '../lib/contracts';

export interface NFTItem {
  tokenId: number;
  tokenURI: string;
  image: string;
  name: string;
  description: string;
  attributes: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

interface UseNFTsReturn {
  nfts: NFTItem[];
  balance: number;
  loading: boolean;
  error: string | null;
  debug: {
    walletAddress: string | null;
    contractAddress: string;
    rpcUrl: string | null;
    balance: number;
    totalSupply: number | null;
    ownedTokenIds: number[];
  };
  refetch: () => void;
}

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

function resolveIPFS(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + uri.slice(7);
  }
  return uri;
}

async function fetchMetadata(tokenURI: string): Promise<{
  image: string;
  name: string;
  description: string;
  attributes: NFTAttribute[];
}> {
  try {
    const url = resolveIPFS(tokenURI);
    const res = await fetch(url);
    const json = await res.json();
    const attributes: NFTAttribute[] = Array.isArray(json.attributes)
      ? json.attributes
          .filter(
            (attribute: unknown): attribute is { trait_type?: unknown; value?: unknown } =>
              typeof attribute === 'object' && attribute !== null
          )
          .map((attribute: { trait_type?: unknown; value?: unknown }) => ({
            trait_type:
              typeof attribute.trait_type === 'string' ? attribute.trait_type : 'Trait',
            value:
              typeof attribute.value === 'string' || typeof attribute.value === 'number'
                ? attribute.value
                : String(attribute.value ?? ''),
          }))
      : [];

    return {
      image: resolveIPFS(json.image || ''),
      name: json.name || `Nerdie Syndicate NFT`,
      description: typeof json.description === 'string' ? json.description : '',
      attributes,
    };
  } catch {
    return {
      image: '',
      name: 'Nerdie Syndicate NFT',
      description: '',
      attributes: [],
    };
  }
}

export function useNFTs(walletAddress: string | null): UseNFTsReturn {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [ownedTokenIds, setOwnedTokenIds] = useState<number[]>([]);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!walletAddress) {
      setNfts([]);
      setBalance(0);
      setTotalSupply(null);
      setOwnedTokenIds([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const provider = getReadProvider();
        const nftContract = new ethers.Contract(CONTRACTS.NFT, ABIS.ERC721, provider);

        const bal: ethers.BigNumber = await nftContract.balanceOf(walletAddress);
        const balNum = bal.toNumber();

        if (cancelled) return;
        setBalance(balNum);

        if (balNum === 0) {
          setNfts([]);
          setOwnedTokenIds([]);
          setLoading(false);
          return;
        }

        // Find token IDs owned by this wallet by scanning totalSupply
        const totalSupply: ethers.BigNumber = await nftContract.totalSupply();
        const total = totalSupply.toNumber();
        setTotalSupply(total);

        const nextOwnedTokenIds: number[] = [];
        // Batch ownerOf calls — check all minted tokens
        const batchSize = 50;
        for (let start = 0; start < total && nextOwnedTokenIds.length < balNum; start += batchSize) {
          const end = Math.min(start + batchSize, total);
          const promises = [];
          for (let id = start; id < end; id++) {
            promises.push(
              nftContract.ownerOf(id).then((owner: string) => {
                if (owner.toLowerCase() === walletAddress!.toLowerCase()) {
                  nextOwnedTokenIds.push(id);
                }
              }).catch(() => {
                // Token may not exist or be burned
              })
            );
          }
          await Promise.all(promises);
        }

        if (cancelled) return;
        setOwnedTokenIds(nextOwnedTokenIds);

        // Fetch metadata for each owned token
        const nftItems: NFTItem[] = await Promise.all(
          nextOwnedTokenIds.map(async (tokenId) => {
            const tokenURI: string = await nftContract.tokenURI(tokenId);
            const meta = await fetchMetadata(tokenURI);
            return {
              tokenId,
              tokenURI,
              image: meta.image,
              name: meta.name,
              description: meta.description,
              attributes: meta.attributes,
            };
          })
        );

        if (cancelled) return;
        setNfts(nftItems);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load NFTs');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [walletAddress, fetchKey]);

  return {
    nfts,
    balance,
    loading,
    error,
    debug: {
      walletAddress,
      contractAddress: CONTRACTS.NFT,
      rpcUrl:
        (import.meta.env.VITE_ALCHEMY_RPC_URL as string | undefined) ||
        (import.meta.env.VITE_BASE_RPC_URL as string | undefined) ||
        'https://mainnet.base.org',
      balance,
      totalSupply,
      ownedTokenIds,
    },
    refetch,
  };
}
