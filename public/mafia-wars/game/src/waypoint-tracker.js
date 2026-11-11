// MAP-01A: following a waypoint — arrival, pausing indoors, and re-routing after straying — moved out of
// main.js unchanged so Node tests can drive it. Client only: waypoints never leave this device.
import { findRoute, routeProgress } from './city-navigation.js';

export const WAYPOINT_RULES = Object.freeze({ arrivalM: 3.5, offRouteM: 8, recheckMs: 500 });

// getGraph: () => walk graph (built on first need). update() reports what the HUD should show:
//   { status: 'none' }                       no waypoint
//   { status: 'arrived', target }            reached (entered its space, or within arrivalM of the route's end) — cleared
//   { status: 'hidden', target }             arena modes: kept, not shown
//   { status: 'paused', target }             indoors: kept, not shown on the street
//   { status: 'active', target, progress, note }  progress = routeProgress(); note '' | 'HEAD TO A STREET' | 'NO ROUTE'
export function createWaypointTracker({ getGraph, route = findRoute, progressOf = routeProgress, rules = WAYPOINT_RULES } = {}) {
  let target = null, path = null, note = '', checkAt = 0;
  const tracker = {
    get target() { return target; },
    get route() { return path; },
    get note() { return note; },
    set(next, nextRoute) { target = next; path = nextRoute; note = ''; checkAt = 0; },
    clear() { target = null; path = null; note = ''; },
    // position {x,z}; here: the space the player is in ('' outdoors); mode 'city' | 'arena'; indoors: in any interior.
    update(now, { position, here = '', mode = 'city', indoors = false }) {
      if (!target) return { status: 'none' };
      if (target.spaceId && here === target.spaceId) { const t = target; tracker.clear(); return { status: 'arrived', target: t }; }
      if (mode !== 'city') return { status: 'hidden', target };
      if (indoors) return { status: 'paused', target };
      const progress = progressOf(path.points, position);
      if (progress.remaining < rules.arrivalM) { const t = target; tracker.clear(); return { status: 'arrived', target: t }; }
      if (now >= checkAt) {
        checkAt = now + rules.recheckMs;
        if (progress.offRoute > rules.offRouteM) {
          const next = route(getGraph(), position, target.entry, target);
          if (next.ok) { path = next; note = ''; return { status: 'active', target, progress, note, rerouted: true }; }
          note = next.reason === 'off-street' || next.reason === 'start-blocked' ? 'HEAD TO A STREET' : 'NO ROUTE';
        } else note = '';
      }
      return { status: 'active', target, progress, note };
    },
  };
  return tracker;
}
