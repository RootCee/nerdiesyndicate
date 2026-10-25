import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTokenAmount } from '../src/lib/tokenAmount';
import { normalizeNftUrl, resolveErc1155MetadataCandidates } from '../src/lib/nftMetadata';

test('formats NERDIE balances with exact grouping and fractional precision', () => {
  assert.equal(formatTokenAmount(0n, 18), '0');
  assert.equal(formatTokenAmount(1_250_000_500_000_000_000_000_000n, 18), '1,250,000.5');
  assert.equal(formatTokenAmount(1n, 18), '0.000000000000000001');
  assert.equal(
    formatTokenAmount(123456789012345678901234567890123456789n, 18),
    '123,456,789,012,345,678,901.234567890123456789',
  );
});

test('normalizes IPFS and known gateway image URLs to the preferred HTTPS gateway', () => {
  assert.equal(
    normalizeNftUrl('ipfs://bafyExample/7.png'),
    'https://gateway.pinata.cloud/ipfs/bafyExample/7.png',
  );
  assert.equal(
    normalizeNftUrl('https://ipfs.io/ipfs/bafyExample/7.png'),
    'https://gateway.pinata.cloud/ipfs/bafyExample/7.png',
  );
  assert.equal(normalizeNftUrl('http://127.0.0.1/secret'), null);
  assert.equal(normalizeNftUrl('javascript:alert(1)'), null);
});

test('substitutes ERC-1155 ids using the standard 64-character hex form first', () => {
  const candidates = resolveErc1155MetadataCandidates('ipfs://bafyCollection/{id}.json', 5);
  assert.equal(candidates.length, 2);
  assert.match(candidates[0], /0000000000000005\.json$/);
  assert.equal(candidates[1], 'https://gateway.pinata.cloud/ipfs/bafyCollection/5.json');
});
