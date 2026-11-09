import type { ProbeHost } from '../common/graph-probe.type.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';

/** The longest delay `setTimeout` honours; a longer one is clamped to about 1 ms and would fall back at once. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * The ELK timeout the page lays out under: the host's `__tcLayoutTimeoutMs` when it is a number above 0 and at most
 * `MAX_TIMER_MS`, else `FALLBACK_TIMEOUT_MS`. Only the e2e init script sets it, so a 280 or 300 task layout on a loaded
 * CI runner does not hit the production fallback.
 */
export const layoutTimeoutOf = (host: ProbeHost): number => {
  // eslint-disable-next-line no-underscore-dangle -- the e2e init script sets this exact name on window
  const wanted = host.__tcLayoutTimeoutMs;
  const isWanted = typeof wanted === 'number' && wanted > 0 && wanted <= MAX_TIMER_MS;

  return isWanted ? wanted : FALLBACK_TIMEOUT_MS;
};
