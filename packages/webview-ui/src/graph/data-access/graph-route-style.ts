import type { Css, StylesheetJson } from 'cytoscape';

import { ROUTED_CLASS, ROUTE_RADIUS_PX } from '../common/graph-layout.const.ts';
import { TASK_LINK_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_LINK_CLASS } from '../common/graph.const.ts';

/** `node-position`: weights and distances are taken in the source → target centre frame `routeSegmentsOf` measures in. */
const ROUTED_EDGE: Css.Edge = {
  'curve-style': 'round-segments',
  'segment-radii': [ROUTE_RADIUS_PX],
  'segment-weights': 'data(segWeights)',
  'segment-distances': 'data(segDistances)',
  'source-endpoint': 'data(srcEnd)',
  'target-endpoint': 'data(tgtEnd)',
  'edge-distances': 'node-position'
};

/**
 * A task link is one straight line from its task to its dependency, whatever bends ELK routed it on. It is drawn under
 * every box (`bottom`), so a box title crossed by the line draws over it on its backdrop (`taskRulesOf`); the boxes
 * are see-through, so the line shows inside them.
 */
const TASK_LINK = { 'curve-style': 'straight', 'z-compound-depth': 'bottom' } as const;

/** A link out of an open umbrella leaves the bottom of its box, by the offset `umbrellaLinkEndsOf` writes, past its files. */
const OPEN_UMBRELLA_LINK = { 'source-endpoint': 'data(srcEnd)' } as const;

/** A folder link's label sits beside its line by the offset `labelFolderLinks` writes; a link without one has no mapping to resolve. */
const LABEL_OFFSET: Record<string, string> = { 'text-margin-x': 'data(labelDx)', 'text-margin-y': 'data(labelDy)' };

/**
 * A routed package edge drawn on its ELK route, from the data `routeSegmentsOf` builds, and a task link drawn straight.
 * Spread after the base `edge` rule so their `curve-style` wins; the selected, highlighted and ghost rules set colour, width and dash only, so they still apply on top.
 */
export const routeRulesOf = (): StylesheetJson => {
  const rules: StylesheetJson = [
    { selector: `edge.${ROUTED_CLASS}`, style: ROUTED_EDGE },
    { selector: `edge.${TASK_LINK_CLASS}`, style: TASK_LINK },
    { selector: `edge.${TASK_LINK_CLASS}[srcEnd]`, style: OPEN_UMBRELLA_LINK },
    { selector: `edge.${FOLDER_LINK_CLASS}[labelDx]`, style: LABEL_OFFSET }
  ];

  return rules;
};
