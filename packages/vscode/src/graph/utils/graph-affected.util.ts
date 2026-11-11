import type { GraphAffected, GraphAffectedMark, GraphTask } from '@turbo-console/webview-ui';

import type { AffectedView } from '../../tree/common/affected.type.ts';

/**
 * The marks of the listed tasks the view names, keyed by task id, or `null` when the store has no view. A task the view marks
 * but the graph does not list is left out; a view that marks no listed task gives an object with no tasks, which clears the page.
 */
export const affectedOf = (tasks: GraphTask[], view: AffectedView | null): GraphAffected | null => {
  if (view === null) return null;

  const marks: Record<string, GraphAffectedMark> = {};

  for (const task of tasks) {
    const entry = view.tasks.get(task.id);

    if (entry !== undefined) marks[task.id] = entry.mark;
  }

  const affected: GraphAffected = { mode: view.mode, tasks: marks };

  return affected;
};
