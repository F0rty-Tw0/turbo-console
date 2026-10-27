import type { Browser } from '@playwright/test';

import { withSession } from './bench-session.ts';
import { NOTHING_SAVED, PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession, PanSample } from './common/bench.type.ts';
import { p95 } from './utils/bench-stats.util.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import { targetLikeHubSavedState, targetLikeTasksState } from '../test/utils/graph-target-like-tasks.spec.util.ts';
import { targetLikeState } from '../test/utils/graph-target-like.spec.util.ts';

const pannedAfterElk = async (session: BenchSession): Promise<PanSample> => {
  const { canvas, host, probe, recorder } = session;
  const markOn = async (): Promise<void> => recorder.markOn();

  await host.sendState(targetLikeState());
  await probe.expectLayoutEngine('elk');
  await host.expectLayoutDone('elk');
  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES, undefined, markOn);
  await recorder.markOff();

  const trace = await recorder.read();
  const cpu = canvas.measuredPanCpu();
  const sample: PanSample = { cpuMs: cpu.totalMs, p95Ms: p95(trace.frameDeltasMs), longestLongTaskMs: trace.longestLongTaskMs };

  return sample;
};

/** One cold page of the target-like graph, laid out by ELK, then a scripted 2 s pan. */
export const targetLikePan = async (browser: Browser): Promise<PanSample> => withSession(browser, {}, pannedAfterElk);

const taskPannedCpu = async (session: BenchSession): Promise<number> => {
  const { canvas, graphPage, host, probe } = session;

  await host.sendState(targetLikeTasksState());
  await probe.expectLayoutEngine('elk');
  await graphPage.pressButton(FIT_LABEL);
  await canvas.expectAllNodesInView();
  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES);

  const cpu = canvas.measuredPanCpu();

  return cpu.totalMs;
};

/** Main-thread CPU of a scripted 2 s pan over the target-like task graph with the hub task chosen, framed by Fit first. */
export const taskPan = async (browser: Browser): Promise<number> =>
  withSession(browser, { savedState: targetLikeHubSavedState() }, taskPannedCpu);

const defaultPannedCpu = async (session: BenchSession): Promise<number> => {
  const { canvas, graphPage, grouping, host, probe } = session;

  await host.sendState(targetLikeState());
  await probe.expectLayoutEngine('elk');
  await host.expectLayoutDone('elk');
  await grouping.expectGrouped(true);
  await graphPage.pressButton(FIT_LABEL);
  await canvas.expectAllNodesInView();

  const spot = await grouping.freeSpot();

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES, spot);

  const cpu = canvas.measuredPanCpu();

  return cpu.totalMs;
};

/** Main-thread CPU of a scripted 2 s pan over the target-like graph opened with nothing saved, so grouped, framed by Fit first. */
export const targetLikeDefaultPan = async (browser: Browser): Promise<number> => withSession(browser, NOTHING_SAVED, defaultPannedCpu);
