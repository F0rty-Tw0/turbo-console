import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskModes } from '../common/graph-task.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';
import { shownSetOf } from '../utils/shown-set.util.ts';

/**
 * What task mode remembers: the host's latest tasks, hash, single-package flag and root label, and the task view it
 * saves through `TaskModes`.
 */
export class GraphTaskMemory {
  private readonly modes: Pick<TaskModes, 'task' | 'saveTask'>;
  private latestTasks: GraphTask[] = [];
  private latestHash = '';
  private isSinglePackage = false;
  private latestRootLabel: string | null = null;

  public constructor(modes: Pick<TaskModes, 'task' | 'saveTask'>) {
    this.modes = modes;
  }

  public keep(state: GraphReady): void {
    this.latestTasks = state.tasks;
    this.latestHash = state.hash;
    this.isSinglePackage = state.singlePackage;
    this.latestRootLabel = state.rootLabel;
  }

  public tasks(): GraphTask[] {
    return this.latestTasks;
  }

  public hash(): string {
    return this.latestHash;
  }

  public rootLabel(): string | null {
    return this.latestRootLabel;
  }

  public view(): TaskViewState {
    return this.modes.task() ?? freshTaskViewOf();
  }

  /** A single-package root with none of its chosen ids listed shows every task, without saving that choice. */
  public shownSet(): ShownSet {
    const { chosen, depth, capLifted } = this.view();
    const tasks = this.latestTasks;
    const effective = this.effectiveChosen(chosen);

    return shownSetOf({ tasks, chosen: effective, depth, capLifted });
  }

  public save(edit: Partial<TaskViewState>): void {
    const last = this.view();
    const view: TaskViewState = { ...last, ...edit };

    this.modes.saveTask(view, this.latestHash);
  }

  /** Every listed id when a single-package root lists none of `chosen`; `chosen` otherwise. */
  private effectiveChosen(chosen: string[]): string[] {
    const ids = this.latestTasks.map((task) => task.id);
    const listed = new Set(ids);
    const isAnyListed = chosen.some((id) => listed.has(id));
    const isFallback = this.isSinglePackage && !isAnyListed;

    return isFallback ? ids : chosen;
  }
}
