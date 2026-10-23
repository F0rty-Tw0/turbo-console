import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskDetails, TaskDetailsModel, TaskRuns, TaskSelectionDeps, TaskWidgets } from '../common/task-details.type.ts';
import { taskDetailsModelOf, taskWithId } from '../utils/task-run.util.ts';

/**
 * The selected task of the shown set: taps, Controls rows and the panel's dependency buttons select it, and every
 * change paints the canvas, refills the task panel and moves the task "…"; a task the reader selects then pans clear
 * of the panel overlaying the canvas. A selection the shown set loses is saved as `null` (RF4).
 */
export class GraphTaskSelection {
  private readonly deps: TaskSelectionDeps;
  private readonly details: TaskDetails;
  private readonly widgets: TaskWidgets;
  private shown: GraphTask[] = [];
  private latestRuns: TaskRuns = {};

  public constructor(deps: TaskSelectionDeps) {
    this.deps = deps;
    this.details = deps.detailsOf({
      onSelect: (id: string): void => this.select(id),
      onClear: (): void => this.clear()
    });
    this.widgets = deps.widgetsOf();
  }

  public selected(): string | null {
    return this.deps.task().selected;
  }

  /** A tap on a shown task selects it, or clears it when it is already selected; a compound tap changes nothing. */
  public tapNode(id: string): void {
    const isSelected = id === this.selected();

    if (isSelected) this.clear();
    else this.select(id);
  }

  /** Selects a shown task; any other id changes nothing. */
  public select(id: string): void {
    const task = taskWithId(this.shown, id);

    if (task !== undefined) this.saveSelected(id);
  }

  public clear(): void {
    this.saveSelected(null);
  }

  public runs(runs: TaskRuns): void {
    this.latestRuns = runs;
    this.repaint();
  }

  /** The tasks now shown; a selected task outside them is saved as no selection. */
  public setShown(tasks: GraphTask[]): void {
    const selected = this.selected();
    const kept = taskWithId(tasks, selected);

    this.shown = tasks;

    if (selected !== null && kept === undefined) this.deps.save({ selected: null });

    this.repaint();
  }

  public enter(isOpen: boolean): void {
    this.details.enter(isOpen);
    this.repaint();
  }

  public exit(): void {
    this.details.exit();
    this.widgets.exit();
  }

  /** After a frame: the selected task's "…" follows it. */
  public rendered(): void {
    this.widgets.rendered();
  }

  /** A reader's choice: a task selected keeps clear of the panel overlaying the canvas. */
  private saveSelected(id: string | null): void {
    this.deps.save({ selected: id });
    this.repaint();

    if (id !== null) this.widgets.keepClear();
  }

  private modelOf(): TaskDetailsModel | null {
    const task = taskWithId(this.shown, this.selected());

    if (task === undefined) return null;

    return taskDetailsModelOf(task, this.shown, this.latestRuns);
  }

  private repaint(): void {
    const model = this.modelOf();
    const target = model?.task.id ?? null;
    const { tasks } = this.deps.view;

    tasks.paint(target);
    tasks.runStates(this.latestRuns);
    this.details.show(model);
    this.widgets.show(model);
  }
}
