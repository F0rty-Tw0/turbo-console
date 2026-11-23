import type { Browser } from '@playwright/test';

import { withSession } from './bench-session.ts';
import { pannedFrom, settledOf } from './bench-stretch-10k-frame.ts';
import { PAN_FRAMES } from './common/bench.const.ts';
import type { BenchSession, StretchPan } from './common/bench.type.ts';
import { dragRegionOf } from './utils/stretch-view.util.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { DIR_PREFIX } from '../../src/graph/common/graph-module.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { GraphModulesHost } from '../pages/graph-modules-host.po.ts';
import { TASK_MODE_STATE_STUB } from '../test/stubs/graph-task-mode.stub.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { freeSpotOf, nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { modulesAtCapOf, modulesSavedState } from '../test/utils/graph-modules.spec.util.ts';

/** The tripwire's drawing of the 5000-file payload at D9: the root box, 250 folders and 50 stubs. */
const CAP_NODE_COUNT = 301;

const PAN_STEP: ViewportPoint = { x: PAN_FRAMES, y: PAN_FRAMES };

/** The root box spans the whole drawing, so a free spot is looked for among its leaves only. */
const ROOT_BOX_ID = DIR_PREFIX;

const modulesOptions = (): GraphOptions => {
  const saved = modulesSavedState('app');
  const savedState: GraphViewState = { ...saved, controlsOpen: true, detailsOpen: true };
  const options: GraphOptions = { savedState };

  return options;
};

/**
 * Opens straight into modules mode on `app`, sends the package state, answers the scan with the 5000-file payload, waits
 * for its 301 nodes and returns the first frame. No engine is read: in modules mode the probe reports the package
 * layout's engine, which stays `null` because the package draw is held.
 */
const shownAtCap = async (session: BenchSession): Promise<number> => {
  const modulesHost = new GraphModulesHost(session.page);
  const payload = modulesAtCapOf();

  await session.host.sendState(TASK_MODE_STATE_STUB);
  await modulesHost.expectModulesAsked('app', 1);
  await modulesHost.answerModules(payload);
  await session.probe.expectNodeCount(CAP_NODE_COUNT);

  return settledOf(async (): Promise<number | null> => session.timings.firstFrameMs(), 'the modules first frame');
};

/** The modules first frame at the file cap, timed from the scan reply's receipt. */
export const tenKModulesOpen = async (browser: Browser): Promise<number> => withSession(browser, modulesOptions(), shownAtCap);

const isLeaf = (node: ProbeNode): boolean => node.id !== ROOT_BOX_ID;

/** A spot inside the root box that no leaf covers and no line passes near, with room for the pan. */
const leafFreeSpotOf = async (session: BenchSession): Promise<ViewportPoint> => {
  const container = await session.canvas.container.evaluate(readRect);
  const zoom = await session.probe.zoom();
  const nodes = await session.probe.nodes();
  const lines = await readEdgeLines(session.page);
  const boxOf = (node: ProbeNode): ElementRect => nodeBoxOf(node, zoom);
  const leaves = nodes.filter(isLeaf);
  const boxes = leaves.map(boxOf);
  const region = dragRegionOf(container, PAN_STEP);

  return freeSpotOf(region, boxes, lines);
};

/** The modules view at the file cap, fitted on its first Shown, panned for 2 s from a spot clear of its leaves. */
export const tenKModulesPan = async (browser: Browser): Promise<StretchPan> => {
  const pannedAtCap = async (session: BenchSession): Promise<StretchPan> => {
    await shownAtCap(session);

    const spot = await leafFreeSpotOf(session);

    return pannedFrom(session, spot);
  };

  return withSession(browser, modulesOptions(), pannedAtCap);
};
