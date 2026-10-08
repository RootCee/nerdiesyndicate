import { Pool } from 'pg';

type DataRow = Record<string, unknown>;

let pool: Pool | null = null;

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.PG_HOST);
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
    });
  }

  return pool;
}

function getNumber(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function getTimestamp(row: DataRow | undefined, keys: string[]) {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value;
  }

  return null;
}

function latestTimestamp(...values: Array<string | null>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ ok: false, error: 'Performance feed is not configured' });
  }

  try {
    const db = getPool();
    const performanceResult = await db.query<DataRow>(
      'SELECT * FROM bot_performance ORDER BY created_at DESC LIMIT 1'
    );

    const statusResult = await db
      .query<DataRow>('SELECT * FROM bot_status ORDER BY created_at DESC LIMIT 1')
      .catch(() => ({ rows: [] as DataRow[] }));

    const performance = performanceResult.rows[0];
    const status = statusResult.rows[0];

    if (!performance) {
      return res.status(404).json({ ok: false, error: 'No performance data is available' });
    }

    const wins = getNumber(performance, ['wins', 'win_count', 'winning_trades']);
    const losses = getNumber(performance, ['losses', 'loss_count', 'losing_trades']);
    const expired = getNumber(performance, ['expired', 'expired_count']);
    const signals =
      getNumber(performance, ['signals', 'signal_count', 'total_signals']) ??
      (wins !== null || losses !== null || expired !== null
        ? (wins ?? 0) + (losses ?? 0) + (expired ?? 0)
        : null);
    const updatedAt = latestTimestamp(
      getTimestamp(status, ['last_heartbeat', 'heartbeat_at', 'updated_at', 'created_at']),
      getTimestamp(performance, ['updated_at', 'created_at', 'timestamp'])
    );

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      data: {
        signals,
        wins,
        losses,
        winRate: getNumber(performance, ['win_rate', 'winRate']),
        pnl:
          getNumber(performance, ['pnl']) ??
          getNumber(performance, ['realized_pnl', 'realizedPnl', 'pnl_realized']),
        updatedAt,
        source: 'postgres',
      },
    });
  } catch (error) {
    console.error(
      '[bot-performance] read failed',
      error instanceof Error ? error.message : 'Unknown database error'
    );
    return res.status(503).json({ ok: false, error: 'Performance feed is temporarily unavailable' });
  }
}
