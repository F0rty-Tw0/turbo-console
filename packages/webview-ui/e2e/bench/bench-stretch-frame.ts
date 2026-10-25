import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession } from './common/bench.type.ts';
import { MIN_TAP_PX } from './common/stretch.const.ts';
import { median } from './utils/bench-stats.util.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { GraphAtoms } from '../pages/graph-atoms.po.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { freeSpotOf, nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { stretchTasksState } from '../test/utils/graph-stretch.spec.util.ts';

const MAX_ZOOM_NOTCHES = 60;

const ZOOM_IN_NOTCH = -100;

/** Fit, then every node in view: the saved camera may look at an empty corner, and a tap or a pan needs the graph on screen. */
const framed = async (session: BenchSession): Promise<void> => {
  await session.graphPage.pressButton(FIT_LABEL);
  await session.canvas.expectAllNodesInView();
};

/** The stretch state sent, laid out by ELK, and framed. */
export const stretchOpened = async (session: BenchSession): Promise<void> => {
  await session.host.sendState(stretchTasksState());
  await session.probe.expectLayoutEngine('elk');
  await framed(session);
};

/** Wheels over the node until it renders `MIN_TAP_PX` wide; a wheel zoom keeps the point under the cursor in place. */
const zoomedOnto = async (session: BenchSession, id: string): Promise<void> => {
  const atoms = new GraphAtoms(session.page);

  for (let notch = 0; notch < MAX_ZOOM_NOTCHES; notch += 1) {
    const node = await atoms.nodeOf(id);
    const zoom = await session.probe.zoom();
    const isTapSized = node.width * zoom >= MIN_TAP_PX;

    if (isTapSized) return;

    await session.page.mouse.move(node.renderedX, node.renderedY);
    await session.page.mouse.wheel(0, ZOOM_IN_NOTCH);
  }

  throw new Error(`bench stretch: ${id} stayed under ${MIN_TAP_PX} px after ${MAX_ZOOM_NOTCHES} notches`);
};

/** Frames the graph, zooms onto the umbrella when it is too small to tap, and double taps it. */
export const toggledAt = async (session: BenchSession, id: string): Promise<void> => {
  await framed(session);
  await zoomedOnto(session, id);

  const atoms = new GraphAtoms(session.page);

  await atoms.toggle(id);
};

/** Expands each umbrella in turn, waiting for its box before the next. */
export const expanded = async (session: BenchSession, ids: string[]): Promise<void> => {
  const atoms = new GraphAtoms(session.page);

  for (const id of ids) {
    await toggledAt(session, id);
    await atoms.expectBoxDrawn(id, true);
  }
};

/** The first grid point of the canvas that no node covers; 1500 tasks leave too few gaps for the edge-clear spot of a package graph. */
const panSpotOf = async (session: BenchSession): Promise<ViewportPoint> => {
  const container = await session.canvas.container.evaluate(readRect);
  const nodes = await session.probe.nodes();
  const zoom = await session.probe.zoom();
  const boxOf = (node: ProbeNode): ElementRect => nodeBoxOf(node, zoom);
  const boxes = nodes.map(boxOf);

  return freeSpotOf(container, boxes);
};

/** Frames the graph, pans it for 2 s after the warm-up, and returns the median frame time inside the pan window. */
export const panFrameMs = async (session: BenchSession): Promise<number> => {
  const { canvas, recorder } = session;
  const markOn = async (): Promise<void> => recorder.markOn();

  await framed(session);

  const spot = await panSpotOf(session);

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES, spot, markOn);
  await recorder.markOff();

  const trace = await recorder.read();

  return median(trace.frameDeltasMs);
};
