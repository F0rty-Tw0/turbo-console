import type { GraphViewMode, GraphViewState, PackageViewState, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { PackageSaver, ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskPanelsOpen } from '../common/graph-task.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

/**
 * The one save path for both modes. A package save keeps the mode and the last task view; in task mode it writes nothing,
 * since task mode saves the shared `controlsOpen` and `detailsOpen` itself and the package fields wait for package mode.
 */
export class ViewStateModes {
  public readonly packages: PackageSaver;

  private readonly saver: ViewStateSaver;
  private last: GraphViewState | null;
  private hasGrouping: boolean;

  /** `hasGrouping` is false when the host kept no grouping choice, as in a state saved before folders existed. */
  public constructor(saver: ViewStateSaver, saved: GraphViewState | null, hasGrouping = saved !== null) {
    this.saver = saver;
    this.last = saved;
    this.hasGrouping = hasGrouping;
    this.packages = {
      schedule: (state: PackageViewState): void => this.schedulePackages(state),
      flush: (): void => saver.flush()
    };
  }

  public mode(): GraphViewMode {
    return this.last?.mode ?? 'packages';
  }

  public task(): TaskViewState | null {
    return this.last?.task ?? null;
  }

  public current(): GraphViewState | null {
    return this.last;
  }

  /** Whether a grouping choice is saved: the host kept one, or this page wrote a state, which always holds one. */
  public isGroupingSaved(): boolean {
    return this.hasGrouping;
  }

  /** Writes the last state, or the fresh state of `hash` with nothing saved, in `mode`. */
  public setMode(mode: GraphViewMode, hash: string): void {
    const base = this.last ?? freshViewStateOf(hash);
    const state: GraphViewState = { ...base, mode };

    this.write(state);
  }

  /** Writes `task` over the last package fields, or the fresh ones of `hash` with nothing saved, in task mode. */
  public saveTask(task: TaskViewState, hash: string): void {
    const base = this.last ?? freshViewStateOf(hash);
    const state: GraphViewState = { ...base, mode: 'tasks', task };

    this.write(state);
  }

  /** Writes a task mode panel's open state over the last state; nothing before any state is written. */
  public savePanels(panels: TaskPanelsOpen): void {
    const last = this.last;

    if (last === null) return;

    const state: GraphViewState = { ...last, ...panels };

    this.write(state);
  }

  /** Task mode owns the panels' open state, so a package save then would write the package side's stale copy. */
  private schedulePackages(state: PackageViewState): void {
    const isTaskMode = this.mode() === 'tasks';

    if (isTaskMode) return;

    const task = this.task();
    const kept: GraphViewState = { ...state, mode: 'packages', task };

    this.write(kept);
  }

  private write(state: GraphViewState): void {
    this.last = state;
    this.hasGrouping = true;
    this.saver.schedule(state);
  }
}
