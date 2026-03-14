export const TARGET_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'PAXG'] as const;

export type TargetAsset = typeof TARGET_ASSETS[number];

export type SignalStatus = 'LONG' | 'SHORT' | 'WATCH' | 'NEUTRAL';

export interface SignalCardData {
  asset: TargetAsset;
  price: number | null;
  change24h: number | null;
  latestSignal: SignalStatus | null;
  trend: string | null;
  confidence: number | null;
  rsi: number | null;
  support: number | null;
  resistance: number | null;
  funding: number | null;
  note: string | null;
  updatedAt: string | null;
  marketUpdatedAt: string | null;
  signalUpdatedAt: string | null;
}

export interface SignalsSummary {
  marketBias: string;
  strongestAsset: string;
  weakestAsset: string;
  activeSignals: number;
  lastUpdateTime: string | null;
}

export interface SignalsBoardData {
  cards: SignalCardData[];
  summary: SignalsSummary;
  hasAnyData: boolean;
}
