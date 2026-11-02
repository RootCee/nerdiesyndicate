const percentile = (values, ratio) => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
};

export function summarizePerformanceFrames(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = values.length ? total / values.length : 0;
  return {
    samples: values.length,
    averageMs: +average.toFixed(2),
    averageFps: +(average ? 1000 / average : 0).toFixed(2),
    p50Ms: +percentile(values, 0.5).toFixed(2),
    p95Ms: +percentile(values, 0.95).toFixed(2),
    p99Ms: +percentile(values, 0.99).toFixed(2),
    maxMs: +(values.length ? Math.max(...values) : 0).toFixed(2),
    framesOver25Ms: values.filter((value) => value > 25).length,
    framesOver50Ms: values.filter((value) => value > 50).length,
  };
}

const display = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number' && !Number.isFinite(value)) return 'N/A';
  return `${value}${suffix}`;
};
const heapDisplay = (bytes) => Number.isFinite(bytes) ? `${(bytes / 1048576).toFixed(1)} MB` : 'N/A';

export function createMobilePerformanceOverlay({
  enabled = false,
  renderer,
  getMetrics = () => ({}),
  getDiagnostics = () => ({}),
  sampleDurationMs = 30_000,
  document: doc = globalThis.document,
  navigator: nav = globalThis.navigator,
} = {}) {
  if (!enabled || !doc?.body) return { enabled: false, frame() {}, snapshot: () => null, start() {}, dispose() {} };

  const root = doc.createElement('section');
  root.id = 'mobilePerfOverlay';
  root.setAttribute('aria-label', 'Mobile performance diagnostics');
  root.style.cssText = 'position:fixed;z-index:2147483645;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));width:min(330px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;padding:9px;border:1px solid #d9ac58;border-radius:9px;background:#070a0eea;color:#f7f2e8;font:600 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:auto;touch-action:pan-y;user-select:text;-webkit-user-select:text';
  root.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b style="color:#f2d28b;letter-spacing:.08em">MOBILE PERF</b><button data-collapse type="button">HIDE</button></div><pre data-readout style="margin:7px 0;white-space:pre-wrap"></pre><div data-actions style="display:flex;flex-wrap:wrap;gap:6px"><button data-record type="button">RECORD 30S</button><button data-copy type="button">COPY RESULTS</button><button data-export type="button">EXPORT JSON</button></div><div data-status role="status" style="min-height:1.35em;margin-top:6px;color:#b9c8d8"></div>';
  for (const button of root.querySelectorAll('button')) button.style.cssText = 'min-height:38px;padding:7px 9px;border:1px solid #d9ac58;border-radius:6px;background:#171d26;color:#f2d28b;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;touch-action:manipulation';
  doc.body.append(root);
  const readout = root.querySelector('[data-readout]');
  const recordButton = root.querySelector('[data-record]');
  const status = root.querySelector('[data-status]');
  const actions = root.querySelector('[data-actions]');
  let collapsed = false;
  let lastFrameAt = 0;
  let lastPaintAt = 0;
  let lastInterval = 0;
  let sample = null;
  let lastResult = null;
  const rolling = [];

  const environment = () => ({
    capturedAt: new Date().toISOString(),
    userAgent: nav?.userAgent || 'N/A',
    platform: nav?.platform || 'N/A',
    hardwareConcurrency: nav?.hardwareConcurrency ?? null,
    deviceMemoryGb: nav?.deviceMemory ?? null,
    viewport: { width: globalThis.innerWidth, height: globalThis.innerHeight },
    screen: globalThis.screen ? { width: screen.width, height: screen.height } : null,
    diagnostics: getDiagnostics(),
  });

  function liveSnapshot() {
    const frame = summarizePerformanceFrames(rolling);
    const metrics = getMetrics() || {};
    return {
      currentFps: lastInterval ? +(1000 / lastInterval).toFixed(1) : 0,
      rolling: frame,
      renderer: {
        drawCalls: renderer?.info?.render?.calls ?? null,
        triangles: renderer?.info?.render?.triangles ?? null,
        resolution: renderer?.domElement ? `${renderer.domElement.width}×${renderer.domElement.height}` : null,
        pixelRatio: renderer?.getPixelRatio?.() ?? null,
        geometries: renderer?.info?.memory?.geometries ?? null,
        textures: renderer?.info?.memory?.textures ?? null,
      },
      activeLights: metrics.activeLights ?? null,
      activeNpcs: metrics.activeNpcs ?? null,
      loadedChunks: metrics.loadedChunks ?? null,
      loadedNeighborhoods: metrics.loadedNeighborhoods ?? null,
      activeDestructionPanels: metrics.activeDestructionPanels ?? null,
      panelLodHouses: metrics.panelLodHouses ?? null,
      district: metrics.district ?? null,
      jsHeapBytes: globalThis.performance?.memory?.usedJSHeapSize ?? null,
    };
  }

  function finishSample(now) {
    if (!sample) return;
    const frames = sample.frames.slice();
    const segmentMs = 5_000;
    const segments = [];
    for (let start = sample.startedAt; start < now; start += segmentMs) {
      const values = sample.timedFrames.filter((entry) => entry.at >= start && entry.at < start + segmentMs).map((entry) => entry.ms);
      if (values.length) segments.push({ offsetSeconds: Math.round((start - sample.startedAt) / 1000), ...summarizePerformanceFrames(values) });
    }
    lastResult = {
      schemaVersion: 1,
      durationMs: Math.round(now - sample.startedAt),
      environment: sample.environment,
      frameTime: summarizePerformanceFrames(frames),
      segments,
      metricSnapshots: sample.metrics,
      final: liveSnapshot(),
      note: 'Browser-observed frame intervals and WebGL counters. JS heap is N/A where the browser does not expose performance.memory. This is not a GPU profiler or thermal sensor.',
    };
    sample = null;
    recordButton.disabled = false;
    recordButton.textContent = 'RECORD 30S';
    status.textContent = '30-second sample ready to copy or export.';
  }

  function render(now) {
    const value = liveSnapshot();
    const r = value.renderer;
    readout.textContent = [
      `FPS NOW       ${display(value.currentFps)}`,
      `FPS AVG       ${display(value.rolling.averageFps)}`,
      `FRAME P95     ${display(value.rolling.p95Ms, ' ms')}`,
      `FRAME P99     ${display(value.rolling.p99Ms, ' ms')}`,
      `DRAW CALLS    ${display(r.drawCalls)}`,
      `TRIANGLES     ${display(r.triangles)}`,
      `LIGHTS        ${display(value.activeLights)}`,
      `NPCS          ${display(value.activeNpcs)}`,
      `CHUNKS        ${display(value.loadedChunks)}`,
      `NEIGHBORHOODS ${display(value.loadedNeighborhoods)}`,
      `PANELS        ${display(value.activeDestructionPanels)}`,
      `LOD HOUSES    ${display(value.panelLodHouses)}`,
      `RESOLUTION    ${display(r.resolution)}`,
      `PIXEL RATIO   ${display(r.pixelRatio)}`,
      `JS HEAP       ${heapDisplay(value.jsHeapBytes)}`,
      `DISTRICT      ${display(value.district)}`,
    ].join('\n');
    if (sample) {
      const remaining = Math.max(0, sampleDurationMs - (now - sample.startedAt));
      recordButton.textContent = `RECORDING ${Math.ceil(remaining / 1000)}S`;
      if (now - sample.lastMetricAt >= 1_000) {
        sample.lastMetricAt = now;
        sample.metrics.push({ offsetMs: Math.round(now - sample.startedAt), ...value });
      }
      if (remaining <= 0) finishSample(now);
    }
  }

  function start(now = performance.now()) {
    if (sample) return;
    sample = { startedAt: now, lastMetricAt: -Infinity, frames: [], timedFrames: [], metrics: [], environment: environment() };
    recordButton.disabled = true;
    status.textContent = 'Keep playing normally for 30 seconds.';
  }

  async function copy() {
    const payload = JSON.stringify(lastResult || { environment: environment(), live: liveSnapshot() }, null, 2);
    try {
      await nav.clipboard.writeText(payload);
      status.textContent = 'Results copied.';
    } catch {
      const area = doc.createElement('textarea'); area.value = payload; root.append(area); area.select();
      const ok = doc.execCommand?.('copy'); area.remove(); status.textContent = ok ? 'Results copied.' : 'Copy unavailable; use Export JSON.';
    }
  }

  function exportJson() {
    const payload = JSON.stringify(lastResult || { environment: environment(), live: liveSnapshot() }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = doc.createElement('a');
    link.href = url; link.download = `nerdie-city-mobile-perf-${new Date().toISOString().replaceAll(':', '-')}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000); status.textContent = 'JSON export created.';
  }

  root.querySelector('[data-collapse]').addEventListener('click', (event) => {
    collapsed = !collapsed; readout.hidden = collapsed; actions.hidden = collapsed; status.hidden = collapsed;
    event.currentTarget.textContent = collapsed ? 'SHOW' : 'HIDE';
  });
  recordButton.addEventListener('click', () => start());
  root.querySelector('[data-copy]').addEventListener('click', copy);
  root.querySelector('[data-export]').addEventListener('click', exportJson);

  return {
    enabled: true,
    start,
    snapshot: () => lastResult || { environment: environment(), live: liveSnapshot() },
    frame(now) {
      if (lastFrameAt) {
        lastInterval = now - lastFrameAt;
        if (lastInterval > 0 && lastInterval < 1_000) {
          rolling.push(lastInterval); if (rolling.length > 300) rolling.shift();
          if (sample) { sample.frames.push(lastInterval); sample.timedFrames.push({ at: now, ms: lastInterval }); }
        }
      }
      lastFrameAt = now;
      if (now - lastPaintAt >= 500) { lastPaintAt = now; render(now); }
    },
    dispose() { root.remove(); },
  };
}
