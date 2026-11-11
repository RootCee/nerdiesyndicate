// MAP-01A: the page's walk graph. prewarm() builds it in a background worker soon after the city loads; get()
// returns it at once when ready, else builds it on the spot (the old behaviour, now ~0.1 s) — so routes never
// wait on the worker and are identical either way. A worker graph is used only if its plan signature matches
// this city's plan; any worker failure leaves the on-the-spot build. Client only: nothing is sent anywhere.
import { buildNavGraph, decodeNavGraph, navPlanSignature } from './city-navigation.js';

export function createNavGraphLoader({ plan, build = buildNavGraph, WorkerCtor = globalThis.Worker, workerUrl = null, now = () => performance.now() } = {}) {
  let graph = null, worker = null;
  const stats = { source: null, buildMs: null, workerMs: null, decodeMs: null, workerState: 'idle', workerError: null };
  const stop = () => { try { worker?.terminate(); } catch {} worker = null; };
  return {
    stats,
    get ready() { return !!graph; },
    get() {
      if (graph) return graph;
      const t0 = now(); graph = build(plan); stats.buildMs = now() - t0; stats.source = 'main-thread';
      if (worker) { stats.workerState = 'superseded'; stop(); }
      return graph;
    },
    prewarm() {
      if (graph || worker || !WorkerCtor || !workerUrl) return false;
      try { worker = new WorkerCtor(workerUrl, { type: 'module' }); } catch (error) { stats.workerState = 'unavailable'; stats.workerError = String(error?.message || error); return false; }
      stats.workerState = 'building';
      worker.onmessage = (event) => {
        const m = event.data || {}; stop();
        if (graph) { stats.workerState = 'superseded'; return; }
        if (!m.ok) { stats.workerState = 'failed'; stats.workerError = m.error || 'unknown'; return; }
        if (m.signature !== navPlanSignature(plan)) { stats.workerState = 'plan-mismatch'; return; }
        const t0 = now(); graph = decodeNavGraph(m.data); stats.decodeMs = now() - t0;
        stats.workerMs = m.buildMs; stats.source = 'worker'; stats.workerState = 'done';
      };
      worker.onerror = (event) => { stats.workerState = 'failed'; stats.workerError = String(event?.message || 'worker error'); event?.preventDefault?.(); stop(); };
      worker.postMessage({ profile: plan?.profile?.key || 'desktop' });
      return true;
    },
  };
}
