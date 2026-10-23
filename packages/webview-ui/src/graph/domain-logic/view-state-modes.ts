import type { GraphViewMode, GraphViewState, PackageViewState, TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { PackageSaver, ViewStateSaver } from '../common/graph-page.type.ts';
import { freshViewStateOf } from '../utils/fresh-view-state.util.ts';

/**
 * The one save path for both modes. A package save keeps the mode and the last task view; in task mode it only carries
 * `controlsOpen` and `detailsOpen` into the last package state, so the task camera never takes a package camera.
 */
export class ViewStateModes {
  public readonly packages: PackageSaver;

  private readonly saver: ViewStateSaver;
  private last: GraphViewState | null;

  public constructor(saver: ViewStateSaver, saved: GraphViewState | null) {
    this.saver = saver;
    this.last = saved;
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
  public savePanels(panels: Partial<Pick<GraphViewState, 'controlsOpen' | 'detailsOpen'>>): void {
    const last = this.last;

    if (last === null) return;

    const state: GraphViewState = { ...last, ...panels };

    this.write(state);
  }

  private schedulePackages(state: PackageViewState): void {
    const last = this.last;

    if (last === null || last.mode === 'packages') {
      const task = this.task();
      const kept: GraphViewState = { ...state, mode: 'packages', task };

      this.write(kept);

      return;
    }

    const { controlsOpen, detailsOpen } = state;
    const shared: GraphViewState = { ...last, controlsOpen, detailsOpen };

    this.write(shared);
  }

  private write(state: GraphViewState): void {
    this.last = state;
    this.saver.schedule(state);
  }
}
