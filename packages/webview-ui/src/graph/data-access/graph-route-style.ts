import type { StylesheetJson } from 'cytoscape';

import { TASK_LINK_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_LINK_CLASS } from '../common/graph.const.ts';

/**
 * A task link is one straight line from its task to its dependency, whatever bends ELK routed it on. Like every edge
 * it is drawn under every box, so a box title crossed by the line draws over it on its backdrop (`taskRulesOf`).
 */
const TASK_LINK = { 'curve-style': 'straight' } as const;

/** A link out of an open umbrella leaves the bottom of its box, by the offset `umbrellaLinkEndsOf` writes, past its files. */
const OPEN_UMBRELLA_LINK = { 'source-endpoint': 'data(srcEnd)' } as const;

/** A folder link's label sits beside its line by the offset `labelFolderLinks` writes; a link without one has no mapping to resolve. */
const LABEL_OFFSET: Record<string, string> = { 'text-margin-x': 'data(labelDx)', 'text-margin-y': 'data(labelDy)' };

/**
 * A task link drawn straight and a folder link's label offset. Spread after the base `edge` rule so its `curve-style`
 * wins; the selected, highlighted and ghost rules set colour, width and dash only, so they still apply on top.
 */
export const routeRulesOf = (): StylesheetJson => {
  const rules: StylesheetJson = [
    { selector: `edge.${TASK_LINK_CLASS}`, style: TASK_LINK },
    { selector: `edge.${TASK_LINK_CLASS}[srcEnd]`, style: OPEN_UMBRELLA_LINK },
    { selector: `edge.${FOLDER_LINK_CLASS}[labelDx]`, style: LABEL_OFFSET }
  ];

  return rules;
};
