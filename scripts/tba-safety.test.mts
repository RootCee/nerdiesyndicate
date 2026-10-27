// Character token-bound accounts are paused (src/lib/tbaSafety.ts): even when a component is handed an
// account address, the NFT card and detail view must not show it, copy it, link to it, or call it active.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
// tsx compiles these files with the classic JSX runtime, which needs a global React; load the components after setting it
(globalThis as unknown as { React: typeof React }).React = React;
const { default: NFTCard } = await import('../src/components/NFTCard');
const { default: NFTDetailModal } = await import('../src/components/NFTDetailModal');
const { resolveNFTGameplayProfile } = await import('../src/lib/nftGameplayProfile');
const { TBA_ACCOUNTS_ENABLED, TBA_PAUSED_NOTICE, TBA_PAUSED_TITLE } = await import('../src/lib/tbaSafety');

// character #0's real (broken) account address: the kind of address the site used to display
const BROKEN_ACCOUNT = '0x1D4AaA759e1B2e59901d66774138Bb3a1452bFEb';
const props = {
  tokenId: 0, image: '', name: 'Nerdie Syndicate #0', attributes: [],
  gameplayProfile: resolveNFTGameplayProfile(0, []),
  tbaAddress: BROKEN_ACCOUNT, ethBalance: '0.5', nerdieBalance: '1000', nerdieSymbol: 'NERDIE',
};
const lower = (s: string) => s.toLowerCase();

test('character wallets are switched off', () => {
  assert.equal(TBA_ACCOUNTS_ENABLED, false);
});

test('the NFT card shows "coming soon", never the account, its balances, or "TBA Active"', () => {
  const html = renderToStaticMarkup(React.createElement(NFTCard, { ...props, onClick: () => {} }));
  assert.ok(html.includes(TBA_PAUSED_TITLE));
  assert.ok(!html.includes('TBA Active'));
  for (const fragment of [BROKEN_ACCOUNT, BROKEN_ACCOUNT.slice(0, 6), BROKEN_ACCOUNT.slice(-4)]) assert.ok(!lower(html).includes(lower(fragment)), `no ${fragment}`);
  assert.ok(!html.includes('Token-Bound Account'));
});

test('the detail view shows the warning, has no copy button, and BaseScan opens the NFT, not the account', () => {
  const html = renderToStaticMarkup(React.createElement(NFTDetailModal, { ...props, onClose: () => {} }));
  assert.ok(html.includes(TBA_PAUSED_NOTICE.replace(/,/g, ',')));
  assert.ok(!lower(html).includes(lower(BROKEN_ACCOUNT.slice(2, 12))), 'no part of the account address');
  assert.ok(!/>\s*Copy\s*</.test(html), 'no copy button');
  assert.ok(html.includes('basescan.org/token/0x4d410D24fAcd00EB9470d4261db855b57c9CDc0e?a=0'));
  assert.ok(!html.includes('Send from TBA'));
});

test('the account hook computes no addresses while paused', () => {
  const src = readFileSync(new URL('../src/hooks/useTBA.ts', import.meta.url), 'utf8');
  assert.match(src, /if \(!TBA_ACCOUNTS_ENABLED \|\| tokenIds\.length === 0\) \{\s*setTbas\(\[\]\);/);
});
