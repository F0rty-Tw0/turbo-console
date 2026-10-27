import { isLiveRun } from './task-run.util.ts';
import { itemOf } from './widget-menu-model.util.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import { RUN_LABEL, RUN_NO_CACHE_LABEL, STOP_LABEL } from '../common/graph-task.const.ts';
import type { TaskMenuActions } from '../common/task-details.type.ts';
import type { MenuItemModel } from '../common/widget-menu.type.ts';

const NO_ITEMS: MenuItemModel[] = [];

/** Run and Run without cache for a runnable task · Stop while it runs: the task panel's buttons, as menu items. */
export const taskMenuOf = (task: GraphTask, state: GraphRunState | null, actions: TaskMenuActions): MenuItemModel[] => {
  const { id } = task;
  const run = itemOf(RUN_LABEL, (): void => actions.act(id, 'run'));
  const runNoCache = itemOf(RUN_NO_CACHE_LABEL, (): void => actions.act(id, 'runNoCache'));
  const stop = itemOf(STOP_LABEL, (): void => actions.act(id, 'stop'));
  const runItems: MenuItemModel[] = [run, runNoCache];
  const stopItems: MenuItemModel[] = [stop];
  const runs = task.isRunnable ? runItems : NO_ITEMS;
  const isLive = isLiveRun(state);
  const stops = isLive ? stopItems : NO_ITEMS;
  const model: MenuItemModel[] = [...runs, ...stops];

  return model;
};
