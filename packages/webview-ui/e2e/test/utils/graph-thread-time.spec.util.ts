import type { CDPSession, Page } from '@playwright/test';

import { MS_PER_SECOND, THREAD_TIME_METRIC } from '../../common/graph.const.ts';
import type { PanCpu } from '../../common/graph.type.ts';

const threadTimeMs = async (session: CDPSession): Promise<number> => {
  const { metrics } = await session.send('Performance.getMetrics');
  const metric = metrics.find((candidate): boolean => candidate.name === THREAD_TIME_METRIC);

  if (metric === undefined) throw new Error(`graph e2e: the page reports no ${THREAD_TIME_METRIC} metric`);

  return metric.value * MS_PER_SECOND;
};

/**
 * The main-thread CPU ms `work` took in total and in its costliest step; `work` calls `endStep` after each step.
 * CPU time, not wall time, so contention for the CPU does not inflate it; core type and clock still do.
 */
export const cpuStepsOf = async (page: Page, work: (endStep: () => Promise<void>) => Promise<void>): Promise<PanCpu> => {
  const session = await page.context().newCDPSession(page);

  try {
    await session.send('Performance.enable');

    const start = await threadTimeMs(session);
    let last = start;
    let maxStepMs = 0;
    const endStep = async (): Promise<void> => {
      const now = await threadTimeMs(session);

      maxStepMs = Math.max(maxStepMs, now - last);
      last = now;
    };

    await work(endStep);

    const pan: PanCpu = { totalMs: last - start, maxStepMs };

    return pan;
  } finally {
    await session.detach().catch((): undefined => undefined);
  }
};
