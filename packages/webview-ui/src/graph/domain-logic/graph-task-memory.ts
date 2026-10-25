import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskModes } from '../common/graph-task.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';
import { shownSetOf } from '../utils/shown-set.util.ts';

/** What task mode remembers: the host's latest tasks and hash, and the task view it saves through `TaskModes`. */
export class GraphTaskMemory {
  private readonly modes: Pick<TaskModes, 'task' | 'saveTask'>;
  private latestTasks: GraphTask[] = [];
  private latestHash = '';

  public constructor(modes: Pick<TaskModes, 'task' | 'saveTask'>) {
    this.modes = modes;
  }

  public keep(state: GraphReady): void {
    this.latestTasks = state.tasks;
    this.latestHash = state.hash;
  }

  public tasks(): GraphTask[] {
    return this.latestTasks;
  }

  public hash(): string {
    return this.latestHash;
  }

  public view(): TaskViewState {
    return this.modes.task() ?? freshTaskViewOf();
  }

  public shownSet(): ShownSet {
    const { chosen, depth, capLifted } = this.view();

    return shownSetOf({ tasks: this.latestTasks, chosen, depth, capLifted });
  }

  public save(edit: Partial<TaskViewState>): void {
    const last = this.view();
    const view: TaskViewState = { ...last, ...edit };

    this.modes.saveTask(view, this.latestHash);
  }
}
