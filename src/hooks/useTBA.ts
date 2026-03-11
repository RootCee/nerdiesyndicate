import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getReadProvider } from '../lib/providers';
import { CONTRACTS, ABIS, BASE_CHAIN_ID } from '../lib/contracts';

export interface TBAInfo {
  tokenId: number;
  tbaAddress: string;
  ethBalance: string;
}

interface UseTBAReturn {
  tbas: TBAInfo[];
  loading: boolean;
  error: string | null;
}

export function useTBA(tokenIds: number[]): UseTBAReturn {
  const [tbas, setTbas] = useState<TBAInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenIds.length === 0) {
      setTbas([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const provider = getReadProvider();
        const registry = new ethers.Contract(
          CONTRACTS.ERC6551_REGISTRY,
          ABIS.ERC6551Registry,
          provider
        );

        const results: TBAInfo[] = await Promise.all(
          tokenIds.map(async (tokenId) => {
            // Compute the deterministic TBA address
            const tbaAddress: string = await registry.account(
              CONTRACTS.TBA_IMPLEMENTATION,
              BASE_CHAIN_ID,
              CONTRACTS.NFT,
              tokenId,
              0 // salt
            );

            // Check ETH balance of the TBA
            const balance = await provider.getBalance(tbaAddress);

            return {
              tokenId,
              tbaAddress,
              ethBalance: ethers.utils.formatEther(balance),
            };
          })
        );

        if (!cancelled) setTbas(results);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load TBA data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tokenIds.join(',')]);

  return { tbas, loading, error };
}
