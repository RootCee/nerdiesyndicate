import { useEffect, useState } from 'react';

const TOKEN_LIST_URL = '/tokenlist.json';

interface TokenListToken {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

interface TokenList {
  name: string;
  timestamp: string;
  version: {
    major: number;
    minor: number;
    patch: number;
  };
  keywords?: string[];
  tokens: TokenListToken[];
}

export interface TokenMetadata {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function sanitizeToken(token: TokenListToken): TokenMetadata {
  return {
    ...token,
    logoURI: token.logoURI || undefined,
  };
}

export function useTokenList(chainId: number) {
  const [tokensByAddress, setTokensByAddress] = useState<Record<string, TokenMetadata>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(TOKEN_LIST_URL, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`Token list request failed with status ${response.status}`);
        }

        const tokenList = (await response.json()) as TokenList;
        if (!cancelled) {
          setTokensByAddress(
            tokenList.tokens.reduce<Record<string, TokenMetadata>>((acc, token) => {
              if (token.chainId === chainId) {
                acc[normalizeAddress(token.address)] = sanitizeToken(token);
              }
              return acc;
            }, {})
          );
        }
      } catch {
        if (!cancelled) {
          setTokensByAddress({});
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [chainId]);

  return tokensByAddress;
}

export function useTokenMetadata(chainId: number, address?: string | null) {
  const tokensByAddress = useTokenList(chainId);

  if (!address) {
    return null;
  }

  return tokensByAddress[normalizeAddress(address)] ?? null;
}
