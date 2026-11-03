import type { TaskControlsElements } from '../../common/task-controls.type.ts';
import type { ProjectLine, TaskGridRow } from '../../common/task-grid.type.ts';
import { buildTaskControls } from '../../ui/task-controls-elements.ts';
import { buildProjectLine } from '../../ui/task-grid-rows.ts';
import type { TaskControlsViewsMock } from '../common/graph-task-mode.type.ts';

/** The real panel and grid row builders, so a spec types, clicks and focuses what `GraphTaskControls` wires. */
export const taskControlsViewsMock = (): TaskControlsViewsMock => {
  const elements = buildTaskControls();
  const rows: TaskGridRow[] = [];
  const line = (projectLine: ProjectLine): TaskGridRow => {
    const built = buildProjectLine(projectLine);

    rows.push(built);

    return built;
  };
  const views = { build: (): TaskControlsElements => elements, line };
  const mock: TaskControlsViewsMock = { views, elements, rows };

  return mock;
};
