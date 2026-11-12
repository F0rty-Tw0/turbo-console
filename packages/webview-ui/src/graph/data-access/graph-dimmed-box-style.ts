import type { Css, StylesheetJson } from 'cytoscape';

import { ATOM_BOX_CLASS } from '../common/graph-atom.const.ts';
import { SCRIPTS_BOX_CLASS, TASK_BOX_CLASS, TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
import { DIMMED_BOX_CLASS } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/** A box faded with `dimmed-box`: its frame, title and fill at the theme's dimmed opacity, its packages untouched. */
const dimmedBoxStyleOf = (colors: ThemeColors): Css.Node => {
  const opacity = colors.dimmedOpacity;
  const dimmedBox = { 'border-opacity': opacity, 'text-opacity': opacity, 'background-opacity': opacity } as const;

  return dimmedBox;
};

const SEE_THROUGH = { 'background-opacity': 0 } as const;

const SEE_THROUGH_CLASSES = [TASK_BOX_CLASS, SCRIPTS_BOX_CLASS, TASK_FOLDER_CLASS, ATOM_BOX_CLASS];

const SEE_THROUGH_SELECTOR = SEE_THROUGH_CLASSES.map((name): string => `node.${DIMMED_BOX_CLASS}.${name}`).join(', ');

/**
 * The `dimmed-box` fade, then the task mode boxes kept see-through while faded: a task link is drawn under them
 * (`routeRulesOf`), so a faded fill would fade the line inside the box too.
 */
export const dimmedBoxRulesOf = (colors: ThemeColors): StylesheetJson => {
  const rules: StylesheetJson = [
    { selector: `node.${DIMMED_BOX_CLASS}`, style: dimmedBoxStyleOf(colors) },
    { selector: SEE_THROUGH_SELECTOR, style: SEE_THROUGH }
  ];

  return rules;
};
