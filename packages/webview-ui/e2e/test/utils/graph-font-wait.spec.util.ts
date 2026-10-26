import type { Page } from '@playwright/test';

import { readyPostedAt } from './graph-posted.spec.util.ts';

/** Runs in the page: when the page asked for codicon.ttf, `null` until that request is done. */
const codiconRequestedAt = (): number | null => {
  const isCodicon = (entry: PerformanceEntry): boolean => entry.name.includes('codicon.ttf');
  const entry = performance.getEntriesByType('resource').find(isCodicon);

  return entry?.startTime ?? null;
};

/** Ms from the page's codicon.ttf request to its `ready`, `null` until both happened. */
export const fontWaitOf = async (page: Page): Promise<number | null> => {
  const readyAt = await page.evaluate(readyPostedAt);
  const requestedAt = await page.evaluate(codiconRequestedAt);

  if (readyAt === null || requestedAt === null) return null;

  return readyAt - requestedAt;
};
