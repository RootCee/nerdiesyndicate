const DEFAULT_PERFORMANCE_URL = 'https://api.vpsd.nerdieblaq.xyz/gdex/performance';

function getNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getTimestamp(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function latestTimestamp(...values) {
  return values
    .map(getTimestamp)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(
      process.env.BOT_PERFORMANCE_API_URL || DEFAULT_PERFORMANCE_URL,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    const payload = await response.json();
    const performance = payload?.data;

    if (!response.ok || !payload?.ok || !performance) {
      throw new Error(`Performance bridge returned ${response.status}`);
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok: true,
      data: {
        signals: getNumber(performance.signals),
        wins: getNumber(performance.wins),
        losses: getNumber(performance.losses),
        winRate: getNumber(performance.winRate),
        pnl: getNumber(performance.pnl),
        updatedAt: latestTimestamp(
          performance.lastActivityAt,
          performance.lastHeartbeatAt,
          performance.performanceUpdatedAt
        ),
        source: 'postgres',
      },
    });
  } catch (error) {
    console.error(
      '[bot-performance] bridge read failed',
      error instanceof Error ? error.message : 'Unknown bridge error'
    );
    return res.status(503).json({ ok: false, error: 'Performance feed is temporarily unavailable' });
  } finally {
    clearTimeout(timeout);
  }
};
