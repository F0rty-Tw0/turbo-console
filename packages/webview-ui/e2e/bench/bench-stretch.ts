import type { Browser } from '@playwright/test';

import { withSession } from './bench-session.ts';
import { expanded, panFrameMs, stretchOpened, toggledAt } from './bench-stretch-frame.ts';
import type { BenchSession, LargeSample, OpenSample } from './common/bench.type.ts';
import { MEDIUM_EXPANDED } from './common/stretch.const.ts';
import { median } from './utils/bench-stats.util.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { STRETCH_UMBRELLAS, stretchSavedState } from '../test/utils/graph-stretch.spec.util.ts';

const BYTES_PER_MB = 1024 * 1024;

const stretchOptions = (): GraphOptions => {
  const options: GraphOptions = { savedState: stretchSavedState() };

  return options;
};

const openedFirstFrame = async (session: BenchSession): Promise<OpenSample> => {
  const fit = await stretchOpened(session);
  const firstFrameMs = await session.timings.measuredFirstFrameMs();
  const sample: OpenSample = { firstFrameMs, fit };

  return sample;
};

/** First frame of the stretch state opened in task mode with every task chosen and every group collapsed, and the Fit that framed it. */
export const stretchOpen = async (browser: Browser): Promise<OpenSample> => withSession(browser, stretchOptions(), openedFirstFrame);

/** Median frame time of a 2 s pan over the stretch graph with the first `expandCount` umbrellas expanded. */
export const stretchPan = async (browser: Browser, expandCount: number): Promise<number> => {
  const pannedAfterExpanding = async (session: BenchSession): Promise<number> => {
    await stretchOpened(session);
    await expanded(session, STRETCH_UMBRELLAS.slice(0, expandCount));

    return panFrameMs(session);
  };

  return withSession(browser, stretchOptions(), pannedAfterExpanding);
};

const toggledMedian = async (session: BenchSession): Promise<number> => {
  const target = STRETCH_UMBRELLAS.at(MEDIUM_EXPANDED);

  if (target === undefined) throw new Error('bench stretch: no umbrella left to toggle');

  await stretchOpened(session);
  await expanded(session, STRETCH_UMBRELLAS.slice(0, MEDIUM_EXPANDED));
  await toggledAt(session, target, true);

  const expandMs = await session.timings.measuredAtomToggleMs();

  await toggledAt(session, target, false);

  const collapseMs = await session.timings.measuredAtomToggleMs();

  return median([expandMs, collapseMs]);
};

/** The sixth umbrella expanded and collapsed once with five others expanded; the median of the probe's two `atomToggleMs`. */
export const stretchToggleMs = async (browser: Browser): Promise<number> => withSession(browser, stretchOptions(), toggledMedian);

/** JS heap in use after a forced collection. */
const heapMbOf = async (session: BenchSession): Promise<number> => {
  const cdp = await session.page.context().newCDPSession(session.page);

  await cdp.send('HeapProfiler.collectGarbage');

  const usage = await cdp.send('Runtime.getHeapUsage');

  await cdp.detach();

  return usage.usedSize / BYTES_PER_MB;
};

const largePanned = async (session: BenchSession): Promise<LargeSample> => {
  await stretchOpened(session);
  await expanded(session, STRETCH_UMBRELLAS);

  const frameMs = await panFrameMs(session);
  const heapMb = await heapMbOf(session);
  const sample: LargeSample = { frameMs, heapMb };

  return sample;
};

/** All 20 umbrellas expanded, then a 2 s pan and the heap. */
export const stretchLarge = async (browser: Browser): Promise<LargeSample> => withSession(browser, stretchOptions(), largePanned);
