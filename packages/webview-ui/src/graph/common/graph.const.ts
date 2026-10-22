import type { LayoutNotice } from './graph-layouts.type.ts';
import type { Column } from './roving.type.ts';
import type { ThemeColors } from './theme-colors.type.ts';

export const NODE_HEIGHT = 32;

export const NODE_PADDING_X = 24;

/** Label size in px, for both `measureText` and Cytoscape. */
export const NODE_FONT_SIZE = 13;

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

export const RELAYOUT_LABEL = 'Re-layout';

export const CLEAR_LABEL = 'Clear selection';

export const RETRY_LABEL = 'Retry';

export const RELOAD_LABEL = 'Reload';

/** The graph container's accessible name, also the page's readiness marker for the e2e tests. */
export const GRAPH_LABEL = 'Package graph';

/** Light Modern values, for a page with no `--vscode-*` variables (a plain browser). */
export const FALLBACK_COLORS: ThemeColors = {
  background: '#ffffff',
  label: '#3b3b3b',
  edge: '#717171',
  selected: '#005fb8',
  highlighted: '#1a85ff',
  frame: '#e5e5e5'
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

/** Room ELK leaves around a folder's packages, and Cytoscape's compound padding, in px. */
export const FOLDER_PADDING_PX = 32;

/** The grouped root: the same layered options, with edges between packages of different folders laid out together. */
export const ELK_GROUPED_ROOT_OPTIONS: Readonly<Record<string, string>> = {
  ...ELK_OPTIONS,
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN'
};

/** The group header for packages whose path has no folder part. */
export const ROOT_FOLDER = '(root)';

export const CONTROLS_LABEL = 'Controls';

export const CONTROLS_FILTERED_LABEL = 'Controls (filters on)';

export const DETAILS_LABEL = 'Details';

export const PANELS_LABEL = 'Panels';

export const VIEW_LABEL = 'View';

/** Shown inside the Controls button while any filter is on, next to its label. */
export const FILTERS_ON_TEXT = 'filters on';

/** Below this width the details panel overlays the canvas instead of docking beside it; `graph.css` repeats the literal. */
export const OVERLAY_MEDIA_QUERY = '(width < 960px)';

export const SEARCH_LABEL = 'Search packages';

export const DEPTH_LABEL = 'Focus depth';

export const GROUP_BY_FOLDER_LABEL = 'Group by folder';

export const TAGS_LABEL = 'Tags';

export const SHOW_ALL_LABEL = 'Show all';

/** A package row's cells, left to right; the list keys move through them in this order. */
export const COLUMNS: Column[] = ['check', 'name', 'focus'];

/** The gap kept between anchor nodes and the details overlay's left edge. */
export const KEEP_CLEAR_MARGIN_PX = 16;
