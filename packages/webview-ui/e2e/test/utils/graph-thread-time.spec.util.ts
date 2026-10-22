/* eslint-disable -- C44 probe instrumentation, removed before merge */
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
    const t0 = performance.now();
    let lastWall = t0;
    let last = start;
    let maxStepMs = 0;
    const steps: string[] = [];
    const endStep = async (): Promise<void> => {
      const now = await threadTimeMs(session);
      const wall = performance.now();

      steps.push(`${(wall - lastWall).toFixed(0)}/${(now - last).toFixed(1)}`);
      maxStepMs = Math.max(maxStepMs, now - last);
      last = now;
      lastWall = wall;
    };

    await work(endStep);

    const series = maxStepMs >= 20 ? steps.join(' ') : steps.slice(0, 4).join(' ');

    console.log(
      `C44 pan start=${start.toFixed(1)} total=${(last - start).toFixed(1)} max=${maxStepMs.toFixed(1)} wall=${(lastWall - t0).toFixed(0)} steps(wall/cpu)=${series}`
    );

    const pan: PanCpu = { totalMs: last - start, maxStepMs };

    return pan;
  } finally {
    await session.detach().catch((): undefined => undefined);
  }
};
