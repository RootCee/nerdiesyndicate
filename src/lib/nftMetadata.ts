const PREFERRED_IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
const IPFS_GATEWAY_HOSTS = new Set([
  'gateway.pinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com',
  'dweb.link',
]);
const MAX_METADATA_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface NormalizedNftMetadata {
  name: string | null;
  description: string;
  image: string | null;
  attributes: Array<{ trait_type: string; value: string | number }>;
  resolvedUri: string;
}

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]') return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const [, aText, bText] = match;
  const a = Number(aText);
  const b = Number(bText);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function normalizeIpfsPath(path: string): string | null {
  const clean = path.replace(/^ipfs\//i, '').replace(/^\/+/, '');
  if (!clean || clean.includes('..') || /[?#]/.test(clean)) return null;
  return `${PREFERRED_IPFS_GATEWAY}${clean}`;
}

export function normalizeNftUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) return null;
  if (value.toLowerCase().startsWith('ipfs://')) return normalizeIpfsPath(value.slice(7));

  try {
    const url = new URL(value);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || isUnsafeHostname(url.hostname)) {
      return null;
    }
    if (IPFS_GATEWAY_HOSTS.has(url.hostname.toLowerCase())) {
      const marker = '/ipfs/';
      const markerIndex = url.pathname.toLowerCase().indexOf(marker);
      if (markerIndex >= 0) return normalizeIpfsPath(url.pathname.slice(markerIndex + marker.length));
    }
    url.protocol = 'https:';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function toErc1155HexTokenId(tokenId: number | bigint): string {
  return BigInt(tokenId).toString(16).toLowerCase().padStart(64, '0');
}

export function resolveErc1155MetadataCandidates(uri: string, tokenId: number | bigint): string[] {
  if (!uri.includes('{id}')) {
    const normalized = normalizeNftUrl(uri);
    return normalized ? [normalized] : [];
  }

  return Array.from(new Set([
    uri.replaceAll('{id}', toErc1155HexTokenId(tokenId)),
    uri.replaceAll('{id}', String(tokenId)),
  ].map(normalizeNftUrl).filter((value): value is string => Boolean(value))));
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_METADATA_BYTES) throw new Error('NFT metadata response is too large.');
  if (!response.body) return response.json();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_METADATA_BYTES) {
      await reader.cancel();
      throw new Error('NFT metadata response is too large.');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function fetchNftMetadata(
  candidates: string[],
  { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<NormalizedNftMetadata | null> {
  for (const candidate of candidates.slice(0, 2)) {
    const resolvedUri = normalizeNftUrl(candidate);
    if (!resolvedUri) continue;
    try {
      const response = await fetchImpl(resolvedUri, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) continue;
      const json = await readBoundedJson(response) as Record<string, unknown>;
      const attributes = Array.isArray(json.attributes)
        ? json.attributes.flatMap((attribute) => {
            if (!attribute || typeof attribute !== 'object') return [];
            const item = attribute as Record<string, unknown>;
            if (typeof item.value !== 'string' && typeof item.value !== 'number') return [];
            return [{
              trait_type: typeof item.trait_type === 'string' ? item.trait_type : 'Trait',
              value: item.value,
            }];
          })
        : [];
      return {
        name: typeof json.name === 'string' ? json.name : null,
        description: typeof json.description === 'string' ? json.description : '',
        image: normalizeNftUrl(json.image),
        attributes,
        resolvedUri,
      };
    } catch {
      // Try the next bounded candidate.
    }
  }
  return null;
}
