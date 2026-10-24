import type { GraphTask } from '../../../bridge/common/graph-state.type.ts';
import type { TaskControlsElements, TaskControlsRow } from '../../common/task-controls.type.ts';
import { buildTaskControls, buildTaskRow } from '../../ui/task-controls-elements.ts';
import type { TaskControlsViewsMock } from '../common/graph-task-mode.type.ts';

/** The real panel and row builders, so a spec types, clicks and focuses what `GraphTaskControls` wires. */
export const taskControlsViewsMock = (): TaskControlsViewsMock => {
  const elements = buildTaskControls();
  const rows: TaskControlsRow[] = [];
  const row = (task: GraphTask): TaskControlsRow => {
    const built = buildTaskRow(task);

    rows.push(built);

    return built;
  };
  const views = { build: (): TaskControlsElements => elements, row };
  const mock: TaskControlsViewsMock = { views, elements, rows };

  return mock;
};
