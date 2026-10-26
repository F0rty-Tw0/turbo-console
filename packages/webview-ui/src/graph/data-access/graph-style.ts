import type { Css, NodeSingular, StylesheetJson } from 'cytoscape';

import { taskRulesOf } from './graph-task-style.ts';
import {
  COLLAPSED_LABEL_MAX_PX,
  DIMMED_BOX_CLASS,
  EXPORTING_CLASS,
  FOLDER_HIDDEN_CLASS,
  FOLDER_LINK_CLASS,
  FOLDER_NODE_CLASS,
  FOLDER_PADDING_PX,
  NODE_BORDER_PX,
  NODE_FONT_SIZE,
  SELECTED_BORDER_PX
} from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/** No press feedback: Cytoscape's default dims a pressed node or edge with a black overlay, and a press on the background with a circle. */
/** Typed loosely: cytoscape's `Css.Core` demands every core property, and this sets one. */
const NO_PRESS_CIRCLE: Record<string, number> = { 'active-bg-opacity': 0 };

const NO_PRESS_OVERLAY = { 'overlay-opacity': 0 } as const;

const NO_PRESS_RULES: StylesheetJson = [
  { selector: 'core', style: NO_PRESS_CIRCLE },
  { selector: 'node:active', style: NO_PRESS_OVERLAY },
  { selector: 'edge:active', style: NO_PRESS_OVERLAY }
];

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
    'background-color': colors.background,
    'corner-radius': '8px'
  } as const;

  return box;
};

/** A box faded with `dimmed-box`: its frame, title and fill at the theme's dimmed opacity, its packages untouched. */
const dimmedBoxStyleOf = (colors: ThemeColors): Css.Node => {
  const opacity = colors.dimmedOpacity;
  const dimmedBox = { 'border-opacity': opacity, 'text-opacity': opacity, 'background-opacity': opacity } as const;

  return dimmedBox;
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

const GHOST_NODE = { 'border-style': 'dashed', 'text-opacity': 0.75 } as const;

/** A collapsed folder: its label wrapped, its corners as round as a box's. */
const FOLDER_NODE = {
  label: 'data(label)',
  'text-wrap': 'wrap',
  'text-max-width': `${COLLAPSED_LABEL_MAX_PX}px`,
  'corner-radius': '8px'
} as const;

const GHOST_EDGE = { 'line-style': 'dashed' } as const;

const EDGE_ARROW = { 'target-arrow-shape': 'triangle', 'arrow-scale': 0.8, 'target-distance-from-node': 3 } as const;

const edgeStyleOf = (colors: ThemeColors): Css.Edge => {
  const edge = {
    ...EDGE_ARROW,
    'curve-style': 'bezier',
    width: 1,
    'line-color': colors.edge,
    'target-arrow-color': colors.edge
  } as const;

  return edge;
};

/** Moves a `top` label down from above the frame to the middle of the box's top padding band. */
const TITLE_MARGIN_Y = (FOLDER_PADDING_PX + NODE_FONT_SIZE) / 2;

/** A box's width without its padding, so its title ends a padding short of each side of the frame. */
const titleWidthOf = (box: NodeSingular): string => `${box.width()}px`;

/**
 * A box's title centred in the top padding band, inside the frame, cut with an ellipsis when wider than the box. A folder
 * box draws it only while `exportPngOf` runs, since the page shows its DOM header row instead; `taskRulesOf` left-aligns
 * it for a task box. `cy.png` bounds skip the title, so outside the frame it would be cut off at the image edge.
 */
const BOX_TITLE = {
  label: 'data(title)',
  'text-valign': 'top',
  'text-halign': 'center',
  'text-margin-y': TITLE_MARGIN_Y,
  'text-wrap': 'ellipsis',
  'text-max-width': titleWidthOf
} as const;

/**
 * The Cytoscape stylesheet: round-rectangle nodes sized from their data, label centred, 1 px frame; bezier edges with
 * a triangle at the dependency. `selected`, `highlighted` and `dimmed` are the classes `GraphView.paint` applies;
 * `ghost` (dashed) is the one `GraphView.setGhosts` applies; a press draws no overlay on a node or edge and no circle on the background; `taskRulesOf` adds the task mode rules. The folder pass draws `folder-node` (a collapsed folder, its
 * label wrapped) and `folder-link`, fades a box with `dimmed-box` and hides with `folder-hidden`, last so nothing shows it.
 * Every colour comes from `colors`. With `glyphs` the task and file nodes draw a state glyph from the codicon font
 * before their name; the base node rule keeps `fontFamily`.
 */
export const graphStyleOf = (colors: ThemeColors, fontFamily: string, glyphs: boolean): StylesheetJson => {
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
    'border-color': colors.frame,
    'corner-radius': '6px'
  } as const;
  const selectedNode = { 'border-width': SELECTED_BORDER_PX, 'border-color': colors.selected };
  const highlightedNode = { 'border-width': NODE_BORDER_PX, 'border-color': colors.highlighted };
  const highlightedEdge = { width: 1.5, 'line-color': colors.highlighted, 'target-arrow-color': colors.highlighted };
  const selectedEdge = { width: SELECTED_BORDER_PX, 'line-color': colors.selected, 'target-arrow-color': colors.selected };
  const dimmed = { opacity: colors.dimmedOpacity };
  const glyphFamily = glyphs ? `codicon, ${fontFamily}` : null;
  const taskRules = taskRulesOf(colors, BOX_TITLE, glyphFamily);
  const style: StylesheetJson = [
    { selector: 'node', style: node },
    { selector: 'node:parent', style: boxStyleOf(colors) },
    { selector: `node:parent.${EXPORTING_CLASS}`, style: BOX_TITLE },
    ...taskRules,
    { selector: 'edge', style: edgeStyleOf(colors) },
    ...NO_PRESS_RULES,
    { selector: 'node.selected', style: selectedNode },
    { selector: 'node.highlighted', style: highlightedNode },
    { selector: 'edge.highlighted', style: highlightedEdge },
    { selector: 'edge.selected', style: selectedEdge },
    { selector: 'node.ghost', style: GHOST_NODE },
    { selector: 'edge.ghost', style: GHOST_EDGE },
    { selector: '.dimmed', style: dimmed },
    { selector: `node.${FOLDER_NODE_CLASS}`, style: FOLDER_NODE },
    { selector: `edge.${FOLDER_LINK_CLASS}`, style: folderLinkStyleOf(colors, fontFamily) },
    { selector: `node.${DIMMED_BOX_CLASS}`, style: dimmedBoxStyleOf(colors) },
    { selector: `.${FOLDER_HIDDEN_CLASS}`, style: HIDDEN }
  ];

  return style;
};
