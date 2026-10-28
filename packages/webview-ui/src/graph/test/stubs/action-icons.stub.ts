import type { ActionIconKey, GraphIconId } from '../../common/graph-icon.type.ts';

/** An action icon table where every action draws another icon than the shipped one, so a hard-coded icon shows. */
export const SWAPPED_ACTION_ICONS_STUB: Readonly<Record<ActionIconKey, GraphIconId>> = {
  openDetails: 'package',
  focus: 'info',
  clearFocus: 'warning',
  startTrace: 'filter',
  showTasks: 'refresh',
  exclude: 'eye',
  showAll: 'eye-closed',
  collapse: 'unfold',
  expand: 'fold',
  run: 'debug-rerun',
  runNoCache: 'play',
  stop: 'error'
};
