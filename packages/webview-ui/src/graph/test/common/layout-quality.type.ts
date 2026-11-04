import type { Position } from '../../../bridge/common/graph-state.type.ts';

/**
 * How readable a laid-out graph is, scored like the U6c harness (`~/.cache/tc-u6c-plan/harness.mjs` `score`): the fit zoom
 * and aspect on a canvas, then counts over the drawn routes.
 */
export type LayoutQuality = {
  /** The zoom a fit gives on the canvas: leaves, drawn boxes and route points inside 24 px margins, at most 2. */
  readonly fitZoom: number;
  /** The fitted box's width over its height. */
  readonly fitAspect: number;
  /** Edges between two leaves whose laid-out twin carries an ELK route. */
  readonly routeCount: number;
  /** Edges between two leaves. */
  readonly edgeCount: number;
  /** Route and leaf pairs where the route passes through a leaf that is neither end (leaf inset 2 px). */
  readonly throughNode: number;
  /** Routes whose half-length point sits inside a leaf that is neither end. */
  readonly midpointUnder: number;
  /** Route pairs with no shared end whose segments cross. */
  readonly crossings: number;
  /** Route and box pairs where the route crosses the title band of a box that holds neither end. */
  readonly overHeader: number;
  /** Route and box pairs where the route crosses the title band of a box that holds one of its ends (OQ1). */
  readonly ownHeader: number;
  /** Route and box pairs where the route passes through a box that holds neither end. */
  readonly foreignBox: number;
  /** Pairs of drawn boxes, neither inside the other, that overlap. */
  readonly boxOverlap: number;
};

/** The fit zoom and aspect of a drawing on a canvas. */
export type LayoutFit = Pick<LayoutQuality, 'fitZoom' | 'fitAspect'>;

/** An axis-aligned rect in root coordinates. */
export type Rect = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

/** The id of a leaf or box and the ids of the boxes around it, outermost first. */
type Lineage = {
  readonly id: string;
  readonly ancestors: string[];
};

/** A leaf or box in root coordinates with the ids of the boxes around it, outermost first; wrappers are never boxes. */
export type PlacedRect = Rect & Lineage;

/** Every leaf and box of a laid-out graph. */
export type Placement = {
  readonly leaves: PlacedRect[];
  readonly boxes: PlacedRect[];
};

export type Segment = [Position, Position];

/** An edge between two leaves as drawn: its route points (none when ELK gave no route) and the boxes around its ends. */
export type DrawnLine = {
  readonly source: string;
  readonly target: string;
  readonly points: Position[];
  readonly endBoxes: ReadonlySet<string>;
};
