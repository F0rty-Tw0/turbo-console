import type { Core } from 'cytoscape';

import type { ControlsElements } from './controls-elements.type.ts';
import type { FolderGroup } from './folder-group.type.ts';
import type { GhostMarks } from './ghost.type.ts';
import type { ProbeFacts } from './graph-probe.type.ts';
import type { AnchorBox } from './keep-clear.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { Paint } from './paint.type.ts';
import type { ThemeColors } from './theme-colors.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphEdge, GraphPackage, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The graph page's elements, built once by `buildPage`; DOM order is the Tab order (toolbar, then the body). */
export type PageElements = {
  readonly root: HTMLElement;
  readonly toolbar: HTMLElement;
  /** Toggles the controls panel `aside#graph-controls`; `GraphControls` keeps its label and `aria-expanded` current. */
  readonly controls: HTMLButtonElement;
  /** Toggles the details panel `aside#graph-details`. */
  readonly details: HTMLButtonElement;
  /** `span.filters-on` inside the Controls button, shown while any filter is on. */
  readonly filtersOn: HTMLElement;
  readonly fit: HTMLButtonElement;
  readonly relayout: HTMLButtonElement;
  readonly clear: HTMLButtonElement;
  readonly status: HTMLElement;
  readonly notice: HTMLElement;
  readonly retry: HTMLButtonElement;
  readonly message: HTMLElement;
  readonly messageText: HTMLElement;
  readonly reload: HTMLButtonElement;
  /** `div.graph-body`: the controls panel, once a graph shows, then the container. */
  readonly body: HTMLElement;
  readonly container: HTMLElement;
};

/** What `buildToolbar` builds: the toolbar and the parts of it the page drives. */
export type ToolbarElements = Pick<
  PageElements,
  'toolbar' | 'controls' | 'details' | 'fit' | 'relayout' | 'clear' | 'status' | 'filtersOn'
>;

/** The controls fields of the saved view state: what `GraphControls` keeps and the selection's saves carry along. */
export type ControlsViewFields = Pick<GraphViewState, 'controlsOpen' | 'search' | 'depth' | 'hidden' | 'focus' | 'tags'>;

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
  /** A link tapped on the canvas; `source` depends on `target`. */
  readonly onTapEdge: (source: string, target: string) => void;
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
  /** Gives each package and link one of the four state classes. */
  readonly paint: (paint: Paint) => void;
  /** Fits the camera to the visible nodes; with none visible it does nothing. */
  readonly fit: () => void;
  /** Shows exactly these package names; the rest are hidden, not moved. */
  readonly setVisible: (visible: ReadonlySet<string>) => void;
  /** Draws the trace's hidden path packages as ghosts; empty marks clear them. Call after every `setVisible`, which hides a ghost again. */
  readonly setGhosts: (marks: GhostMarks, visible: ReadonlySet<string>) => void;
  /** Re-measures the container, keeping zoom and pan. */
  readonly resize: () => void;
  /** Pans so the named package sits at the view centre, keeping the zoom. */
  readonly centreOn: (name: string) => void;
  /** The horizontal span of the named visible packages in container px; `null` when none is visible. */
  readonly anchorBox: (names: string[]) => AnchorBox | null;
  /** Pans horizontally by `dx` rendered px with no animation, keeping the zoom. */
  readonly panBy: (dx: number) => void;
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
  /** `buildControls`, handed in because `domain-logic` may not import `ui`. */
  readonly build: (groups: FolderGroup[], tags: string[]) => ControlsElements;
};

/** The graph the page shows: its hash, package names and records, and its drawable edges. */
export type DrawnGraph = {
  readonly hash: string;
  readonly packages: string[];
  readonly infos: GraphPackage[];
  readonly edges: GraphEdge[];
};

export type GraphSelectionDeps = {
  readonly bridge: Bridge;
  readonly page: PageElements;
  readonly view: GraphView;
  readonly saver: ViewStateSaver;
  /** The graph shown or being laid out; `null` while the page shows no graph. */
  readonly drawn: () => DrawnGraph | null;
  /** The controls fields every save carries along. */
  readonly controls: () => ControlsViewFields;
  /** The selection changed or was forgotten; `null` for none. */
  readonly onSelected: (name: string | null) => void;
};

export type GraphController = {
  readonly receive: (message: unknown) => void;
  readonly view: GraphView;
  readonly facts: ProbeFacts;
};
