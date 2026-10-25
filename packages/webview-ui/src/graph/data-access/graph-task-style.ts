import type { Css, StylesheetJsonBlock } from 'cytoscape';

import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { ATOM_UMBRELLA_CLASS } from '../common/graph-atom.const.ts';
import { RUN_CLASS_PREFIX, TASK_BOX_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/** A task node shows its task name; its id is `package#name`. */
const TASK_NODE = { label: 'data(label)' } as const;

/** An umbrella's label holds a line break: its name over its counts. */
const UMBRELLA_NODE = { 'text-wrap': 'wrap' } as const;

/** A task's run state as an outline outside its frame, so it never hides the selection border. */
const runRuleOf = (colors: ThemeColors, state: GraphRunState): StylesheetJsonBlock => {
  const style = { 'outline-color': colors.runs[state], 'outline-width': 3, 'outline-offset': 2 };
  const rule: StylesheetJsonBlock = { selector: `node.${RUN_CLASS_PREFIX}${state}`, style };

  return rule;
};

/**
 * The task mode rules: a `task` node reads its name, an `atom-umbrella` wraps its label to put the counts under the name,
 * a `run-<state>` class outlines it, and a `task-box` draws `boxTitle` on the page and in exports, left-aligned one padding
 * in from the frame so a link entering at the top centre misses it. `left-inside` starts a compound's label two paddings
 * in, so the margin takes one back. They come after the `exporting` rule, so an exported task box keeps this alignment.
 */
export const taskRulesOf = (colors: ThemeColors, boxTitle: Css.Node): StylesheetJsonBlock[] => {
  const taskBox = { ...boxTitle, 'text-halign': 'left-inside', 'text-margin-x': -FOLDER_PADDING_PX } as const;
  const runRules = RUN_STATES.map((state) => runRuleOf(colors, state));
  const rules: StylesheetJsonBlock[] = [
    { selector: `node.${TASK_NODE_CLASS}`, style: TASK_NODE },
    { selector: `node.${ATOM_UMBRELLA_CLASS}`, style: UMBRELLA_NODE },
    { selector: `node:parent.${TASK_BOX_CLASS}`, style: taskBox },
    ...runRules
  ];

  return rules;
};
