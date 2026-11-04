import type { Css, StylesheetJson } from 'cytoscape';

import { ROUTED_CLASS, ROUTE_RADIUS_PX } from '../common/graph-layout.const.ts';
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

/** A folder link's label sits beside its line by the offset `labelFolderLinks` writes; a link without one has no mapping to resolve. */
const LABEL_OFFSET: Record<string, string> = { 'text-margin-x': 'data(labelDx)', 'text-margin-y': 'data(labelDy)' };

/**
 * A routed edge drawn on its ELK route, from the data `routeSegmentsOf` builds. Spread after the base `edge` rule so its
 * `curve-style` wins; the selected, highlighted and ghost rules set colour, width and dash only, so they still apply on top.
 */
export const routeRulesOf = (): StylesheetJson => {
  const rules: StylesheetJson = [
    { selector: `edge.${ROUTED_CLASS}`, style: ROUTED_EDGE },
    { selector: `edge.${FOLDER_LINK_CLASS}[labelDx]`, style: LABEL_OFFSET }
  ];

  return rules;
};
