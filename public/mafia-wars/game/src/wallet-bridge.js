export const WALLET_BRIDGE_CHANNEL = 'nerdie-city-wallet';
export const WALLET_BRIDGE_VERSION = 1;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function formatNerdieCash(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.replaceAll(',', '').trim();
  if (!/^\d+(?:\.\d*)?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  let cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  if ((fraction[2] || '0') >= '5') cents += 1n;
  const cashWhole = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${cashWhole}.${String(cents % 100n).padStart(2, '0')}`;
}

export function isWalletStateMessage(value) {
  if (!value || typeof value !== 'object') return false;
  const message = value;
  if (
    message.channel !== WALLET_BRIDGE_CHANNEL
    || message.version !== WALLET_BRIDGE_VERSION
    || message.type !== 'state'
    || !message.payload
    || typeof message.payload !== 'object'
    || Object.keys(message).some((key) => !['channel', 'version', 'type', 'payload'].includes(key))
  ) return false;

  const payload = message.payload;
  const balance = payload.nerdieBalance;
  const validBalance = balance === undefined || (
    balance && typeof balance === 'object'
    && Object.keys(balance).every((key) => ['status', 'formatted'].includes(key))
    && ['idle', 'loading', 'ready', 'error'].includes(balance.status)
    && (balance.formatted === null || typeof balance.formatted === 'string')
    && (balance.status !== 'ready' || typeof balance.formatted === 'string')
  );
  return Object.keys(payload).every((key) => ['connected', 'address', 'chainId', 'nerdieBalance'].includes(key))
    && typeof payload.connected === 'boolean'
    && (payload.address === null || (typeof payload.address === 'string' && ADDRESS_PATTERN.test(payload.address)))
    && (payload.chainId === null || (Number.isSafeInteger(payload.chainId) && payload.chainId > 0))
    && payload.connected === (payload.address !== null)
    && validBalance;
}

// Founder sign-in: the website answers a signature request with exactly one of these.
export function isFounderSignatureMessage(value) {
  if (!value || typeof value !== 'object') return false;
  const message = value, payload = message.payload;
  return message.channel === WALLET_BRIDGE_CHANNEL && message.version === WALLET_BRIDGE_VERSION && message.type === 'founder-signature'
    && Object.keys(message).every((key) => ['channel', 'version', 'type', 'payload'].includes(key))
    && !!payload && typeof payload === 'object' && typeof payload.requestId === 'string'
    && ((typeof payload.signature === 'string' && /^0x[0-9a-fA-F]{130}$/.test(payload.signature)) || typeof payload.error === 'string');
}

export function setupCityWalletBridge({ windowObject = window, onWalletState = () => {} } = {}) {
  const isEmbedded = windowObject.parent !== windowObject;
  const targetOrigin = windowObject.location.origin;
  const pendingSignatures = new Map();

  function requestState() {
    if (isEmbedded) {
      windowObject.parent.postMessage({
        channel: WALLET_BRIDGE_CHANNEL,
        version: WALLET_BRIDGE_VERSION,
        type: 'request-state',
      }, targetOrigin);
    }
  }

  function onMessage(event) {
    if (!isEmbedded || event.origin !== targetOrigin || event.source !== windowObject.parent) return;
    if (isWalletStateMessage(event.data)) onWalletState(event.data.payload);
    else if (isFounderSignatureMessage(event.data)) {
      const pending = pendingSignatures.get(event.data.payload.requestId);
      if (!pending) return;
      pendingSignatures.delete(event.data.payload.requestId); clearTimeout(pending.timer);
      if (event.data.payload.signature) pending.resolve(event.data.payload.signature);
      else pending.reject(new Error(event.data.payload.error));
    }
  }

  if (isEmbedded) {
    windowObject.addEventListener('message', onMessage);
    requestState();
  }

  return {
    requestState,
    openBank() {
      if (isEmbedded) {
        windowObject.parent.postMessage({
          channel: WALLET_BRIDGE_CHANNEL,
          version: WALLET_BRIDGE_VERSION,
          type: 'open-bank',
        }, targetOrigin);
      } else {
        windowObject.location.assign('/mafia-wars/bank');
      }
    },
    // Ask the website's wallet to sign a founder sign-in challenge. The website signs only the Nerdie City
    // founder sign-in text for the connected wallet; nothing else can be signed through the bridge.
    signFounderChallenge(message) {
      if (!isEmbedded) return Promise.reject(new Error('Open the game from nerdieblaq.xyz to sign in with your wallet.'));
      const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pendingSignatures.delete(requestId); reject(new Error('The wallet did not answer in time.')); }, 180_000);
        pendingSignatures.set(requestId, { resolve, reject, timer });
        windowObject.parent.postMessage({
          channel: WALLET_BRIDGE_CHANNEL,
          version: WALLET_BRIDGE_VERSION,
          type: 'sign-founder-challenge',
          payload: { requestId, message },
        }, targetOrigin);
      });
    },
    dispose() {
      if (isEmbedded) windowObject.removeEventListener('message', onMessage);
      for (const pending of pendingSignatures.values()) clearTimeout(pending.timer);
      pendingSignatures.clear();
    },
  };
}
