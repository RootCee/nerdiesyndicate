export const TARGET_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'PAXG'] as const;

export type TargetAsset = typeof TARGET_ASSETS[number];

export type SignalStatus = 'LONG' | 'SHORT' | 'WATCH' | 'NEUTRAL';
export type SignalOutcomeStatus = 'OPEN' | 'WIN' | 'LOSS' | 'EXPIRED';
export type SignalDirection = 'LONG' | 'SHORT' | 'UNKNOWN';

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

export interface SignalRecord {
  id: string;
  pair: string;
  asset: string | null;
  side: SignalDirection;
  status: SignalOutcomeStatus;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  confidence: number | null;
  timeframe: string | null;
  createdAt: string | null;
  closedAt: string | null;
  strategy: string | null;
  reason: string | null;
  pnl: number | null;
  source: 'signal_outcomes' | 'bot_signals';
}

export interface SignalSummaryCards {
  totalSignals: number;
  openSignals: number;
  winRate: number | null;
  totalPnl: number | null;
}

export interface SignalsActivityData {
  signals: SignalRecord[];
  summary: SignalSummaryCards;
  pairs: string[];
  timeframes: string[];
}
