import type { LayoutNotice } from './graph-layouts.type.ts';
import type { Column } from './roving.type.ts';
import type { ThemeColors } from './theme-colors.type.ts';

export const NODE_HEIGHT = 32;

export const NODE_PADDING_X = 24;

/** Label size in px, for both `measureText` and Cytoscape. */
export const NODE_FONT_SIZE = 13;

/** The four state classes `GraphView.paint` gives; an element has exactly one of them once painted. */
export const STATE_CLASS_NAMES: string[] = ['selected', 'highlighted', 'dimmed', 'normal'];

/** `STATE_CLASS_NAMES` as one class string. */
export const STATE_CLASSES = STATE_CLASS_NAMES.join(' ');

/** The class `GraphView.setGhosts` gives a trace's hidden path packages and their path links. */
export const GHOST_CLASS = 'ghost';

export const VIEW_STATE_DEBOUNCE_MS = 250;

/** Two taps on the same package this close together are a double tap; Cytoscape's own `dbltap` window. */
export const DOUBLE_TAP_MS = 250;

export const MIN_DEPTH = 1;

export const MAX_DEPTH = 5;

export const DEFAULT_DEPTH = 1;

export const LOADING_TEXT = 'Loading packages…';

export const LAYOUT_FAILED_TEXT = 'The package graph could not be drawn';

export const SINGLE_PACKAGE_TEXT = 'This is a single-package repo, so there is no package graph';

export const FALLBACK_NOTICE_TEXT = 'Simplified layout: the layout worker failed';

/** The notice while the first grouped layout runs and the flat graph stays on screen. */
export const LAYING_OUT_FOLDERS_TEXT = 'Laying out folders…';

/** The notice while the first flat layout runs and the grouped graph stays on screen. */
export const LAYING_OUT_GRAPH_TEXT = 'Laying out the graph…';

export const NO_NOTICE: LayoutNotice = { kind: 'none' };

export const FALLBACK_NOTICE: LayoutNotice = { kind: 'fallback' };

export const FIT_LABEL = 'Fit';

export const FIT_TITLE = 'Zoom to fit the whole graph';

export const RELAYOUT_LABEL = 'Re-layout';

export const RELAYOUT_TITLE = 'Lay the graph out again';

export const EXPORT_LABEL = 'Export image';

export const EXPORT_TITLE = 'Save the graph as a PNG image';

export const CLEAR_LABEL = 'Clear selection';

export const CLEAR_TITLE = 'Deselect and clear the details panel';

export const RETRY_LABEL = 'Retry';

export const RELOAD_LABEL = 'Reload';

/** The graph container's accessible name, also the page's readiness marker for the e2e tests. */
export const GRAPH_LABEL = 'Package graph';

/** The Light+ default `--vscode-descriptionForeground` (Light Modern sets `#3B3B3B`), shared by the edge and the stopped run, which both read that variable. */
const FALLBACK_DESCRIPTION = '#717171';

/** Light Modern run colours; stopped shares the description fallback. */
const FALLBACK_RUN_COLORS: ThemeColors['runs'] = {
  running: '#bf8803',
  passed: '#388a34',
  failed: '#f14c4c',
  stopped: FALLBACK_DESCRIPTION,
  'failed-to-start': '#f85149'
};

/** Light Modern values (`--vscode-charts-purple` for `cached`), for a page with no `--vscode-*` variables (a plain browser). */
export const FALLBACK_COLORS: ThemeColors = {
  background: '#ffffff',
  label: '#3b3b3b',
  edge: FALLBACK_DESCRIPTION,
  selected: '#005fb8',
  highlighted: '#1a85ff',
  frame: '#e5e5e5',
  cached: '#652d90',
  runs: FALLBACK_RUN_COLORS,
  selection: null,
  dimmedOpacity: 0.25
};

/** The one Trusted Types policy the graph CSP allows (`trusted-types tc-elk`). */
export const ELK_POLICY_NAME = 'tc-elk';

export const FALLBACK_TIMEOUT_MS = 5000;

/** Starts every edge id, in Cytoscape and ELK alike: no package name holds a NUL, so no edge id is ever a node id. */
export const EDGE_ID_PREFIX = '\u0000';

/** Fallback row pitch in node heights. */
export const FALLBACK_SPACING_FACTOR = 3;

/** Layered, top-down; the cheapest strategies, because a package graph needs a readable layout, not an optimal one. */
export const ELK_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.thoroughness': '1',
  'elk.layered.layering.strategy': 'LONGEST_PATH',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.edgeRouting': 'POLYLINE'
};

/** Starts every folder box id, in Cytoscape and ELK alike; package names never start with U+0001. */
export const FOLDER_ID_PREFIX = '\u0001';

/** Starts every collapsed folder node id; package names never start with U+0002. */
export const COLLAPSED_ID_PREFIX = '\u0002';

/** Starts every folder link id; package names never start with U+0003. */
export const FOLDER_LINK_ID_PREFIX = '\u0003';

export const COLLAPSED_NODE_WIDTH = 180;

export const COLLAPSED_NODE_HEIGHT = 56;

/** Widest a collapsed node's canvas label title may be, in raw text px, before it is cut with an ellipsis; its DOM row cuts its own. */
export const COLLAPSED_LABEL_MAX_PX = 116;

/** The node drawn in place of a collapsed folder's box and packages. */
export const FOLDER_NODE_CLASS = 'folder-node';

/** A collapsed node whose header row the widget pass hides, drawn too narrow for one or off screen: the canvas draws its label. */
export const ROW_LESS_CLASS = 'row-less';

/** The edge drawn for the package links between a collapsed folder and another drawn end, merged. */
export const FOLDER_LINK_CLASS = 'folder-link';

/** A box or package link the folder pass hides: the stylesheet gives it `display: none`, which `resetGhosts` never clears. */
export const FOLDER_HIDDEN_CLASS = 'folder-hidden';

/** A collapsed folder's box, hidden with its packages while the collapsed node stands in for it. */
export const BOX_COLLAPSED_CLASS = 'box-collapsed';

/** A dimmed box: frame, label and fill fade, never `opacity`, which a compound multiplies into its packages. */
export const DIMMED_BOX_CLASS = 'dimmed-box';

/** Room ELK leaves around a folder's packages, and Cytoscape's compound padding, in px. */
export const FOLDER_PADDING_PX = 32;

/** The class `exportPngOf` gives every folder box while `cy.png` runs, so the stylesheet draws the box titles into the image. */
export const EXPORTING_CLASS = 'exporting';

/** The border of a package, folder box or collapsed node while not selected, highlighted ones included, in px. */
export const NODE_BORDER_PX = 1;

/** The border of a selected node, in px, drawn centred on the node's edge. */
export const SELECTED_BORDER_PX = 1.5;

/** The width of a plain edge: a model width in px that scales with zoom. */
export const EDGE_WIDTH = 0.75;

/** The width of a highlighted edge: a model width in px that scales with zoom. */
export const HIGHLIGHTED_EDGE_WIDTH = 1.25;

/** The width of a selected edge: a model width in px that scales with zoom. */
export const SELECTED_EDGE_WIDTH = 1.5;

/** The grouped root: the same layered options, with edges between packages of different folders laid out together. */
export const ELK_GROUPED_ROOT_OPTIONS: Readonly<Record<string, string>> = {
  ...ELK_OPTIONS,
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
};

/** The group header for packages whose path has no folder part. */
export const ROOT_FOLDER = '(root)';

/** The package Controls panel's id, which the Controls button points at outside task mode. */
export const CONTROLS_ID = 'graph-controls';

/** The package Details panel's id, which the Details button points at outside task mode. */
export const DETAILS_ID = 'graph-details';

export const CONTROLS_LABEL = 'Controls';

/** The hover title of the Controls button, whichever name its "filters on" state gives it. */
export const CONTROLS_TITLE = 'Show or hide the Controls panel (search, depth, package list)';

export const CONTROLS_FILTERED_LABEL = 'Controls (filters on)';

export const DETAILS_LABEL = 'Details';

export const DETAILS_TITLE = 'Show or hide the Details panel for the selection';

export const PANELS_LABEL = 'Panels';

export const VIEW_LABEL = 'View';

/** Shown inside the Controls button while any filter is on, next to its label. */
export const FILTERS_ON_TEXT = 'filters on';

/** Below this width the details panel overlays the canvas instead of docking beside it; `graph.css` repeats the literal. */
export const OVERLAY_MEDIA_QUERY = '(width < 960px)';

export const SEARCH_LABEL = 'Search packages';

export const DEPTH_LABEL = 'Focus depth';

export const DEPTH_HINT = 'How many links away from the focus target stay visible.';

export const DEPTH_HINT_ID = 'graph-depth-hint';

export const GROUP_BY_FOLDER_LABEL = 'Group by folder';

export const TAGS_LABEL = 'Tags';

export const SHOW_ALL_LABEL = 'Show all';

/** A package row's cells, left to right; the list keys move through them in this order. */
export const COLUMNS: Column[] = ['check', 'name', 'focus'];

/** The gap kept between anchor nodes and the details overlay's left edge. */
export const KEEP_CLEAR_MARGIN_PX = 16;

/** A graph with more packages than this opens grouped with every folder collapsed, when nothing is saved for it. */
export const LARGE_GRAPH_PACKAGES = 300;

/** A header widget's button size, and its inset from the box edge, in px. */
export const WIDGET_BUTTON_PX = 24;

export const WIDGET_INSET_PX = 8;

/** Header widgets hide while the box or collapsed node is under this many px wide on screen. */
export const WIDGET_MIN_BOX_PX = 120;

/** The breadcrumb shows at most this many link lines, then one line counting the folders left. */
export const BREADCRUMB_MAX_LINES = 3;

export const SHOW_FOLDER_LABEL = 'Show folder';

export const SHOW_PACKAGE_LABEL = 'Show package';

/** The breadcrumb's accessible name and its way back out of a folder focus. */
export const BREADCRUMB_LABEL = 'Folder focus';

export const ALL_FOLDERS_LABEL = 'All folders';

/** The class the graph container wears over a node or edge that is not a ghost or a folder link: a pointer cursor. */
export const OVER_ELEMENT_CLASS = 'over-element';

/**
 * The class the graph container wears from a pointer press until the next key press, so a script focus draws no
 * ring.
 */
export const POINTER_FOCUS_CLASS = 'pointer-focus';
