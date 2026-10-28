import type { ActionIconKey, GraphIconId } from './graph-icon.type.ts';

/** The Codicon ids the graph page draws (spec §4.9); `graph-icon.const.spec.ts` checks each against the shipped stylesheet. */
export const GRAPH_ICON_IDS = [
  'layout-sidebar-left',
  'layout-sidebar-right',
  'screen-full',
  'refresh',
  'close',
  'filter',
  'package',
  'arrow-right',
  'git-commit',
  'file-text',
  'file',
  'info',
  'warning',
  'eye-closed',
  'chevron-down',
  'chevron-right',
  'chevron-left',
  'ellipsis',
  'check',
  'dash',
  'desktop-download',
  'tasklist',
  'sync',
  'pulse',
  'pass',
  'error',
  'debug-stop',
  'folder-opened',
  'type-hierarchy',
  'clear-all',
  'target',
  'eye',
  'fold',
  'unfold',
  'play',
  'debug-rerun'
] as const;

/** The one icon per action that menus, Details buttons and Controls toggles draw (spec D10). */
export const ACTION_ICONS: Readonly<Record<ActionIconKey, GraphIconId>> = {
  openDetails: 'file-text',
  focus: 'target',
  clearFocus: 'close',
  startTrace: 'git-commit',
  showTasks: 'tasklist',
  exclude: 'eye-closed',
  showAll: 'eye',
  collapse: 'fold',
  expand: 'unfold',
  run: 'play',
  runNoCache: 'debug-rerun',
  stop: 'debug-stop'
};
