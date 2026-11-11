// MAP-01A: builds the pedestrian walk graph off the main thread (about 0.1 s on a Mac, longer on a phone) so
// the first route never freezes the game. Pure modules only; the page checks the plan signature before use.
import { createCityPlan } from './city-layout.js';
import { buildNavGraph, encodeNavGraph, navGraphTransfer, navPlanSignature } from './city-navigation.js';

self.onmessage = (event) => {
  try {
    const t0 = performance.now(), plan = createCityPlan(event.data?.profile || 'desktop');
    const data = encodeNavGraph(buildNavGraph(plan));
    self.postMessage({ ok: true, signature: navPlanSignature(plan), buildMs: performance.now() - t0, data }, navGraphTransfer(data));
  } catch (error) {
    self.postMessage({ ok: false, error: String(error?.message || error) });
  }
};
