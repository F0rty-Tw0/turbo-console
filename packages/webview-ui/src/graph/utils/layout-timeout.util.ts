import type { ProbeHost } from '../common/graph-probe.type.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';

/**
 * The ELK timeout the page lays out under: the host's `__tcLayoutTimeoutMs` when it is a finite number above 0, else
 * `FALLBACK_TIMEOUT_MS`. Only the e2e init script sets it, so a 280 or 300 task layout on a loaded CI runner does not
 * hit the production fallback.
 */
export const layoutTimeoutOf = (host: ProbeHost): number => {
  // eslint-disable-next-line no-underscore-dangle -- the e2e init script sets this exact name on window
  const wanted = host.__tcLayoutTimeoutMs;
  const isWanted = typeof wanted === 'number' && Number.isFinite(wanted) && wanted > 0;

  return isWanted ? wanted : FALLBACK_TIMEOUT_MS;
};
