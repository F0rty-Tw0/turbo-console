import type { Css, NodeSingular, StylesheetJson, StylesheetJsonBlock } from 'cytoscape';

import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { RUN_CLASS_PREFIX, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
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

const GHOST_NODE = { 'border-style': 'dashed', 'text-opacity': 0.75 } as const;

const GHOST_EDGE = { 'line-style': 'dashed' } as const;

const DIMMED = { opacity: 0.25 } as const;

const DIMMED_BOX = { 'border-opacity': 0.25, 'text-opacity': 0.25, 'background-opacity': 0.25 } as const;

/** A task node shows its task name; its id is `package#name`. */
const TASK_NODE = { label: 'data(label)' } as const;

/** A task's run state as an outline outside its frame, so it never hides the selection border. */
const runRuleOf = (colors: ThemeColors, state: GraphRunState): StylesheetJsonBlock => {
  const style = { 'outline-color': colors.runs[state], 'outline-width': 3, 'outline-offset': 2 };
  const rule: StylesheetJsonBlock = { selector: `node.${RUN_CLASS_PREFIX}${state}`, style };

  return rule;
};

/** Moves a `top` label down from above the frame to the middle of the box's top padding band. */
const TITLE_MARGIN_Y = (FOLDER_PADDING_PX + NODE_FONT_SIZE) / 2;

/** A box's width without its padding, so its title ends a padding short of each side of the frame. */
const titleWidthOf = (box: NodeSingular): string => `${box.width()}px`;

/**
 * What `exportPngOf` adds to a box while it runs: its folder title centred in the top padding band, inside the frame,
 * cut with an ellipsis when wider than the box; the page never shows it. `cy.png` bounds skip the title, so outside
 * the frame it would be cut off at the image edge.
 */
const EXPORTING_BOX = {
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
 * `ghost` (dashed) is the one `GraphView.setGhosts` applies; a `task` node reads its name and a `run-<state>` class outlines it. The folder pass draws `folder-node` (a collapsed folder, its
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
  const folderNode = { label: 'data(label)', 'text-wrap': 'wrap', 'text-max-width': `${COLLAPSED_LABEL_MAX_PX}px` } as const;
  const runRules = RUN_STATES.map((state) => runRuleOf(colors, state));
  const style: StylesheetJson = [
    { selector: 'node', style: node },
    { selector: `node.${TASK_NODE_CLASS}`, style: TASK_NODE },
    { selector: 'node:parent', style: boxStyleOf(colors) },
    { selector: `node:parent.${EXPORTING_CLASS}`, style: EXPORTING_BOX },
    { selector: 'edge', style: edge },
    { selector: 'node.selected', style: selectedNode },
    { selector: 'node.highlighted', style: highlightedNode },
    { selector: 'edge.highlighted', style: highlightedEdge },
    { selector: 'edge.selected', style: selectedEdge },
    ...runRules,
    { selector: 'node.ghost', style: GHOST_NODE },
    { selector: 'edge.ghost', style: GHOST_EDGE },
    { selector: '.dimmed', style: DIMMED },
    { selector: `node.${FOLDER_NODE_CLASS}`, style: folderNode },
    { selector: `edge.${FOLDER_LINK_CLASS}`, style: folderLinkStyleOf(colors, fontFamily) },
    { selector: `node.${DIMMED_BOX_CLASS}`, style: DIMMED_BOX },
    { selector: `.${FOLDER_HIDDEN_CLASS}`, style: HIDDEN }
  ];

  return style;
};
