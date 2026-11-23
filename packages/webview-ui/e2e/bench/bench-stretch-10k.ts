import type { Browser } from '@playwright/test';

import { withSession } from './bench-session.ts';
import { fitted, pannedFrom, settledOf, tenKOpened } from './bench-stretch-10k-frame.ts';
import { panned } from './bench-stretch-frame.ts';
import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession, TenKOpen, TenKPan } from './common/bench.type.ts';
import { stretchPanOf } from './utils/pan-trace.util.ts';
import type { GraphReady } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { TEN_K_FOLDERS, tenKGroupedSavedState, tenKPackagesState } from '../test/utils/graph-10k.spec.util.ts';
import { median } from '../test/utils/stats.spec.util.ts';

const ZOOM_IN_NOTCH = -100;

const ZOOM_OUT_NOTCH = 100;

/** The first frame of `state` opened cold over `savedState`, and the engine that laid it out. */
export const tenKOpen = async (browser: Browser, savedState: GraphViewState, state: GraphReady): Promise<TenKOpen> => {
  const opened = async (session: BenchSession): Promise<TenKOpen> => tenKOpened(session, state);

  return withSession(browser, { savedState }, opened);
};

/** `state` opened over `savedState`, framed by Fit, then panned for 2 s from a spot clear of nodes and lines. */
export const tenKPan = async (browser: Browser, savedState: GraphViewState, state: GraphReady): Promise<TenKPan> => {
  const pannedAfterOpen = async (session: BenchSession): Promise<TenKPan> => {
    const { engine } = await tenKOpened(session, state);
    const pan = await panned(session);
    const sample: TenKPan = { engine, pan };

    return sample;
  };

  return withSession(browser, { savedState }, pannedAfterOpen);
};

/** The 10k packages grouped with every folder collapsed or expanded, framed by Fit, then panned from a spot no box covers. */
export const tenKGroupedPan = async (browser: Browser, isCollapsed: boolean): Promise<TenKPan> => {
  const pannedGrouped = async (session: BenchSession): Promise<TenKPan> => {
    const packages = tenKPackagesState();
    const { engine } = await tenKOpened(session, packages);

    await fitted(session);

    const spot = await session.grouping.freeSpot(PAN_FRAMES);
    const pan = await pannedFrom(session, spot);
    const sample: TenKPan = { engine, pan };

    return sample;
  };
  const savedState = tenKGroupedSavedState(isCollapsed);

  return withSession(browser, { savedState }, pannedGrouped);
};

/** Wheels one notch per frame over the container centre: in for the first half of `PAN_FRAMES`, back out for the second. */
const wheeledPerFrame = async (session: BenchSession): Promise<void> => {
  const { mouse } = session.page;
  const half = PAN_FRAMES / 2;

  for (let frame = 0; frame < PAN_FRAMES; frame += 1) {
    const notch = frame < half ? ZOOM_IN_NOTCH : ZOOM_OUT_NOTCH;

    await mouse.wheel(0, notch);
    await session.page.evaluate(ONE_FRAME);
  }
};

/** `state` opened over `savedState`, framed by Fit, then zoomed in and back out by wheel for 2 s over the container centre. */
export const tenKZoom = async (browser: Browser, savedState: GraphViewState, state: GraphReady): Promise<TenKPan> => {
  const zoomedAfterOpen = async (session: BenchSession): Promise<TenKPan> => {
    const { page, probe, recorder } = session;
    const { engine } = await tenKOpened(session, state);

    await fitted(session);

    const container = await session.canvas.container.evaluate(readRect);
    const zoomBefore = await probe.zoom();

    await page.mouse.move(container.left + container.width / 2, container.top + container.height / 2);

    for (let frame = 0; frame < WARM_UP_FRAMES; frame += 1) await page.evaluate(ONE_FRAME);

    await recorder.markOn();
    await wheeledPerFrame(session);
    await recorder.markOff();

    const zoomAfter = await probe.zoom();
    const trace = await recorder.read();

    if (zoomAfter === zoomBefore) throw new Error(`bench 10k: the wheel zoom left the zoom at ${zoomBefore}`);

    const pan = stretchPanOf(trace);
    const sample: TenKPan = { engine, pan };

    return sample;
  };

  return withSession(browser, { savedState }, zoomedAfterOpen);
};

/** The first folder expanded and collapsed again through its list button with every folder collapsed; the median of the two `toggleMs`. */
export const tenKToggleMs = async (browser: Browser): Promise<number> => {
  const toggledMedian = async (session: BenchSession): Promise<number> => {
    const { folders, timings } = session;
    const [folder = ''] = TEN_K_FOLDERS;
    const toggleMs = async (): Promise<number | null> => timings.toggleMs();
    const packages = tenKPackagesState();

    await tenKOpened(session, packages);
    await folders.toggleInList(folder, false);

    const expandMs = await settledOf(toggleMs, `the expand of ${folder}`);

    await folders.toggleInList(folder, true);

    const collapseMs = await settledOf(toggleMs, `the collapse of ${folder}`);

    return median([expandMs, collapseMs]);
  };
  const savedState = tenKGroupedSavedState(true);

  return withSession(browser, { savedState }, toggledMedian);
};
