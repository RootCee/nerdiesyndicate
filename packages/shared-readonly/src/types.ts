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

export interface LatestSignalsResult {
  cards: SignalCardData[];
  summary: SignalsSummary;
  hasAnyData: boolean;
}

export type SignalSnapshot = LatestSignalsResult;

export interface AssetPriceSnapshot {
  asset: TargetAsset;
  price: number | null;
  trend: string | null;
  confidence: number | null;
  support: number | null;
  resistance: number | null;
  latestSignal: SignalStatus | null;
  updatedAt: string | null;
  freshness: 'fresh' | 'stale' | 'unknown';
  stale: boolean;
  note: string | null;
}

export interface PriceBoardResult {
  assets: AssetPriceSnapshot[];
  strongestAsset: string;
  weakestAsset: string;
  marketBias: string;
  updatedAt: string | null;
  freshness: 'fresh' | 'stale' | 'unknown';
  stale: boolean;
  hasAnyData: boolean;
}

export interface BotStatus {
  botName: string;
  mode: string;
  executionAuthority: 'ops-bot';
  status: 'online' | 'degraded' | 'offline' | 'unknown';
  lastHeartbeat: string | null;
  lastSignalAt: string | null;
  lastExecutionAt: string | null;
  activeReviewCount: number | null;
  notes: string[];
}

export interface GuardrailState {
  executionAuthority: 'ops-bot';
  elizaReadOnly: true;
  tradingEnabled: boolean | null;
  confirmationsRequired: boolean;
  guardrailsHealthy: boolean;
  lastUpdatedAt: string | null;
  blockedActions: string[];
  notes: string[];
}

export interface PerformanceSummary {
  period: string;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  winRate: number | null;
  tradeCount: number | null;
  lastUpdatedAt: string | null;
}
