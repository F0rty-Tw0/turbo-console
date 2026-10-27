import type { TaskDetailsModel, TaskDetailsView } from '../../common/task-details.type.ts';
import { buildDetailsContent } from '../../ui/details-elements.ts';
import { buildTaskDetails, buildTaskDetailsEmpty, buildTaskDetailsPanel } from '../../ui/task-details-elements.ts';
import type { TaskDetailsViewsMock } from '../common/graph-task-mode.type.ts';

/** The real panel and view builders, so a spec clicks and focuses the buttons `GraphTaskDetails` wires. */
export const taskDetailsViewsMock = (): TaskDetailsViewsMock => {
  const panel = buildTaskDetailsPanel();
  const built: TaskDetailsView[] = [];
  const view = (model: TaskDetailsModel): TaskDetailsView => {
    const shown = buildTaskDetails(model);

    built.push(shown);

    return shown;
  };
  const views = { panel: (): HTMLElement => panel, content: buildDetailsContent, empty: buildTaskDetailsEmpty, view };
  const mock: TaskDetailsViewsMock = { views, panel, built };

  return mock;
};
