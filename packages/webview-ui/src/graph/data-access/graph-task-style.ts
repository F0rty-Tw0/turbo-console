import type { Css, StylesheetJsonBlock } from 'cytoscape';

import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import {
  ATOM_BOX_CLASS,
  ATOM_BOX_PADDING_PX,
  ATOM_FILE_CLASS,
  ATOM_FILE_SIZE,
  ATOM_LIVE_CLASS,
  ATOM_OUTCOME_CLASSES,
  ATOM_UMBRELLA_CLASS
} from '../common/graph-atom.const.ts';
import { RUN_CLASS_PREFIX, TASK_BOX_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';

/** A task node shows its task name; its id is `package#name`. */
const TASK_NODE = { label: 'data(label)' } as const;

/** An umbrella's label holds a line break: its name over its counts. */
const UMBRELLA_NODE = { 'text-wrap': 'wrap' } as const;

/** A file node reads its file name, one line cut with an ellipsis at the node's width. */
const ATOM_FILE = { label: 'data(label)', 'text-wrap': 'ellipsis', 'text-max-width': `${ATOM_FILE_SIZE.width}px` } as const;

/** An expanded group's box pads its content and sizes from the nodes, not from their labels. */
const ATOM_BOX = { padding: `${ATOM_BOX_PADDING_PX}px`, 'compound-sizing-wrt-labels': 'exclude' } as const;

/** A live file's border and outline are dashed; a solid outcome outline would hide a dashed border alone. */
const ATOM_LIVE = { 'border-style': 'dashed', 'outline-style': 'dashed' } as const;

/** A file's outcome as a 2 px outline; a run outline after it wins for a running file. */
const outcomeRuleOf = (className: string, color: string): StylesheetJsonBlock => {
  const style = { 'outline-color': color, 'outline-width': 2, 'outline-offset': 0 };
  const rule: StylesheetJsonBlock = { selector: `node.${className}`, style };

  return rule;
};

/** A task's run state as an outline outside its frame, so it never hides the selection border. */
const runRuleOf = (colors: ThemeColors, state: GraphRunState): StylesheetJsonBlock => {
  const style = { 'outline-color': colors.runs[state], 'outline-width': 3, 'outline-offset': 2 };
  const rule: StylesheetJsonBlock = { selector: `node.${RUN_CLASS_PREFIX}${state}`, style };

  return rule;
};

/**
 * The task mode rules: a `task` node reads its name, an `atom-umbrella` wraps its label to put the counts under the name,
 * an `atom-file` reads its file name and an `atom-box` pads its content, an `atom-<outcome>` class outlines a file (dashed
 * border when `atom-live`), a `run-<state>` class outlines a task or file after them, and a `task-box` draws `boxTitle` on the page and in exports, left-aligned one padding
 * in from the frame so a link entering at the top centre misses it. `left-inside` starts a compound's label two paddings
 * in, so the margin takes one back. They come after the `exporting` rule, so an exported task box keeps this alignment.
 */
export const taskRulesOf = (colors: ThemeColors, boxTitle: Css.Node): StylesheetJsonBlock[] => {
  const taskBox = { ...boxTitle, 'text-halign': 'left-inside', 'text-margin-x': -FOLDER_PADDING_PX } as const;
  const runRules = RUN_STATES.map((state) => runRuleOf(colors, state));
  const outcomeRules = [
    outcomeRuleOf(ATOM_OUTCOME_CLASSES.passed, colors.runs.passed),
    outcomeRuleOf(ATOM_OUTCOME_CLASSES.failed, colors.runs.failed),
    outcomeRuleOf(ATOM_OUTCOME_CLASSES.cached, colors.cached)
  ];
  const rules: StylesheetJsonBlock[] = [
    { selector: `node.${TASK_NODE_CLASS}`, style: TASK_NODE },
    { selector: `node.${ATOM_UMBRELLA_CLASS}`, style: UMBRELLA_NODE },
    { selector: `node:parent.${TASK_BOX_CLASS}`, style: taskBox },
    { selector: `node.${ATOM_FILE_CLASS}`, style: ATOM_FILE },
    { selector: `node:parent.${ATOM_BOX_CLASS}`, style: ATOM_BOX },
    ...outcomeRules,
    { selector: `node.${ATOM_LIVE_CLASS}`, style: ATOM_LIVE },
    ...runRules
  ];

  return rules;
};
