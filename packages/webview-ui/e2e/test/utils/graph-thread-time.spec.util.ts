import type { CDPSession, Page } from '@playwright/test';

import { MS_PER_SECOND, THREAD_TIME_METRIC } from '../../common/graph.const.ts';

const threadTimeMs = async (session: CDPSession): Promise<number> => {
  const { metrics } = await session.send('Performance.getMetrics');
  const metric = metrics.find((candidate): boolean => candidate.name === THREAD_TIME_METRIC);

  if (metric === undefined) throw new Error(`graph e2e: the page reports no ${THREAD_TIME_METRIC} metric`);

  return metric.value * MS_PER_SECOND;
};

/** The ms of main-thread CPU time `work` took: CPU time, not wall time, so a starved renderer does not inflate it. */
export const cpuTimeOf = async (page: Page, work: () => Promise<void>): Promise<number> => {
  const session = await page.context().newCDPSession(page);

  await session.send('Performance.enable');

  const before = await threadTimeMs(session);

  await work();

  const after = await threadTimeMs(session);

  await session.detach();

  return after - before;
};
