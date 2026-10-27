import type { Core } from 'cytoscape';

import type { ControlsElements } from './controls-elements.type.ts';
import type { DetailsViews } from './details.type.ts';
import type { FlowControl, FlowEdgeGeometry } from './flow.type.ts';
import type { FolderGroup } from './folder-group.type.ts';
import type { FolderScene } from './folder-scene.type.ts';
import type { GhostMarks } from './ghost.type.ts';
import type { ProbeFacts } from './graph-probe.type.ts';
import type { TaskScreenElements } from './graph-task.type.ts';
import type { AnchorBox } from './keep-clear.type.ts';
import type { LayoutRunner } from './layout.type.ts';
import type { LegendElements } from './legend.type.ts';
import type { NodeSize } from './node-size.type.ts';
import type { Paint } from './paint.type.ts';
import type { AtomCanvas, TaskCanvas } from './task-canvas.type.ts';
import type { TaskControlsViews } from './task-controls.type.ts';
import type { TaskDetailsViews } from './task-details.type.ts';
import type { ThemeColors } from './theme-colors.type.ts';
import type { RowPlan, WidgetRects, WidgetViews } from './widget.type.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphEdge, GraphPackage, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState, PackageViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The page's parts other than the Legend's. */
type PageParts = {
  readonly root: HTMLElement;
  readonly toolbar: HTMLElement;
  /** The Packages button, first in the toolbar; `aria-pressed` while the package graph shows. */
  readonly packagesMode: HTMLButtonElement;
  /** The Tasks button, after Packages; `aria-pressed` while task mode is on. */
  readonly taskMode: HTMLButtonElement;
  /**
   * Toggles the controls panel `aside#graph-controls`; `GraphControls` keeps its label and `aria-expanded` current. In task
   * mode it toggles `aside#graph-task-controls`, and `GraphTaskControls` points `aria-controls` and `aria-expanded` there.
   */
  readonly controls: HTMLButtonElement;
  /** Toggles the details panel `aside#graph-details`. */
  readonly details: HTMLButtonElement;
  /** `span.filters-on` inside the Controls button, shown while any filter is on. */
  readonly filtersOn: HTMLElement;
  readonly fit: HTMLButtonElement;
  readonly relayout: HTMLButtonElement;
  /** Enabled exactly when `fit` is: both need a visible package. */
  readonly exportImage: HTMLButtonElement;
  /** Clear selection: the icon-only button in `detailsBar`, disabled while nothing is selected. */
  readonly clear: HTMLButtonElement;
  /** The toolbar's visually hidden live region, which reads the package selection out. */
  readonly status: HTMLElement;
  /** `div.details-bar`: the summary and `clear`, first in the mounted Details aside; `hidden` while nothing is selected. */
  readonly detailsBar: HTMLDivElement;
  /** `p.details-summary`: the package selection's text, as `status` reads it; empty in task mode. */
  readonly detailsSummary: HTMLElement;
  readonly notice: HTMLElement;
  /** The `p` inside the notice: the simplified-layout copy, or a mode switch's progress text. */
  readonly noticeText: HTMLElement;
  readonly retry: HTMLButtonElement;
  /** Task mode's notice, cap banner and prompt, between the notice and the message. */
  readonly taskScreen: TaskScreenElements;
  readonly message: HTMLElement;
  readonly messageText: HTMLElement;
  readonly reload: HTMLButtonElement;
  /** `div.graph-body`: the controls panel, once a graph shows, the container, the flow overlay, the widget layer, then the details panel. */
  readonly body: HTMLElement;
  readonly container: HTMLElement;
  /** `canvas.graph-flow`: the moving dashes over the highlighted task edges, under the widget layer; `aria-hidden`. */
  readonly flow: HTMLCanvasElement;
  /** `div.graph-widgets`: the canvas widgets' layer over the container, its DOM sibling right after it. */
  readonly widgets: HTMLElement;
};

/** The graph page's elements, built once by `buildPage`; DOM order is the Tab order (toolbar, then the body). */
export type PageElements = PageParts & LegendElements;

/** The controls fields of the saved view state: `GraphControls` keeps all but `collapsed`, which `GraphFiltering` adds; the selection's saves carry them along. */
export type ControlsViewFields = Pick<
  GraphViewState,
  'controlsOpen' | 'search' | 'depth' | 'hidden' | 'focus' | 'tags' | 'grouped' | 'collapsed'
>;

/** Debounces view-state saves; `flush` saves a pending state at once. */
export type ViewStateSaver = {
  readonly schedule: (state: GraphViewState) => void;
  readonly flush: () => void;
};

/** The panel a sash resizes. */
export type PanelSide = 'controls' | 'details';

/** The package graph's saver: `ViewStateModes` adds the mode, the task view and the panel widths to each state before it is saved. */
export type PackageSaver = {
  readonly schedule: (state: PackageViewState) => void;
  readonly flush: () => void;
};

export type NodeSizer = (name: string) => NodeSize;

/** What sizes an umbrella: `name` its task name line, `counts` its counts line. */
export type UmbrellaSizers = {
  readonly name: NodeSizer;
  readonly counts: NodeSizer;
};

/** The raw width of `text` in the label font, in px, no padding. */
export type TextMeasure = (text: string) => number;

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
  /** A tap on a folder box outside its packages or on a collapsed folder; `folder` is the key (`''` the root). */
  readonly onTapFolder: (folder: string) => void;
  readonly onDoubleTapNode: (name: string) => void;
  /** Two taps on the same box or the same collapsed folder within `DOUBLE_TAP_MS`, after the second `onTapFolder`. */
  readonly onDoubleTapFolder: (folder: string) => void;
  /** Every node's current centre, after the user dropped a dragged node. */
  readonly onDragEnd: (positions: Positions) => void;
  readonly onViewport: () => void;
  /** The pointer entered a node (`name` its id) or left it (`null`); only task mode paints it. */
  readonly onHoverNode: (name: string | null) => void;
  /** Each Cytoscape `render` event (a drawn frame). */
  readonly onRender: () => void;
};

/** The folder pass over the boxes `setGrouping` drew: collapsed folders, folder links and the classes that hide what they replace. */
export type FoldersView = {
  /** Hides collapsed and unshown boxes and the package links a collapsed folder replaces, then draws collapsed nodes and folder links; `null` removes them. */
  readonly show: (scene: FolderScene | null, labelOf: (folder: string) => string) => void;
  /** Classes boxes, collapsed nodes and folder links; `show` re-applies the last paint to what it draws. */
  readonly paint: (paint: Paint) => void;
  /** Moves each collapsed node to the centre of all its packages, hidden ones included. */
  readonly recentre: () => void;
};

/** The Cytoscape canvas view of one page. */
export type GraphView = {
  readonly setGraph: (packages: string[], edges: GraphEdge[], positions: Positions, sizeOf: NodeSizer) => void;
  /** Gives each package, link, box, collapsed folder and folder link its state class. */
  readonly paint: (paint: Paint) => void;
  /** Fits the camera to the visible nodes; with none visible it does nothing. */
  readonly fit: () => void;
  /** Shows exactly these package names; the rest are hidden, not moved. */
  readonly setVisible: (visible: ReadonlySet<string>) => void;
  /** Draws the focused package's label bold; `null` (no focus, or a folder focus) draws none bold. */
  readonly setFocusTarget: (name: string | null) => void;
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
  /** Draws one box per group around its packages, or none for `null`; positions are unchanged, call `setPositions` after. */
  readonly setGrouping: (groups: FolderGroup[] | null) => void;
  /** Places the packages, then re-centres the collapsed folders on them. */
  readonly setPositions: (positions: Positions) => void;
  /** The folder pass (`FoldersView.show`); call after every `setVisible` and `setGhosts`. */
  readonly showFolders: (scene: FolderScene | null, labelOf: (folder: string) => string) => void;
  readonly applyTheme: (colors: ThemeColors) => void;
  /** The drawn folder boxes and collapsed nodes, and the `selected` package while drawn, in container px. */
  readonly widgetRects: (selected: string | null) => WidgetRects;
  /** Draws the canvas label on each collapsed folder with no row in `rows`, and clears it from the rest. */
  readonly markRowLess: (rows: RowPlan[]) => void;
  /** The whole graph as a PNG, base64 with no data-URI prefix, folder titles drawn on the boxes; throws when the canvas cannot render it. */
  readonly exportPng: (bg: string) => string;
  /** The highlighted task edges drawn now, in model coordinates, for the flow overlay; never a package graph edge. */
  readonly flowEdges: () => FlowEdgeGeometry[];
  /** For the test probe only. */
  readonly cy: () => Core;
  /** The task graph on the same core; task mode draws here, and package mode never draws at once. */
  readonly tasks: TaskCanvas;
  /** The Atomizer groups on the task graph: an expanded umbrella's box and file nodes. */
  readonly atoms: AtomCanvas;
};

export type GraphViewFactory = (container: HTMLElement, handlers: GraphViewHandlers) => GraphView;

export type FlowFactory = (view: GraphView) => FlowControl;

export type GraphControllerDeps = {
  readonly bridge: Bridge;
  readonly page: PageElements;
  readonly createView: GraphViewFactory;
  /** Builds the flow overlay over the view, once, right after `createView`. */
  readonly createFlow: FlowFactory;
  readonly runner: LayoutRunner;
  readonly saver: ViewStateSaver;
  readonly sizeOf: NodeSizer;
  /** Sizes task names; the package graph keeps `sizeOf`. */
  readonly taskSizeOf: NodeSizer;
  /** What a collapsed folder's title is cut to fit with. */
  readonly measure: TextMeasure;
  readonly now: () => number;
  /** `buildControls`, handed in because `domain-logic` may not import `ui`. */
  readonly build: (groups: FolderGroup[], tags: string[]) => ControlsElements;
  /** The details view builders, handed in because `domain-logic` may not import `ui`. */
  readonly views: DetailsViews;
  /** The canvas widget builders, handed in because `domain-logic` may not import `ui`. */
  readonly widgetViews: WidgetViews;
  /** The task Controls builders, handed in because `domain-logic` may not import `ui`. */
  readonly taskViews: TaskControlsViews;
  /** The task side panel builders, handed in for the same reason. */
  readonly taskDetailsViews: TaskDetailsViews;
  /** `window.matchMedia(OVERLAY_MEDIA_QUERY)`: while it matches, the details panel overlays the canvas. */
  readonly overlay: MediaQueryList;
  /** The computed `--vscode-editor-background` of `body`, read at each export. */
  readonly background: () => string;
};

/** The graph the page shows: its hash, package names and records, and its drawable edges. */
export type DrawnGraph = {
  readonly hash: string;
  readonly packages: string[];
  readonly infos: GraphPackage[];
  readonly edges: GraphEdge[];
};

export type GraphController = {
  readonly receive: (message: unknown) => void;
  readonly view: GraphView;
  readonly flow: FlowControl;
  readonly facts: ProbeFacts;
};
