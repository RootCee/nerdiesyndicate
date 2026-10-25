import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS } from '../lib/contracts';
import { getReadProvider } from '../lib/providers';
import { fetchNftMetadata, resolveErc1155MetadataCandidates } from '../lib/nftMetadata';

const BUSINESS_TOKEN_IDS = [1, 2, 3, 4, 5] as const;

const BUSINESS_LABELS: Record<number, string> = {
  1: 'Retail Business',
  2: 'Tech Startup',
  3: 'Entertainment Venue',
  4: 'Manufacturing Unit',
  5: 'Financial Institution',
};

export interface BusinessCollectionItem {
  tokenId: number;
  fallbackName: string;
  businessName: string;
  businessPrice: string;
  businessPriceRaw: ethers.BigNumber;
  maxSupply: number | null;
  totalMinted: number | null;
  uri: string;
  metadataName: string | null;
  image: string | null;
  ownedBalance: number | null;
}

interface UseBusinessCollectionReturn {
  businesses: BusinessCollectionItem[];
  loading: boolean;
  error: string | null;
  loadedWalletAddress: string | null;
  refetch: () => void;
}

async function fetchMetadata(
  uri: string,
  tokenId: number
): Promise<{ name: string | null; image: string | null; resolvedUri: string | null }> {
  const metadata = await fetchNftMetadata(resolveErc1155MetadataCandidates(uri, tokenId));
  return metadata
    ? { name: metadata.name, image: metadata.image, resolvedUri: metadata.resolvedUri }
    : { name: null, image: null, resolvedUri: null };
}

function toSafeNumber(value: ethers.BigNumber): number | null {
  try {
    return value.toNumber();
  } catch {
    return null;
  }
}

export function useBusinessCollection(walletAddress: string | null): UseBusinessCollectionReturn {
  const [businesses, setBusinesses] = useState<BusinessCollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedWalletAddress, setLoadedWalletAddress] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setBusinesses([]);
    setLoadedWalletAddress(null);

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const provider = getReadProvider();
        const contract = new ethers.Contract(CONTRACTS.BUSINESS_NFT, ABIS.Businesses, provider);

        const items = await Promise.all(
          BUSINESS_TOKEN_IDS.map(async (tokenId) => {
            const fallbackName = BUSINESS_LABELS[tokenId];

            const [
              businessNameRaw,
              businessPriceRaw,
              maxSupplyRaw,
              totalMintedRaw,
              uriRaw,
              ownedBalanceRaw,
            ] = await Promise.all([
              contract.businessName(tokenId).catch(() => ''),
              contract.businessPrice(tokenId).catch(() => ethers.constants.Zero),
              contract.maxSupply(tokenId).catch(() => null),
              contract.totalMinted(tokenId).catch(() => null),
              contract.uri(tokenId).catch(() => ''),
              walletAddress
                ? contract.balanceOf(walletAddress, tokenId).catch(() => null)
                : Promise.resolve(null),
            ]);

            const metadata = await fetchMetadata(typeof uriRaw === 'string' ? uriRaw : '', tokenId);

            return {
              tokenId,
              fallbackName,
              businessName:
                typeof businessNameRaw === 'string' && businessNameRaw.trim().length > 0
                  ? businessNameRaw
                  : fallbackName,
              businessPriceRaw,
              businessPrice: ethers.utils.formatEther(businessPriceRaw),
              maxSupply: maxSupplyRaw ? toSafeNumber(maxSupplyRaw) : null,
              totalMinted: totalMintedRaw ? toSafeNumber(totalMintedRaw) : null,
              uri: metadata.resolvedUri || (typeof uriRaw === 'string' ? uriRaw : ''),
              metadataName: metadata.name,
              image: metadata.image,
              ownedBalance: ownedBalanceRaw ? toSafeNumber(ownedBalanceRaw) : walletAddress ? null : 0,
            } satisfies BusinessCollectionItem;
          })
        );

        if (!cancelled) {
          setBusinesses(items);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load business collection');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadedWalletAddress(walletAddress);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, fetchKey]);

  return {
    businesses,
    loading,
    error,
    loadedWalletAddress,
    refetch: () => setFetchKey((value) => value + 1),
  };
}
