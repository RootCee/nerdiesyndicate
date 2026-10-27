import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFounderSignatureMessage,
  isFounderSignInText,
  isFounderSignRequest,
  createGameWalletMessage,
  createGameWalletState,
  isGameWalletRequest,
  isGameWalletState,
  isTrustedGameWalletEvent,
} from '../src/lib/gameWalletBridge';

test('wallet snapshots contain only public connection state', () => {
  const state = createGameWalletState('0x4b138bd7e18a3a725a4672814f84b00711c1939d', 8453, true);
  assert.deepEqual(state, {
    connected: true,
    address: '0x4b138bd7e18a3a725a4672814f84b00711c1939d',
    chainId: 8453,
  });
  assert.equal(isGameWalletState(createGameWalletMessage('state', state)), true);
  assert.equal(isGameWalletState({
    ...createGameWalletMessage('state', state),
    payload: { ...state, signature: 'must not cross the bridge' },
  }), false);
});

test('disconnected and invalid account snapshots never claim a connection', () => {
  assert.deepEqual(createGameWalletState(undefined, undefined, false), {
    connected: false,
    address: null,
    chainId: null,
  });
  assert.deepEqual(createGameWalletState('not-an-address', 0, true), {
    connected: false,
    address: null,
    chainId: null,
  });
  assert.equal(isGameWalletState(createGameWalletMessage('state', {
    connected: true,
    address: null,
    chainId: 8453,
  })), false);
});

test('account and network changes produce fresh public snapshots', () => {
  const firstAccount = createGameWalletState('0x4b138bd7e18a3a725a4672814f84b00711c1939d', 8453, true);
  const changedAccount = createGameWalletState('0x4d410D24fAcd00EB9470d4261db855b57c9CDc0e', 8453, true);
  const changedNetwork = createGameWalletState('0x4d410D24fAcd00EB9470d4261db855b57c9CDc0e', 1, true);

  assert.notEqual(firstAccount.address, changedAccount.address);
  assert.deepEqual(changedNetwork, { ...changedAccount, chainId: 1 });
});

test('accepts only the two versioned game requests', () => {
  assert.equal(isGameWalletRequest(createGameWalletMessage('request-state')), true);
  assert.equal(isGameWalletRequest(createGameWalletMessage('open-bank')), true);
  assert.equal(isGameWalletRequest({ channel: 'nerdie-city-wallet', version: 1, type: 'connect' }), false);
  assert.equal(isGameWalletRequest({ channel: 'nerdie-city-wallet', version: 1, type: 'open-bank', token: 'secret' }), false);
});

test('trusts bridge events only from the expected origin and iframe source', () => {
  const iframeWindow = {} as MessageEventSource;
  assert.equal(isTrustedGameWalletEvent({ origin: 'https://nerdieblaq.xyz', source: iframeWindow }, 'https://nerdieblaq.xyz', iframeWindow), true);
  assert.equal(isTrustedGameWalletEvent({ origin: 'https://attacker.example', source: iframeWindow }, 'https://nerdieblaq.xyz', iframeWindow), false);
  assert.equal(isTrustedGameWalletEvent({ origin: 'https://nerdieblaq.xyz', source: {} as MessageEventSource }, 'https://nerdieblaq.xyz', iframeWindow), false);
});

// Founder Executive Suite: the exact text the City Service issues (city-service/src/founder-auth.js).
const FOUNDER = '0xA0719F02A733472EF82ff24BC182e583cAea6D45';
const founderText = (host: string, address: string, nonce = 'a'.repeat(32)) => `${host} wants you to sign in with your Ethereum account:\n${address}\n\n`
  + 'Nerdie City Bank: Founder Executive Suite access. This signature does not move funds or approve any transaction.\n\n'
  + `URI: https://${host}\nVersion: 1\nChain ID: 8453\nNonce: ${nonce}`;

test('the site signs only the founder sign-in text, for its own domain and the connected wallet', () => {
  assert.equal(isFounderSignInText(founderText('nerdieblaq.xyz', FOUNDER), 'nerdieblaq.xyz', FOUNDER.toLowerCase()), true);
  assert.equal(isFounderSignInText(founderText('evil.example', FOUNDER), 'nerdieblaq.xyz', FOUNDER), false, 'another site');
  assert.equal(isFounderSignInText(founderText('nerdieblaq.xyz', '0x000000000000000000000000000000000000dEaD'), 'nerdieblaq.xyz', FOUNDER), false, 'another wallet');
  assert.equal(isFounderSignInText(founderText('nerdieblaq.xyz', FOUNDER) + '\nApprove transfer of all tokens', 'nerdieblaq.xyz', FOUNDER), false, 'extra text');
  assert.equal(isFounderSignInText(founderText('nerdieblaq.xyz', FOUNDER, 'nothex'), 'nerdieblaq.xyz', FOUNDER), false, 'bad nonce');
  assert.equal(isFounderSignInText('Transfer 1000 NERDIE', 'nerdieblaq.xyz', FOUNDER), false);
});

test('founder signature requests and replies have a strict shape', () => {
  const request = { channel: 'nerdie-city-wallet', version: 1, type: 'sign-founder-challenge', payload: { requestId: 'abc-123', message: 'x' } };
  assert.equal(isFounderSignRequest(request), true);
  assert.equal(isFounderSignRequest({ ...request, extra: 1 }), false);
  assert.equal(isFounderSignRequest({ ...request, payload: { requestId: 'abc-123', message: 'x'.repeat(2000) } }), false);
  assert.deepEqual(createFounderSignatureMessage('abc-123', { error: 'no' }), { channel: 'nerdie-city-wallet', version: 1, type: 'founder-signature', payload: { requestId: 'abc-123', error: 'no' } });
});
