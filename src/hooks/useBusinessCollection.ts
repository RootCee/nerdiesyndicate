import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, ABIS } from '../lib/contracts';
import { getReadProvider } from '../lib/providers';

const BUSINESS_TOKEN_IDS = [1, 2, 3, 4, 5] as const;

const BUSINESS_LABELS: Record<number, string> = {
  1: 'Retail Business',
  2: 'Tech Startup',
  3: 'Entertainment Venue',
  4: 'Manufacturing Unit',
  5: 'Financial Institution',
};

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

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
  refetch: () => void;
}

function resolveIPFS(uri: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}${uri.slice(7)}`;
  }
  return uri;
}

function toErc1155HexTokenId(tokenId: number): string {
  return tokenId.toString(16).toLowerCase().padStart(64, '0');
}

function resolveBusinessMetadataCandidates(uri: string, tokenId: number): string[] {
  if (!uri) return [];

  const resolved = resolveIPFS(uri);

  if (!resolved.includes('{id}')) {
    return [resolved];
  }

  const hexUrl = resolved.replaceAll('{id}', toErc1155HexTokenId(tokenId));
  const decimalUrl = resolved.replaceAll('{id}', String(tokenId));

  return Array.from(new Set([hexUrl, decimalUrl]));
}

async function fetchMetadata(
  uri: string,
  tokenId: number
): Promise<{ name: string | null; image: string | null; resolvedUri: string | null }> {
  const candidates = resolveBusinessMetadataCandidates(uri, tokenId);

  if (candidates.length === 0) {
    return { name: null, image: null, resolvedUri: null };
  }

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      return {
        name: typeof json?.name === 'string' ? json.name : null,
        image: typeof json?.image === 'string' ? resolveIPFS(json.image) : null,
        resolvedUri: candidate,
      };
    } catch {
      continue;
    }
  }

  return { name: null, image: null, resolvedUri: null };
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
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

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
    refetch: () => setFetchKey((value) => value + 1),
  };
}
