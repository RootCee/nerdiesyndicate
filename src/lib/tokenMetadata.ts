import { useEffect, useState } from 'react';

const TOKEN_LIST_URL = '/tokenlist.json';
const PLACEHOLDER_LOGO_URI = 'REPLACE_WITH_MY_PUBLIC_LOGO_URL';

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

export function useTokenMetadata(chainId: number, address?: string | null) {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);

  useEffect(() => {
    if (!address) {
      setMetadata(null);
      return;
    }

    let cancelled = false;
    const normalizedAddress = normalizeAddress(address);

    async function load() {
      try {
        const response = await fetch(TOKEN_LIST_URL, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`Token list request failed with status ${response.status}`);
        }

        const tokenList = (await response.json()) as TokenList;
        const matchedToken = tokenList.tokens.find(
          (token) =>
            token.chainId === chainId &&
            normalizeAddress(token.address) === normalizedAddress
        );

        if (!cancelled) {
          setMetadata(
            matchedToken
              ? {
                  ...matchedToken,
                  logoURI:
                    matchedToken.logoURI && matchedToken.logoURI !== PLACEHOLDER_LOGO_URI
                      ? matchedToken.logoURI
                      : undefined,
                }
              : null
          );
        }
      } catch {
        if (!cancelled) {
          setMetadata(null);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [address, chainId]);

  return metadata;
}
