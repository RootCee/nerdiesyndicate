const percentile = (values, ratio) => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
};

export function createAdaptiveResolution({
  enabled = false,
  initial = 1,
  minimum = 0.65,
  maximum = 1,
  downThresholdMs = 24,
  upThresholdMs = 18.5,
  sampleMs = 2_000,
  cooldownMs = 4_000,
  onChange = () => {},
} = {}) {
  let scale = Math.max(minimum, Math.min(maximum, initial));
  let windowStarted = 0;
  let changedAt = -Infinity;
  let healthyWindows = 0;
  const frames = [];

  const api = {
    enabled,
    get scale() { return scale; },
    frame(intervalMs, now) {
      if (!enabled || !Number.isFinite(intervalMs) || intervalMs <= 0 || intervalMs > 250) return scale;
      if (!windowStarted) windowStarted = now;
      frames.push(intervalMs);
      if (now - windowStarted < sampleMs) return scale;
      const p95 = percentile(frames, 0.95);
      frames.length = 0;
      windowStarted = now;
      if (now - changedAt < cooldownMs) return scale;
      let next = scale;
      if (p95 > downThresholdMs) {
        healthyWindows = 0;
        next = Math.max(minimum, +(scale - 0.1).toFixed(2));
      } else if (p95 < upThresholdMs) {
        healthyWindows++;
        if (healthyWindows >= 4) {
          healthyWindows = 0;
          next = Math.min(maximum, +(scale + 0.05).toFixed(2));
        }
      } else healthyWindows = 0;
      if (next !== scale) {
        scale = next;
        changedAt = now;
        onChange(scale, { p95 });
      }
      return scale;
    },
    snapshot() {
      return { enabled, scale, minimum, maximum, downThresholdMs, upThresholdMs };
    },
  };
  return api;
}
