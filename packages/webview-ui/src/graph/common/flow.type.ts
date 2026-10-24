import type { Viewport } from './graph-page.type.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

/** One edge's geometry in model coordinates; `controlPoints` is empty for a lone edge. */
export type FlowEdgeGeometry = {
  readonly source: Position;
  readonly target: Position;
  readonly controlPoints: Position[];
};

/** One drawn piece of an edge in rendered coordinates; a `null` control is a straight line, else a quadratic curve. */
export type FlowSegment = {
  readonly from: Position;
  readonly control: Position | null;
  readonly to: Position;
};

/** What the page's flow overlay is told; `GraphFlow` implements it, and the controller builds it once with the view. */
export type FlowControl = {
  /** A task-mode paint: how many task edges the painted target highlights, `0` for none. */
  readonly highlightChanged: (litEdgeCount: number) => void;
  /** The pointer moved over the canvas. */
  readonly moved: () => void;
  readonly viewportChanged: () => void;
  readonly stop: () => void;
  /** The dash colour, a resolved theme colour. */
  readonly setColor: (css: string) => void;
};

/** The canvas calls `drawFlow` makes. */
export type FlowPen = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'stroke' | 'setLineDash' | 'lineDashOffset' | 'lineWidth' | 'strokeStyle'
>;

/** What `GraphFlow` reads and schedules with; the page passes the view, `requestAnimationFrame` and `setTimeout`. */
export type GraphFlowDeps = {
  readonly canvas: HTMLCanvasElement;
  readonly container: HTMLElement;
  /** The highlighted task edges' geometry now. */
  readonly edges: () => FlowEdgeGeometry[];
  readonly viewport: () => Viewport;
  readonly now: () => number;
  readonly frame: (run: () => void) => number;
  readonly cancelFrame: (id: number) => void;
  readonly after: (run: () => void, ms: number) => number;
  readonly cancelAfter: (id: number) => void;
  /** Whether the OS asks for reduced motion, read at each highlight. */
  readonly isReduced: () => boolean;
};

/** What an edge answers of its drawn path: `undefined` for an edge Cytoscape does not draw, no control points for a straight one. */
export type FlowEdgeSource = {
  readonly sourceEndpoint: () => Position | undefined;
  readonly targetEndpoint: () => Position | undefined;
  readonly controlPoints: () => Position[] | undefined;
};

/** The edges a selector matched, as `flowEdgesOf` maps them. */
type FlowEdgeList = {
  readonly map: <Value>(read: (edge: FlowEdgeSource) => Value) => Value[];
};

/** The part of Cytoscape's core `flowEdgesOf` reads. */
export type FlowEdgeReader = {
  readonly edges: (selector: string) => FlowEdgeList;
};
