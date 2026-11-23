import { expect } from '@playwright/test';

import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession, StretchPan, TenKOpen } from './common/bench.type.ts';
import { TEN_K_SETTLE_MS } from './common/stretch-10k.const.ts';
import { stretchPanOf } from './utils/pan-trace.util.ts';
import { hasPanMoved } from './utils/stretch-view.util.ts';
import type { GraphState } from '../../src/bridge/common/graph-state.type.ts';
import type { LayoutEngine } from '../../src/graph/common/graph-probe.type.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';

/** Polls `read` for up to `TEN_K_SETTLE_MS` until it is not `null`, then returns it; a 10k layout can take minutes. */
export const settledOf = async <T>(read: () => Promise<T | null>, fact: string): Promise<T> => {
  const message = `bench 10k: ${fact} within ${TEN_K_SETTLE_MS} ms`;

  await expect.poll(read, { message, timeout: TEN_K_SETTLE_MS }).not.toBeNull();

  const value = await read();

  if (value === null) throw new Error(`bench 10k: ${fact} went back to null`);

  return value;
};

const engineOf = async (session: BenchSession): Promise<LayoutEngine | null> =>
  session.page.evaluate((): LayoutEngine | null => window.tcGraphProbe?.layoutEngine() ?? null);

/** The engine that laid out the graph a fresh page drew; `null` until its first layout lands. */
const settledEngineOf = async (session: BenchSession): Promise<LayoutEngine> =>
  settledOf(async (): Promise<LayoutEngine | null> => engineOf(session), 'a layout');

/** Sends `state` to a fresh page and waits for its layout and first frame; the frame is timed from receipt by the page. */
export const tenKOpened = async (session: BenchSession, state: GraphState): Promise<TenKOpen> => {
  await session.host.sendState(state);

  const engine = await settledEngineOf(session);
  const firstFrameMs = await settledOf(async (): Promise<number | null> => session.timings.firstFrameMs(), 'the first frame');
  const opened: TenKOpen = { firstFrameMs, engine };

  return opened;
};

/** Presses Fit and waits two frames: `cy.fit` is not animated, so the camera has settled by then. */
export const fitted = async (session: BenchSession): Promise<void> => {
  await session.graphPage.pressButton(FIT_LABEL);
  await session.page.evaluate(NEXT_FRAME);
};

/** Pans from `spot` for 2 s after the warm-up; throws when the viewport did not move, since a drag that grabbed a node times a still canvas. */
export const pannedFrom = async (session: BenchSession, spot: ViewportPoint): Promise<StretchPan> => {
  const { canvas, probe, recorder } = session;
  const markOn = async (): Promise<void> => recorder.markOn();
  const before = await probe.pan();

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES, spot, markOn);
  await recorder.markOff();

  const after = await probe.pan();
  const hasMoved = hasPanMoved(before, after);

  if (!hasMoved) throw new Error(`bench 10k: the scripted pan from ${spot.x},${spot.y} left the viewport at ${JSON.stringify(after)}`);

  const trace = await recorder.read();

  return stretchPanOf(trace);
};
