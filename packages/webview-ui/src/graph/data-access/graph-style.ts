import type { Css, StylesheetJson } from 'cytoscape';

import { BOX_TITLE } from './graph-box-title-style.ts';
import { dimmedBoxRulesOf } from './graph-dimmed-box-style.ts';
import { routeRulesOf } from './graph-route-style.ts';
import { selectionRulesOf } from './graph-selection-style.ts';
import { taskRulesOf } from './graph-task-style.ts';
import {
  COLLAPSED_LABEL_MAX_PX,
  DASHED_BORDER_PX,
  DASHED_LINE_PX,
  EDGE_WIDTH,
  EXPORTING_CLASS,
  FOLDER_HIDDEN_CLASS,
  FOLDER_LINK_CLASS,
  FOLDER_NODE_CLASS,
  FOLDER_PADDING_PX,
  HIGHLIGHTED_EDGE_WIDTH,
  NODE_BORDER_PX,
  NODE_FONT_SIZE,
  ROW_LESS_CLASS,
  SELECTED_EDGE_WIDTH
} from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/** Typed loosely: cytoscape's `Css.Core` demands every core property, and this sets one. */
const NO_PRESS_CIRCLE: Record<string, number> = { 'active-bg-opacity': 0 };

const NO_PRESS_OVERLAY = { 'overlay-opacity': 0 } as const;

/**
 * No press feedback: Cytoscape's default dims a pressed node or edge with a black overlay, and a press on the
 * background with a circle.
 */
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

/** A folder link's `<n> link(s)` label, on the canvas background so a crossing line never runs through it; the label takes taps. */
const folderLinkStyleOf = (colors: ThemeColors, fontFamily: string): Css.Edge => {
  const folderLink = {
    label: 'data(label)',
    'font-size': NODE_FONT_SIZE,
    'font-family': fontFamily,
    color: colors.label,
    'text-background-color': colors.background,
    'text-background-opacity': 1,
    'text-events': 'yes'
  } as const;

  return folderLink;
};

const HIDDEN = { display: 'none' } as const;

const GHOST_NODE = { 'border-style': 'dashed', 'border-dash-pattern': DASHED_BORDER_PX, 'text-opacity': 0.75 } as const;

/**
 * A node with label data draws it in place of its id. A separate rule, not the base one, so a box node with no label
 * data never meets a `data(label)` mapping, which Cytoscape warns about on every style pass.
 */
const LABELLED_NODE = { label: 'data(label)' } as const;

/** A collapsed folder: no label, since its DOM header row shows the title; its corners as round as a box's. */
const FOLDER_NODE = { label: '', 'corner-radius': '8px' } as const;

/** A collapsed folder with no header row to show its title: while `exportPngOf` runs, or `row-less`; its label drawn, wrapped. */
const FOLDER_NODE_LABELLED = { label: 'data(label)', 'text-wrap': 'wrap', 'text-max-width': `${COLLAPSED_LABEL_MAX_PX}px` } as const;

const FOLDER_NODE_LABELLED_SELECTOR = `node.${FOLDER_NODE_CLASS}.${EXPORTING_CLASS}, node.${FOLDER_NODE_CLASS}.${ROW_LESS_CLASS}`;

const GHOST_EDGE = { 'line-style': 'dashed', 'line-dash-pattern': DASHED_LINE_PX } as const;

const EDGE_ARROW = { 'target-arrow-shape': 'triangle', 'arrow-scale': 0.8, 'target-distance-from-node': 3 } as const;

const edgeStyleOf = (colors: ThemeColors): Css.Edge => {
  const edge = {
    ...EDGE_ARROW,
    'curve-style': 'bezier',
    width: EDGE_WIDTH,
    'line-color': colors.edge,
    'target-arrow-color': colors.edge
  } as const;

  return edge;
};

/** A highlighted or selected edge: wider, its line and arrow in `colour`. */
const emphasisEdgeOf = (width: number, colour: string): Css.Edge => {
  const edge = { width, 'line-color': colour, 'target-arrow-color': colour };

  return edge;
};

/**
 * The Cytoscape stylesheet: round-rectangle nodes sized from their data, label centred, 1 px frame; bezier edges with a
 * triangle at the dependency, drawn on their ELK route while `routed` and a task link straight (`routeRulesOf`).
 * `selected`, `highlighted` and `dimmed` are the classes `GraphView.paint` applies; `ghost` (dashed) is the one
 * `GraphView.setGhosts` applies; a press draws no overlay on a node or edge and no circle on the
 * background; `taskRulesOf` adds the task mode rules and `selectionRulesOf` the selected border and fill and the bold focus target.
 * The folder pass draws `folder-node` (a collapsed folder, its label wrapped only while exporting or `row-less`) and
 * `folder-link`, fades a box with `dimmed-box` and hides with `folder-hidden`, last so nothing shows it. Every colour
 * comes from `colors`. With `glyphs` the task and file nodes draw a state glyph from the codicon font before their name, and a package
 * task box draws the package glyph before its title; the base node rule keeps `fontFamily`.
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
  const highlightedNode = { 'border-width': NODE_BORDER_PX, 'border-color': colors.highlighted };
  const highlightedEdge = emphasisEdgeOf(HIGHLIGHTED_EDGE_WIDTH, colors.highlighted);
  const selectedEdge = emphasisEdgeOf(SELECTED_EDGE_WIDTH, colors.selected);
  const dimmed = { opacity: colors.dimmedOpacity };
  const glyphFamily = glyphs ? `codicon, ${fontFamily}` : null;
  const taskRules = taskRulesOf(colors, BOX_TITLE, glyphFamily);
  const selectionRules = selectionRulesOf(colors);
  const routeRules = routeRulesOf();
  const dimmedBoxRules = dimmedBoxRulesOf(colors);
  const style: StylesheetJson = [
    { selector: 'node', style: node },
    { selector: 'node[label]', style: LABELLED_NODE },
    { selector: 'node:parent', style: boxStyleOf(colors) },
    { selector: `node:parent.${EXPORTING_CLASS}`, style: BOX_TITLE },
    ...taskRules,
    { selector: 'edge', style: edgeStyleOf(colors) },
    ...routeRules,
    ...NO_PRESS_RULES,
    ...selectionRules,
    { selector: 'node.highlighted', style: highlightedNode },
    { selector: 'edge.highlighted', style: highlightedEdge },
    { selector: 'edge.selected', style: selectedEdge },
    { selector: 'node.ghost', style: GHOST_NODE },
    { selector: 'edge.ghost', style: GHOST_EDGE },
    { selector: '.dimmed', style: dimmed },
    { selector: `node.${FOLDER_NODE_CLASS}`, style: FOLDER_NODE },
    { selector: FOLDER_NODE_LABELLED_SELECTOR, style: FOLDER_NODE_LABELLED },
    { selector: `edge.${FOLDER_LINK_CLASS}`, style: folderLinkStyleOf(colors, fontFamily) },
    ...dimmedBoxRules,
    { selector: `.${FOLDER_HIDDEN_CLASS}`, style: HIDDEN }
  ];

  return style;
};
