import { FLOW_DASH_PX, FLOW_EDGE_LIMIT, FLOW_IDLE_MS, FLOW_LINE_PX } from './flow.const.ts';
import { RUN_STATE_TEXT, SCRIPTS_BOX_DASH_PX, TASK_BOX_DASH_PX } from './graph-task.const.ts';
import { DASHED_BORDER_PX, HIGHLIGHTED_EDGE_WIDTH } from './graph.const.ts';
import { BOX_SWATCH, LINE_SWATCH, PILL_SWATCH } from './legend-swatch.const.ts';
import type { LegendOutline, LegendRow, LegendSwatch } from './legend.type.ts';
import type { GraphAffected } from '../../bridge/common/graph-affected.type.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';

/** A task or file outline is 2 px, as wide as the stylesheet's `outline-width`. */
const OUTLINE_PX = 2;

/** Every task-mode box swatch: a box with the task frame's 8 px corners. */
export const TASK_SWATCH: LegendSwatch = { ...BOX_SWATCH, radiusPx: 8 };

/** The words of the affected legend rows per level; the host's `AFFECTED_LEVELS` says the same, which the page cannot import. */
export const AFFECTED_LEVEL_WORDS: Readonly<Record<GraphAffected['mode'], string>> = {
  task: 'task level',
  package: 'package level'
};

const TASK_BOX_SWATCH: LegendSwatch = { ...TASK_SWATCH, dashPx: TASK_BOX_DASH_PX };

const TASK_FOLDER_SWATCH: LegendSwatch = { ...TASK_SWATCH, isNested: true };

const TASK_SCRIPTS_SWATCH: LegendSwatch = { ...TASK_SWATCH, dashPx: SCRIPTS_BOX_DASH_PX };

const FLOW_PEN: LegendOutline = { colour: 'background', px: FLOW_LINE_PX };

const FLOW_SWATCH: LegendSwatch = {
  ...LINE_SWATCH,
  shape: 'flow',
  stroke: 'highlighted',
  strokePx: HIGHLIGHTED_EDGE_WIDTH,
  dashPx: [FLOW_DASH_PX, FLOW_DASH_PX],
  outline: FLOW_PEN
};

const FLOW_TEXT = `Moving dashes: the highlighted task chain (stops after ${FLOW_IDLE_MS / 1000} s idle; off with reduced motion or over ${FLOW_EDGE_LIMIT} edges)`;

const runRowOf = (state: GraphRunState): LegendRow => {
  const swatch: LegendSwatch = { ...BOX_SWATCH, fill: 'cardFill', stroke: 'cardFrame', accentBar: `run-${state}` };
  const row: LegendRow = { id: `run-${state}`, text: `Task ${RUN_STATE_TEXT[state].toLowerCase()}`, swatch };

  return row;
};

const RUN_ROWS: LegendRow[] = RUN_STATES.map(runRowOf);

const PASSED_OUTLINE: LegendOutline = { colour: 'run-passed', px: OUTLINE_PX };

const FAILED_OUTLINE: LegendOutline = { colour: 'run-failed', px: OUTLINE_PX };

const CACHED_OUTLINE: LegendOutline = { colour: 'cached', px: OUTLINE_PX };

const FILE_PASSED_SWATCH: LegendSwatch = { ...PILL_SWATCH, outline: PASSED_OUTLINE };

const FILE_FAILED_SWATCH: LegendSwatch = { ...PILL_SWATCH, outline: FAILED_OUTLINE };

const FILE_CACHED_SWATCH: LegendSwatch = { ...PILL_SWATCH, outline: CACHED_OUTLINE };

const FILE_LIVE_SWATCH: LegendSwatch = { ...PILL_SWATCH, dashPx: DASHED_BORDER_PX };

/** The task graph's legend rows, in the order the popover lists them. */
export const TASK_LEGEND_ROWS: LegendRow[] = [
  { id: 'task-box', text: 'Dashed box: the tasks of one package', swatch: TASK_BOX_SWATCH },
  { id: 'task-folder', text: 'Folder box: packages in one folder', swatch: TASK_FOLDER_SWATCH },
  { id: 'task-scripts', text: 'Scripts box: package.json scripts that are not turbo tasks', swatch: TASK_SCRIPTS_SWATCH },
  { id: 'flow', text: FLOW_TEXT, swatch: FLOW_SWATCH },
  ...RUN_ROWS,
  { id: 'file-passed', text: 'File passed', swatch: FILE_PASSED_SWATCH },
  { id: 'file-failed', text: 'File failed', swatch: FILE_FAILED_SWATCH },
  { id: 'file-cached', text: 'File cached (result from the cache)', swatch: FILE_CACHED_SWATCH },
  { id: 'file-live', text: 'Dashed file: a live test', swatch: FILE_LIVE_SWATCH }
];
