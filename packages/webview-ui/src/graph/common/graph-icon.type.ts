// eslint-disable-next-line local/type-placement -- the id union derives from the list the spec checks against codicon.css, so the two cannot drift.
import type { GRAPH_ICON_IDS } from './graph-icon.const.ts';

export type GraphIconId = (typeof GRAPH_ICON_IDS)[number];

/** The ids of the Codicons that mark a task's run state. */
export type RunStateIconId = Extract<GraphIconId, 'sync' | 'pulse' | 'pass' | 'error' | 'debug-stop'>;

/** The actions that draw an icon from `ACTION_ICONS` (spec D10). */
export type ActionIconKey =
  | 'openDetails'
  | 'focus'
  | 'clearFocus'
  | 'startTrace'
  | 'showTasks'
  | 'exclude'
  | 'showAll'
  | 'collapse'
  | 'expand'
  | 'run'
  | 'runNoCache'
  | 'stop'
  | 'showPackage';
