import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskDetails, TaskDetailsModel, TaskRuns, TaskSelectionDeps, TaskWidgets } from '../common/task-details.type.ts';
import { highlightTargetOf } from '../utils/hover-target.util.ts';
import { taskDetailsModelOf, taskWithId } from '../utils/task-run.util.ts';

/**
 * The selected task of the shown set: taps, Controls rows and the panel's dependency buttons select it, and every
 * change paints the canvas, refills the task panel and moves the task "…"; a task the reader selects then pans clear
 * of the panel overlaying the canvas. A selection the shown set loses is saved as `null` (RF4). The hovered task only
 * repaints the canvas: it never selects, saves or refills the panel.
 */
export class GraphTaskSelection {
  private readonly deps: TaskSelectionDeps;
  private readonly details: TaskDetails;
  private readonly widgets: TaskWidgets;
  private shown: GraphTask[] = [];
  private latestRuns: TaskRuns = {};
  private isEntered = false;
  private hovered: string | null = null;

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

  /**
   * Keeps the latest runs; outside task mode they wait for the repaint on entering, so the hidden panel is not rebuilt.
   * Runs leave the highlight as it is, so they never restart an idle flow.
   */
  public runs(runs: TaskRuns): void {
    this.latestRuns = runs;

    if (this.isEntered) this.refill(this.modelOf());
  }

  /** The pointer entered the shown task `id` or left it (`null`); a compound or a task not shown changes nothing. */
  public hover(id: string | null): void {
    const task = taskWithId(this.shown, id);
    const isUnshown = id !== null && task === undefined;

    if (isUnshown) return;

    this.hovered = id;
    this.paint(highlightTargetOf(this.selectedShown(), this.hovered));
  }

  /** The tasks now shown; a selected task outside them is saved as no selection. */
  public setShown(tasks: GraphTask[]): void {
    const selected = this.selected();
    const kept = taskWithId(tasks, selected);

    this.shown = tasks;

    const hovered = taskWithId(tasks, this.hovered);

    if (hovered === undefined) this.hovered = null;

    if (selected !== null && kept === undefined) this.deps.save({ selected: null });

    this.repaint();
  }

  public enter(isOpen: boolean): void {
    this.isEntered = true;
    this.details.enter(isOpen);
    this.repaint();
  }

  /** Leaving task mode drops the hover too: no mouseout reaches a pointer that stays, so re-entering would light it stale. */
  public exit(): void {
    this.isEntered = false;
    this.hovered = null;
    this.details.exit();
    this.widgets.exit();
  }

  /** After a frame: the selected task's toolbar follows it. */
  public rendered(): void {
    this.widgets.rendered();
  }

  /** After the canvas re-fit: the selected task's toolbar and card keep clear of the panel overlaying the canvas. */
  public keepClear(): void {
    this.widgets.keepClear();
  }

  /**
   * After a task layout is placed, which draws the kept paint and stops the flow: the flow hears of the painted target
   * again, so a restored selection's flow starts as a fresh tap's does.
   */
  public placed(): void {
    this.announce(highlightTargetOf(this.selectedShown(), this.hovered));
  }

  /** A reader's choice: a task selected keeps clear of the panel overlaying the canvas. */
  private saveSelected(id: string | null): void {
    this.deps.save({ selected: id });
    this.repaint();

    if (id !== null) this.widgets.keepClear();
  }

  private selectedShown(): string | null {
    return this.modelOf()?.task.id ?? null;
  }

  private modelOf(): TaskDetailsModel | null {
    const task = taskWithId(this.shown, this.selected());

    if (task === undefined) return null;

    return taskDetailsModelOf(task, this.shown, this.latestRuns, this.deps.rootLabel());
  }

  private repaint(): void {
    const model = this.modelOf();
    const target = highlightTargetOf(model?.task.id ?? null, this.hovered);

    this.paint(target);
    this.refill(model);
  }

  /** Paints the canvas for `target`, then tells the flow. */
  private paint(target: string | null): void {
    this.deps.view.tasks.paint(target);
    this.announce(target);
  }

  /** Tells the flow how many task edges the painted `target` highlights on the canvas, `0` for no target. */
  private announce(target: string | null): void {
    const { view, onHighlight } = this.deps;
    const litEdges = view.flowEdges();
    const litEdgeCount = target === null ? 0 : litEdges.length;

    onHighlight(litEdgeCount);
  }

  private refill(model: TaskDetailsModel | null): void {
    this.deps.view.tasks.runStates(this.latestRuns);
    this.details.show(model);
    this.widgets.show(model);
  }
}
