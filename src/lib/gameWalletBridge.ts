export const GAME_WALLET_BRIDGE_CHANNEL = 'nerdie-city-wallet';
export const GAME_WALLET_BRIDGE_VERSION = 1;

export interface GameWalletState {
  connected: boolean;
  address: `0x${string}` | null;
  chainId: number | null;
  nerdieBalance?: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    formatted: string | null;
  };
}

interface GameWalletMessage {
  channel: typeof GAME_WALLET_BRIDGE_CHANNEL;
  version: typeof GAME_WALLET_BRIDGE_VERSION;
  type: 'request-state' | 'open-bank' | 'state';
  payload?: GameWalletState;
}

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function createGameWalletState(
  address: string | undefined,
  chainId: number | undefined,
  connected: boolean,
  nerdieBalance?: GameWalletState['nerdieBalance'],
): GameWalletState {
  const validAddress = address && ADDRESS_PATTERN.test(address) ? address as `0x${string}` : null;
  const isWalletConnected = connected && validAddress !== null;
  return {
    connected: isWalletConnected,
    address: isWalletConnected ? validAddress : null,
    chainId: typeof chainId === 'number' && Number.isSafeInteger(chainId) && chainId > 0 ? chainId : null,
    ...(nerdieBalance ? { nerdieBalance } : {}),
  };
}

export function createGameWalletMessage(
  type: GameWalletMessage['type'],
  payload?: GameWalletState,
): GameWalletMessage {
  return {
    channel: GAME_WALLET_BRIDGE_CHANNEL,
    version: GAME_WALLET_BRIDGE_VERSION,
    type,
    ...(payload ? { payload } : {}),
  };
}

export function isGameWalletRequest(value: unknown): value is GameWalletMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.channel === GAME_WALLET_BRIDGE_CHANNEL
    && message.version === GAME_WALLET_BRIDGE_VERSION
    && (message.type === 'request-state' || message.type === 'open-bank')
    && Object.keys(message).every((key) => ['channel', 'version', 'type'].includes(key));
}

export function isGameWalletState(value: unknown): value is GameWalletMessage & { payload: GameWalletState } {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  if (
    message.channel !== GAME_WALLET_BRIDGE_CHANNEL
    || message.version !== GAME_WALLET_BRIDGE_VERSION
    || message.type !== 'state'
    || !message.payload
    || typeof message.payload !== 'object'
    || Object.keys(message).some((key) => !['channel', 'version', 'type', 'payload'].includes(key))
  ) return false;

  const payload = message.payload as Record<string, unknown>;
  const balance = payload.nerdieBalance as Record<string, unknown> | undefined;
  const validBalance = balance === undefined || (
    typeof balance === 'object'
    && balance !== null
    && Object.keys(balance).every((key) => ['status', 'formatted'].includes(key))
    && ['idle', 'loading', 'ready', 'error'].includes(String(balance.status))
    && (balance.formatted === null || typeof balance.formatted === 'string')
    && (balance.status === 'ready' ? typeof balance.formatted === 'string' : true)
  );
  return Object.keys(payload).every((key) => ['connected', 'address', 'chainId', 'nerdieBalance'].includes(key))
    && typeof payload.connected === 'boolean'
    && (payload.address === null || (typeof payload.address === 'string' && ADDRESS_PATTERN.test(payload.address)))
    && (payload.chainId === null || (Number.isSafeInteger(payload.chainId) && Number(payload.chainId) > 0))
    && payload.connected === (payload.address !== null)
    && validBalance;
}

export function isTrustedGameWalletEvent(
  event: Pick<MessageEvent, 'origin' | 'source'>,
  expectedOrigin: string,
  expectedSource: MessageEventSource | null,
): boolean {
  return event.origin === expectedOrigin && event.source === expectedSource;
}
