import { tappedUntil } from './bench-stretch-tap.ts';
import { PAN_FRAMES, WARM_UP_FRAMES } from './common/bench.const.ts';
import type { BenchSession, CanvasReading, StretchFit, StretchPan } from './common/bench.type.ts';
import { MIN_TAP_PX } from './common/stretch.const.ts';
import { stretchPanOf } from './utils/pan-trace.util.ts';
import {
  dragRegionOf,
  extentOf,
  hasPanMoved,
  isCentred,
  isPointInside,
  nodeNamed,
  offsetToCentre,
  panStepOf
} from './utils/stretch-view.util.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { FIT_LABEL } from '../../src/graph/common/graph.const.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { GraphAtoms } from '../pages/graph-atoms.po.ts';
import { GraphFraming } from '../pages/graph-framing.po.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { freeSpotOf, nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { stretchTasksState } from '../test/utils/graph-stretch.spec.util.ts';

const MAX_ZOOM_ROUNDS = 15;

const NOTCHES_PER_ROUND = 4;

const MAX_PAN_DRAGS = 40;

const DRAG_STEPS = 4;

const ZOOM_IN_NOTCH = -100;

const NO_STEP: ViewportPoint = { x: 0, y: 0 };

/** The scripted pan drags one pixel right and down per frame, so its start spot needs `PAN_FRAMES` of room on both axes. */
const PAN_STEP: ViewportPoint = { x: PAN_FRAMES, y: PAN_FRAMES };

/** Reads the zoom twice a frame apart: `cy.fit` is not animated, so a Fit that is done reads the same both times. */
const settledZoomOf = async (session: BenchSession): Promise<number> => {
  const zoom = await session.probe.zoom();

  await session.page.evaluate(ONE_FRAME);

  const later = await session.probe.zoom();

  if (zoom <= 0 || zoom !== later) throw new Error(`bench stretch: Fit left the zoom at ${zoom}, then ${later}`);

  return zoom;
};

/**
 * Fit, then the zoom it settled at and some drawn node inside the container. At 1500 tasks the layout is one tall column that
 * Fit can only frame at its minimum zoom, so "every node in view" cannot hold; a node in view still catches a pan over an empty corner.
 */
const framed = async (session: BenchSession): Promise<StretchFit> => {
  await session.graphPage.pressButton(FIT_LABEL);
  const framing = new GraphFraming(session.page);

  await framing.expectSomeNodeInView();

  const zoom = await settledZoomOf(session);
  const nodes = await session.probe.nodes();
  const extent = extentOf(nodes);
  const fit: StretchFit = { zoom, extent };

  return fit;
};

/** The stretch state sent, laid out by ELK, and framed; returns the Fit it was framed by. */
export const stretchOpened = async (session: BenchSession): Promise<StretchFit> => {
  await session.host.sendState(stretchTasksState());
  await session.probe.expectLayoutEngine('elk');

  return framed(session);
};

/** One reading of the canvas: the container rect, every drawn node and the zoom. */
const readingOf = async (session: BenchSession): Promise<CanvasReading> => {
  const container = await session.canvas.container.evaluate(readRect);
  const nodes = await session.probe.nodes();
  const zoom = await session.probe.zoom();
  const reading: CanvasReading = { container, nodes, zoom };

  return reading;
};

/** The first grid point of the canvas that no node covers and from which a drag by `step` stays in the container; 1500 tasks leave too few gaps for the edge-clear spot of a package graph. */
const dragSpotOf = (reading: CanvasReading, step: ViewportPoint): ViewportPoint => {
  const { container, nodes, zoom } = reading;
  const boxOf = (node: ProbeNode): ElementRect => nodeBoxOf(node, zoom);
  const boxes = nodes.map(boxOf);
  const region = dragRegionOf(container, step);

  return freeSpotOf(region, boxes);
};

/** Presses at `start` on empty canvas and drags by `step`; `dragRegionOf` kept the whole path inside the container. */
const draggedBy = async (session: BenchSession, start: ViewportPoint, step: ViewportPoint): Promise<void> => {
  const { mouse } = session.page;

  await mouse.move(start.x, start.y);
  await mouse.down();
  await mouse.move(start.x + step.x, start.y + step.y, { steps: DRAG_STEPS });
  await mouse.up();
};

/** Taps empty canvas so no task stays selected: the selected task's "…" would sit over a small umbrella and eat its wheel and taps. */
const deselected = async (session: BenchSession): Promise<void> => {
  const reading = await readingOf(session);
  const spot = dragSpotOf(reading, NO_STEP);

  await session.page.mouse.click(spot.x, spot.y);
};

/** Drags the canvas, in chunks of at most half the viewport, until the node sits near the container centre. */
const centredOn = async (session: BenchSession, id: string): Promise<void> => {
  for (let drag = 0; drag < MAX_PAN_DRAGS; drag += 1) {
    const reading = await readingOf(session);
    const node = nodeNamed(reading.nodes, id);
    const offset = offsetToCentre(node, reading.container);
    const isDone = isCentred(offset);

    if (isDone) return;

    const step = panStepOf(offset, reading.container);
    const start = dragSpotOf(reading, step);

    await draggedBy(session, start, step);
  }

  throw new Error(`bench stretch: ${id} stayed off the container centre after ${MAX_PAN_DRAGS} drags`);
};

/**
 * Wheels over the node, a few notches per reading, until it renders `MIN_TAP_PX` wide; a wheel zoom keeps the point under
 * the cursor in place, and each reading serializes every drawn node, so it is the costly step.
 */
const zoomedOnto = async (session: BenchSession, id: string): Promise<void> => {
  const atoms = new GraphAtoms(session.page);

  for (let round = 0; round < MAX_ZOOM_ROUNDS; round += 1) {
    const node = await atoms.nodeOf(id);
    const zoom = await session.probe.zoom();
    const isTapSized = node.width * zoom >= MIN_TAP_PX;

    if (isTapSized) return;

    await session.page.mouse.move(node.renderedX, node.renderedY);

    for (let notch = 0; notch < NOTCHES_PER_ROUND; notch += 1) await session.page.mouse.wheel(0, ZOOM_IN_NOTCH);
  }

  throw new Error(`bench stretch: ${id} stayed under ${MIN_TAP_PX} px after ${MAX_ZOOM_ROUNDS} rounds`);
};

/** The node's rendered centre lies inside the container, so a tap there reaches the canvas; throws when it does not. */
const expectCentreInside = async (session: BenchSession, id: string): Promise<void> => {
  const reading = await readingOf(session);
  const node = nodeNamed(reading.nodes, id);
  const centre: ViewportPoint = { x: node.renderedX, y: node.renderedY };
  const isInContainer = isPointInside(centre, reading.container);

  if (!isInContainer) throw new Error(`bench stretch: ${id} centre ${centre.x},${centre.y} is outside the container`);
};

/**
 * Frames the graph, drags the umbrella to the container centre (Fit may leave it off screen), zooms onto it when it is
 * too small to tap, and double taps it until its box is `isDrawn`.
 */
export const toggledAt = async (session: BenchSession, id: string, isDrawn: boolean): Promise<void> => {
  await framed(session);
  await deselected(session);
  await centredOn(session, id);
  await zoomedOnto(session, id);
  await expectCentreInside(session, id);
  await tappedUntil(session, id, isDrawn);
};

/** Expands each umbrella in turn, waiting for its box before the next. */
export const expanded = async (session: BenchSession, ids: string[]): Promise<void> => {
  for (const id of ids) await toggledAt(session, id, true);
};

/** The scripted pan moved the viewport away from `before`; a drag that grabbed nothing would time a still canvas. */
const expectPanMoved = async (session: BenchSession, before: Position | null): Promise<void> => {
  const after = await session.probe.pan();
  const hasMoved = hasPanMoved(before, after);

  if (!hasMoved) throw new Error(`bench stretch: the scripted pan left the viewport at ${JSON.stringify(after)}`);
};

/** Frames the graph, pans it for 2 s after the warm-up, and returns the p95 frame time and longest long task inside the pan window. */
export const panned = async (session: BenchSession): Promise<StretchPan> => {
  const { canvas, recorder } = session;
  const markOn = async (): Promise<void> => recorder.markOn();

  await framed(session);
  await deselected(session);

  const reading = await readingOf(session);
  const spot = dragSpotOf(reading, PAN_STEP);

  const panBefore = await session.probe.pan();

  await canvas.scriptedPan(WARM_UP_FRAMES, PAN_FRAMES, spot, markOn);
  await recorder.markOff();
  await expectPanMoved(session, panBefore);

  const trace = await recorder.read();

  return stretchPanOf(trace);
};
