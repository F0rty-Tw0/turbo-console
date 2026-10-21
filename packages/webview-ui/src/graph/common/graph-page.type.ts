import type { Core } from 'cytoscape';

import type { Closure } from './closure.type.ts';
import type { ProbeFacts } from './graph-probe.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { ThemeColors } from './theme-colors.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The graph page's elements, built once by `buildPage`; DOM order is the Tab order (toolbar, then container). */
export type PageElements = {
  readonly root: HTMLElement;
  readonly toolbar: HTMLElement;
  readonly fit: HTMLButtonElement;
  readonly relayout: HTMLButtonElement;
  readonly clear: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly notice: HTMLElement;
  readonly retry: HTMLButtonElement;
  readonly message: HTMLElement;
  readonly messageText: HTMLElement;
  readonly reload: HTMLButtonElement;
  readonly container: HTMLElement;
};

/** Debounces view-state saves; `flush` saves a pending state at once. */
export type ViewStateSaver = {
  readonly schedule: (state: GraphViewState) => void;
  readonly flush: () => void;
};

export type NodeSizer = (name: string) => NodeSize;

export type Viewport = {
  readonly zoom: number;
  readonly pan: Position;
};

/** What the Cytoscape view reports back; names are package names. */
export type GraphViewHandlers = {
  readonly onTapNode: (name: string) => void;
  readonly onTapBackground: () => void;
  readonly onDoubleTapNode: (name: string) => void;
  /** Every node's current centre, after the user dropped a dragged node. */
  readonly onDragEnd: (positions: Positions) => void;
  readonly onViewport: () => void;
  /** Each Cytoscape `render` event (a drawn frame). */
  readonly onRender: () => void;
};

/** The Cytoscape canvas view of one page. */
export type GraphView = {
  readonly setGraph: (packages: string[], edges: GraphEdge[], positions: Positions, sizeOf: NodeSizer) => void;
  readonly select: (selected: string | null, closure: Closure | null) => void;
  readonly fit: () => void;
  readonly viewport: () => Viewport;
  readonly setViewport: (zoom: number, pan: Position) => void;
  readonly setPositions: (positions: Positions) => void;
  readonly applyTheme: (colors: ThemeColors) => void;
  /** For the test probe only. */
  readonly cy: () => Core;
};

export type GraphViewFactory = (container: HTMLElement, handlers: GraphViewHandlers) => GraphView;

export type GraphControllerDeps = {
  readonly bridge: Bridge;
  readonly page: PageElements;
  readonly createView: GraphViewFactory;
  readonly runner: LayoutRunner;
  readonly saver: ViewStateSaver;
  readonly sizeOf: NodeSizer;
  readonly now: () => number;
};

/** The graph the page shows: its hash and its drawable edges. */
export type DrawnGraph = {
  readonly hash: string;
  readonly packages: string[];
  readonly edges: GraphEdge[];
};

export type GraphSelectionDeps = {
  readonly bridge: Bridge;
  readonly page: PageElements;
  readonly view: GraphView;
  readonly saver: ViewStateSaver;
  /** The graph shown or being laid out; `null` while the page shows no graph. */
  readonly drawn: () => DrawnGraph | null;
};

export type GraphController = {
  readonly receive: (message: unknown) => void;
  readonly view: GraphView;
  readonly facts: ProbeFacts;
};
