import type { CDPSession, Page } from '@playwright/test';

import { MS_PER_SECOND, THREAD_TIME_METRIC } from '../../common/graph.const.ts';
import type { CpuSteps } from '../../common/graph.type.ts';

const threadTimeMs = async (session: CDPSession): Promise<number> => {
  const { metrics } = await session.send('Performance.getMetrics');
  const metric = metrics.find((candidate): boolean => candidate.name === THREAD_TIME_METRIC);

  if (metric === undefined) throw new Error(`graph e2e: the page reports no ${THREAD_TIME_METRIC} metric`);

  return metric.value * MS_PER_SECOND;
};

/**
 * The main-thread CPU ms `work` took in total and in its cheapest and costliest step; `work` calls `endStep` after each step.
 * CPU time, not wall time, so contention for the CPU does not inflate it; core type and clock still do.
 */
export const cpuStepsOf = async (page: Page, work: (endStep: () => Promise<void>) => Promise<void>): Promise<CpuSteps> => {
  const session = await page.context().newCDPSession(page);

  try {
    // The default time domain starts the clock unchecked: on Windows, ThreadTime reads 0 until Chromium has timed the
    // TSC rate over 50 ms, then jumps by all the CPU the thread used since it started (C44, two Windows CI failures).
    // `threadTicks` makes Chromium wait for that timing before the clock's origin is taken.
    await session.send('Performance.enable', { timeDomain: 'threadTicks' });

    const start = await threadTimeMs(session);
    let last = start;
    let minStepMs = Number.POSITIVE_INFINITY;
    let maxStepMs = 0;
    const endStep = async (): Promise<void> => {
      const now = await threadTimeMs(session);
      const stepMs = now - last;

      minStepMs = Math.min(minStepMs, stepMs);
      maxStepMs = Math.max(maxStepMs, stepMs);
      last = now;
    };

    await work(endStep);

    const cpu: CpuSteps = { totalMs: last - start, minStepMs, maxStepMs };

    return cpu;
  } finally {
    await session.detach().catch((): undefined => undefined);
  }
};
