import { DASHED_BORDER_PX, DASHED_LINE_PX, SELECTED_BORDER_PX } from './graph.const.ts';
import { BOX_SWATCH, LINE_SWATCH } from './legend-swatch.const.ts';
import type { LegendRow, LegendSwatch } from './legend.type.ts';

const SELECTED_SWATCH: LegendSwatch = {
  ...BOX_SWATCH,
  stroke: 'selected',
  strokePx: SELECTED_BORDER_PX,
  fill: 'selectionFill',
  isBold: true
};

const FOCUS_TARGET_SWATCH: LegendSwatch = { ...BOX_SWATCH, isBold: true };

const HIGHLIGHTED_SWATCH: LegendSwatch = { ...BOX_SWATCH, stroke: 'highlighted' };

const DIMMED_SWATCH: LegendSwatch = { ...BOX_SWATCH, isDimmed: true };

const EDGE_SWATCH: LegendSwatch = { ...LINE_SWATCH, isArrow: true };

const GHOST_NODE_SWATCH: LegendSwatch = { ...BOX_SWATCH, dashPx: DASHED_BORDER_PX };

const GHOST_EDGE_SWATCH: LegendSwatch = { ...LINE_SWATCH, isArrow: true, dashPx: DASHED_LINE_PX };

const FOLDER_SWATCH: LegendSwatch = { ...BOX_SWATCH, radiusPx: 8, isNested: true };

const COLLAPSED_FOLDER_SWATCH: LegendSwatch = { ...BOX_SWATCH, radiusPx: 8 };

const FOLDER_LINK_SWATCH: LegendSwatch = { ...LINE_SWATCH, isArrow: true, hasPlate: true };

/** The package graph's legend rows, in the order the popover lists them. */
export const PACKAGE_LEGEND_ROWS: LegendRow[] = [
  { id: 'package', text: 'Package', swatch: BOX_SWATCH },
  { id: 'selected', text: 'Selected package', swatch: SELECTED_SWATCH },
  { id: 'focus-target', text: 'Focus target (bold name)', swatch: FOCUS_TARGET_SWATCH },
  { id: 'highlighted', text: 'Linked to the selection', swatch: HIGHLIGHTED_SWATCH },
  { id: 'dimmed', text: 'Not linked to the selection', swatch: DIMMED_SWATCH },
  { id: 'edge', text: 'A → B: A depends on B', swatch: EDGE_SWATCH },
  { id: 'ghost-node', text: 'Dashed package: on the trace path, hidden by filters', swatch: GHOST_NODE_SWATCH },
  { id: 'ghost-edge', text: 'Dashed line: trace link to a hidden package', swatch: GHOST_EDGE_SWATCH },
  { id: 'folder', text: 'Folder', swatch: FOLDER_SWATCH },
  { id: 'folder-collapsed', text: 'Collapsed folder', swatch: COLLAPSED_FOLDER_SWATCH },
  { id: 'folder-link', text: '"<n> links": links bundled at a collapsed folder', swatch: FOLDER_LINK_SWATCH }
];
