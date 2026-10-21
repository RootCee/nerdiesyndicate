const CAP = 12000;

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function summarize(values) {
  return {
    samples: values.length,
    p50: +percentile(values, 0.5).toFixed(3),
    p95: +percentile(values, 0.95).toFixed(3),
    p99: +percentile(values, 0.99).toFixed(3),
    max: +(values.length ? Math.max(...values) : 0).toFixed(3),
    total: +values.reduce((sum, value) => sum + value, 0).toFixed(3),
  };
}

// Developer-only main-thread instrumentation. It is disabled unless ?perf=1
// is present, so the release path pays only a predictable boolean branch.
export function createPerformanceProfiler(enabled = false) {
  const systems = new Map(), frames = [], longTasks = [], transitions = [];
  if (enabled && 'PerformanceObserver' in window) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({ start: +entry.startTime.toFixed(2), duration: +entry.duration.toFixed(2) });
          if (longTasks.length > 256) longTasks.shift();
        }
      }).observe({ type: 'longtask', buffered: false });
    } catch {}
  }
  const push = (list, value) => { list.push(value); if (list.length > CAP) list.shift(); };
  return {
    enabled,
    start() { return enabled ? performance.now() : 0; },
    end(name, started) {
      if (!enabled) return;
      if (!systems.has(name)) systems.set(name, []);
      push(systems.get(name), performance.now() - started);
    },
    frame(started) { if (enabled) push(frames, performance.now() - started); },
    transition(detail) { if (enabled) transitions.push({ at: +performance.now().toFixed(2), ...detail }); },
    reset() { systems.clear(); frames.length = 0; longTasks.length = 0; transitions.length = 0; },
    snapshot() {
      return {
        enabled,
        frame: summarize(frames),
        systems: Object.fromEntries([...systems].map(([name, values]) => [name, summarize(values)])),
        longTasks: longTasks.slice(),
        transitions: transitions.slice(),
      };
    },
  };
}
