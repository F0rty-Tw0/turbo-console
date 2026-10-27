/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { QuietWindow } from '../../common/graph.type.ts';

/** Runs in the page, so it uses no module scope: `true` once the probe counted no Cytoscape render for `quietMs`, `false` after `timeoutMs`. */
export const settlesQuiet = async ({ quietMs, timeoutMs }: QuietWindow): Promise<boolean> => {
  const pollMs = 25;
  const rendersNow = (): number => window.__tcGraphProbe?.renderCount() ?? 0;
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
