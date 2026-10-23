import type { Browser } from '@playwright/test';

import { withSession } from './bench-session.ts';
import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession, PanSample } from './common/bench.type.ts';
import { p95 } from './utils/bench-stats.util.ts';
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
  const cpu = canvas.lastPanCpu();

  if (cpu === null) throw new Error('bench: the scripted pan recorded no CPU');

  const sample: PanSample = { cpuMs: cpu.totalMs, p95Ms: p95(trace.frameDeltasMs), longestLongTaskMs: trace.longestLongTaskMs };

  return sample;
};

/** One cold page of the target-like graph, laid out by ELK, then a scripted 2 s pan. */
export const targetLikePan = async (browser: Browser): Promise<PanSample> => withSession(browser, {}, pannedAfterElk);
