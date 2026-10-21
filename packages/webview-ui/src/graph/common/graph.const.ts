import type { ThemeColors } from './theme-colors.type.ts';

export const NODE_HEIGHT = 32;

export const NODE_PADDING_X = 24;

/** Label size in px, for both `measureText` and Cytoscape. */
export const NODE_FONT_SIZE = 13;

export const VIEW_STATE_DEBOUNCE_MS = 250;

export const LOADING_TEXT = 'Loading packages…';

export const LAYOUT_FAILED_TEXT = 'The package graph could not be drawn';

export const SINGLE_PACKAGE_TEXT = 'This is a single-package repo, so there is no package graph';

export const FALLBACK_NOTICE_TEXT = 'Simplified layout: the layout worker failed';

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
