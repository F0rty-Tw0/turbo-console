import type { Position } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { ElementRect, ViewportPoint } from '../../common/playwright.type.ts';
import type { StretchExtent, StretchFit } from '../common/bench.type.ts';

/** A drag or a start spot keeps this far from the container edge. */
const EDGE_MARGIN_PX = 4;

/** An umbrella this close to the container centre counts as centred. */
const CENTRED_WITHIN_PX = 40;

const xOf = (node: ProbeNode): number => node.x;

const yOf = (node: ProbeNode): number => node.y;

const spanOf = (values: number[]): number => Math.max(...values) - Math.min(...values);

/** The width and height of the box that holds every node's model centre; throws without nodes. */
export const extentOf = (nodes: ProbeNode[]): StretchExtent => {
  if (nodes.length === 0) throw new Error('bench stretch: no node to measure an extent of');

  const extent: StretchExtent = { width: spanOf(nodes.map(xOf)), height: spanOf(nodes.map(yOf)) };

  return extent;
};

/** The drawn node named `id`; throws when it is not drawn. */
export const nodeNamed = (nodes: ProbeNode[], id: string): ProbeNode => {
  const node = nodes.find((candidate): boolean => candidate.id === id);

  if (node === undefined) throw new Error(`bench stretch: ${id} is not drawn`);

  return node;
};

/** The finding the open row records: `stretch fit zoom 0.050 extent 1993x77794`. */
export const fitNoteOf = (fit: StretchFit): string => {
  const { width, height } = fit.extent;

  return `stretch fit zoom ${fit.zoom.toFixed(3)} extent ${Math.round(width)}x${Math.round(height)}`;
};

/** How far the node's rendered centre sits from the container centre, as the drag that would bring it there. */
export const offsetToCentre = (node: ProbeNode, container: ElementRect): ViewportPoint => {
  const offset: ViewportPoint = {
    x: container.left + container.width / 2 - node.renderedX,
    y: container.top + container.height / 2 - node.renderedY
  };

  return offset;
};

export const isCentred = (offset: ViewportPoint): boolean => Math.hypot(offset.x, offset.y) <= CENTRED_WITHIN_PX;

const clampedTo = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

/** `offset`, cut to at most half the container per axis, so one drag stays inside the viewport. */
export const panStepOf = (offset: ViewportPoint, container: ElementRect): ViewportPoint => {
  const step: ViewportPoint = { x: clampedTo(offset.x, container.width / 2), y: clampedTo(offset.y, container.height / 2) };

  return step;
};

/** The part of the container where a drag by `step` can start and still end inside it. */
export const dragRegionOf = (container: ElementRect, step: ViewportPoint): ElementRect => {
  const region: ElementRect = {
    left: container.left + EDGE_MARGIN_PX + Math.max(0, -step.x),
    top: container.top + EDGE_MARGIN_PX + Math.max(0, -step.y),
    width: container.width - 2 * EDGE_MARGIN_PX - Math.abs(step.x),
    height: container.height - 2 * EDGE_MARGIN_PX - Math.abs(step.y)
  };

  return region;
};

/** The point lies wholly inside the container rect. */
export const isPointInside = (point: ViewportPoint, container: ElementRect): boolean => {
  const isAcross = point.x >= container.left && point.x <= container.left + container.width;
  const isDown = point.y >= container.top && point.y <= container.top + container.height;

  return isAcross && isDown;
};

/** The viewport pan read after a scripted pan differs from the one read before it; a missing reading counts as not moved. */
export const hasPanMoved = (before: Position | null, after: Position | null): boolean => {
  if (before === null || after === null) return false;

  return before.x !== after.x || before.y !== after.y;
};
