export const WALLET_BRIDGE_CHANNEL = 'nerdie-city-wallet';
export const WALLET_BRIDGE_VERSION = 1;

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

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

export function setupCityWalletBridge({ windowObject = window, onWalletState = () => {} } = {}) {
  const isEmbedded = windowObject.parent !== windowObject;
  const targetOrigin = windowObject.location.origin;

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
    dispose() {
      if (isEmbedded) windowObject.removeEventListener('message', onMessage);
    },
  };
}
