import type { Css, StylesheetJson } from 'cytoscape';

import {
  COLLAPSED_LABEL_MAX_PX,
  DIMMED_BOX_CLASS,
  EXPORTING_CLASS,
  FOLDER_HIDDEN_CLASS,
  FOLDER_LINK_CLASS,
  FOLDER_NODE_CLASS,
  FOLDER_PADDING_PX,
  NODE_BORDER_PX,
  NODE_FONT_SIZE
} from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/**
 * A box with packages (`node:parent`): padding, no label, no overlay, a fixed size the compound ignores for its
 * children's bounds, the frame and the editor background. A childless box matches only `node`, so its size comes from
 * `data(width)` and `data(height)`, which a box does not carry.
 */
const boxStyleOf = (colors: ThemeColors): Css.Node => {
  const padding = `${FOLDER_PADDING_PX}px`;
  const box = {
    padding,
    label: '',
    'overlay-opacity': 0,
    width: 1,
    height: 1,
    'border-width': NODE_BORDER_PX,
    'border-color': colors.frame,
    'background-color': colors.background
  } as const;

  return box;
};

/** A folder link's `<n> link(s)` label, on the canvas background so a crossing line never runs through it. */
const folderLinkStyleOf = (colors: ThemeColors, fontFamily: string): Css.Edge => {
  const folderLink = {
    label: 'data(label)',
    'font-size': NODE_FONT_SIZE,
    'font-family': fontFamily,
    color: colors.label,
    'text-background-color': colors.background,
    'text-background-opacity': 1
  } as const;

  return folderLink;
};

const HIDDEN = { display: 'none' } as const;

/** What `exportPngOf` adds to a box while it runs: its folder title above the frame, which the page never shows. */
const EXPORTING_BOX = { label: 'data(title)', 'text-valign': 'top', 'text-halign': 'center' } as const;

/**
 * The Cytoscape stylesheet: round-rectangle nodes sized from their data, label centred, 1 px frame; bezier edges with
 * a triangle at the dependency. `selected`, `highlighted` and `dimmed` are the classes `GraphView.paint` applies;
 * `ghost` (dashed) is the one `GraphView.setGhosts` applies. The folder pass draws `folder-node` (a collapsed folder, its
 * label wrapped) and `folder-link`, fades a box with `dimmed-box` and hides with `folder-hidden`, last so nothing shows it.
 * Every colour comes from `colors`.
 */
export const graphStyleOf = (colors: ThemeColors, fontFamily: string): StylesheetJson => {
  const node = {
    shape: 'round-rectangle',
    width: 'data(width)',
    height: 'data(height)',
    label: 'data(id)',
    'text-valign': 'center',
    'text-halign': 'center',
    'font-size': NODE_FONT_SIZE,
    'font-family': fontFamily,
    color: colors.label,
    'background-color': colors.background,
    'border-width': NODE_BORDER_PX,
    'border-color': colors.frame
  } as const;
  const edge = {
    'curve-style': 'bezier',
    'target-arrow-shape': 'triangle',
    width: 1,
    'line-color': colors.edge,
    'target-arrow-color': colors.edge
  } as const;
  const selectedNode = { 'border-width': 3, 'border-color': colors.selected };
  const highlightedNode = { 'border-width': 2, 'border-color': colors.highlighted };
  const highlightedEdge = { width: 2, 'line-color': colors.highlighted, 'target-arrow-color': colors.highlighted };
  const selectedEdge = { width: 3, 'line-color': colors.selected, 'target-arrow-color': colors.selected };
  const ghostNode = { 'border-style': 'dashed', 'text-opacity': 0.75 } as const;
  const ghostEdge = { 'line-style': 'dashed' } as const;
  const dimmed = { opacity: 0.25 };
  const folderNode = { label: 'data(label)', 'text-wrap': 'wrap', 'text-max-width': `${COLLAPSED_LABEL_MAX_PX}px` } as const;
  const dimmedBox = { 'border-opacity': 0.25, 'text-opacity': 0.25, 'background-opacity': 0.25 };
  const style: StylesheetJson = [
    { selector: 'node', style: node },
    { selector: 'node:parent', style: boxStyleOf(colors) },
    { selector: `node:parent.${EXPORTING_CLASS}`, style: EXPORTING_BOX },
    { selector: 'edge', style: edge },
    { selector: 'node.selected', style: selectedNode },
    { selector: 'node.highlighted', style: highlightedNode },
    { selector: 'edge.highlighted', style: highlightedEdge },
    { selector: 'edge.selected', style: selectedEdge },
    { selector: 'node.ghost', style: ghostNode },
    { selector: 'edge.ghost', style: ghostEdge },
    { selector: '.dimmed', style: dimmed },
    { selector: `node.${FOLDER_NODE_CLASS}`, style: folderNode },
    { selector: `edge.${FOLDER_LINK_CLASS}`, style: folderLinkStyleOf(colors, fontFamily) },
    { selector: `node.${DIMMED_BOX_CLASS}`, style: dimmedBox },
    { selector: `.${FOLDER_HIDDEN_CLASS}`, style: HIDDEN }
  ];

  return style;
};
