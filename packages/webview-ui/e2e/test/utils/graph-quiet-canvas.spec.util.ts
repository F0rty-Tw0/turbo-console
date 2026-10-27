/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { QuietWindow } from '../../common/graph.type.ts';

/** Runs in the page: the Cytoscape renders since the page opened; throws when the page exposes no probe. */
export const rendersSoFar = (): number => {
  const probe = window.__tcGraphProbe;

  if (probe === undefined) throw new Error('graph e2e: the page exposes no probe to count renders with');

  return probe.renderCount();
};

/**
 * Runs in the page, so it uses no module scope: `true` once the probe counted no Cytoscape render for `quietMs`, `false`
 * after `timeoutMs`; throws when the page exposes no probe, so a missing probe never reads as a quiet canvas.
 */
export const settlesQuiet = async ({ quietMs, timeoutMs }: QuietWindow): Promise<boolean> => {
  const pollMs = 25;
  const probe = window.__tcGraphProbe;

  if (probe === undefined) throw new Error('graph e2e: the page exposes no probe to count renders with');

  const rendersNow = (): number => probe.renderCount();
  const sleep = async (): Promise<void> => new Promise((done): void => void setTimeout(done, pollMs));
  const startedAt = performance.now();
  let lastCount = rendersNow();
  let quietSince = startedAt;

  let now = startedAt;

  while (now - startedAt < timeoutMs) {
    const count = rendersNow();

    if (count !== lastCount) {
      lastCount = count;
      quietSince = now;
    }

    if (now - quietSince >= quietMs) return true;

    await sleep();

    now = performance.now();
  }

  return false;
};
