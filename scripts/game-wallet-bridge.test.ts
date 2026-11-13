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

// NC-LIFE-02 Milestone 4: resident registration signing (EIP-4361). Only the exact City Service text, for this site and wallet.
import { RESIDENT_SIGN_IN_STATEMENT, createResidentSignatureMessage, isResidentSignInText, isResidentSignRequest } from '../src/lib/gameWalletBridge';
const RESIDENT_ADDRESS = '0x4b138bd7e18a3a725a4672814f84b00711c1939d';
const residentText = (overrides: Partial<Record<'host' | 'origin' | 'address' | 'statement' | 'chain' | 'nonce' | 'extra', string>> = {}) =>
  `${overrides.host ?? 'nerdieblaq.xyz'} wants you to sign in with your Ethereum account:\n${overrides.address ?? '0x4B138bd7E18A3A725a4672814F84B00711c1939D'}\n\n`
  + `${overrides.statement ?? RESIDENT_SIGN_IN_STATEMENT}\n\nURI: ${overrides.origin ?? 'https://nerdieblaq.xyz'}\nVersion: 1\nChain ID: ${overrides.chain ?? '8453'}\n`
  + `Nonce: ${overrides.nonce ?? '0123456789abcdef0123456789abcdef'}\nIssued At: 2026-11-13T18:00:00.000Z\nExpiration Time: 2026-11-13T18:05:00.000Z${overrides.extra ?? ''}`;

test('resident registration: the site signs only the exact sign-in text for its own domain, origin and connected wallet on Base', () => {
  assert.equal(isResidentSignInText(residentText(), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS), true);
  assert.match(RESIDENT_SIGN_IN_STATEMENT, /free/); assert.match(RESIDENT_SIGN_IN_STATEMENT, /does not transfer funds/);
  for (const [why, text, host, origin, address] of [
    ['another site', residentText({ host: 'evil.example', origin: 'https://evil.example' }), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS],
    ['another wallet', residentText(), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', '0x1111111111111111111111111111111111111111'],
    ['another chain', residentText({ chain: '1' }), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS],
    ['a changed statement', residentText({ statement: 'Approve unlimited spending.' }), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS],
    ['an extra line', residentText({ extra: '\nResources:\n- https://evil.example' }), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS],
    ['a bad nonce', residentText({ nonce: 'xyz' }), 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS],
    ['the founder text', 'nerdieblaq.xyz wants you to sign in with your Ethereum account:\n0x4B138bd7E18A3A725a4672814F84B00711c1939D\n\nNerdie City Bank: Founder Executive Suite access.', 'nerdieblaq.xyz', 'https://nerdieblaq.xyz', RESIDENT_ADDRESS],
  ] as const) assert.equal(isResidentSignInText(text, host, origin, address), false, why);
  const request = { channel: 'nerdie-city-wallet', version: 1, type: 'sign-resident-challenge', payload: { requestId: 'abc-123', message: residentText() } };
  assert.equal(isResidentSignRequest(request), true);
  assert.equal(isResidentSignRequest({ ...request, extra: 1 }), false); assert.equal(isResidentSignRequest({ ...request, payload: { ...request.payload, message: 'x'.repeat(2000) } }), false);
  assert.deepEqual(createResidentSignatureMessage('abc-123', { error: 'no' }).type, 'resident-signature');
});
