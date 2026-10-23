import { GraphTaskLayout } from './graph-task-layout.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import { UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskModeDeps, TaskPanel } from '../common/graph-task.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import type { TaskControls } from '../common/task-controls.type.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';
import { shownSetOf } from '../utils/shown-set.util.ts';
import { choiceOf, droppedNoticeOf, requestOf } from '../utils/task-choice.util.ts';

/**
 * Task mode's state and routing: whether it is active, the host's latest tasks and hash, and the task view it saves.
 * Its layout lives in `GraphTaskLayout`, its page parts in the task panel and Controls; the package graph is parked meanwhile.
 */
export class GraphTaskMode {
  private readonly deps: TaskModeDeps;
  private readonly layout: GraphTaskLayout;
  private readonly panel: TaskPanel;
  private readonly controls: TaskControls;
  private tasks: GraphTask[] = [];
  private hash = '';
  private hasEntered = false;

  public constructor(deps: TaskModeDeps) {
    this.deps = deps;
    this.layout = new GraphTaskLayout({
      ...deps,
      saved: (): TaskViewState | null => deps.modes.task(),
      onPlaced: (): void => this.saveCamera()
    });
    this.panel = deps.panelOf({ onShowAll: (): void => this.choose({ capLifted: true }, null) });
    this.controls = deps.controlsOf({
      onSearch: (search: string): void => this.saveView({ search }),
      onDepth: (depth: number): void => this.choose({ depth }, null),
      onResize: (): void => deps.view.resize()
    });
  }

  public isActive(): boolean {
    return this.deps.modes.mode() === 'tasks';
  }

  /** Keeps the state's tasks; while active, shows the graph view once and draws the shown tasks when their key changed. */
  public received(state: GraphReady, at: number): void {
    this.tasks = state.tasks;
    this.hash = state.hash;

    if (!this.isActive()) return;

    this.enter();

    const request = requestOf(this.tasks, this.shownSet());
    const shownKey = this.layout.key();

    if (request.key === shownKey) return;

    this.render(at, null);
  }

  /** Package mode → task mode with the saved choice, or the prompt; task mode → package mode with the task camera saved. */
  public toggle(at: number): void {
    if (this.isActive()) {
      this.leave();

      return;
    }

    this.deps.modes.setMode('tasks', this.hash);
    this.enter();
    this.render(at, null);
  }

  /** Chooses the known ones of `taskIds` from either mode; with none known the page stays as it is and says so. */
  public showTasks(taskIds: string[], at: number): void {
    const { chosen, dropped } = choiceOf(this.tasks, taskIds);

    if (chosen.length === 0) {
      this.panel.notice(UNKNOWN_TASKS_TEXT);

      return;
    }

    this.choose({ chosen, capLifted: false, selected: null }, at, droppedNoticeOf(dropped));
  }

  /** Saves the camera on screen and the key of the layout under it; nothing before a task layout is placed. */
  public saveCamera(): void {
    const layoutKey = this.layout.placedKey();

    if (!this.isActive() || layoutKey === null) return;

    const { zoom, pan } = this.deps.view.viewport();

    this.saveView({ zoom, pan, layoutKey });
  }

  /** A drag only moves the layout kept in page memory; nothing is posted. */
  public dragged(): void {
    this.layout.dragged();
  }

  public engine(): LayoutEngine | null {
    return this.layout.engine();
  }

  public async relayout(): Promise<void> {
    await this.layout.relayout();
  }

  private view(): TaskViewState {
    return this.deps.modes.task() ?? freshTaskViewOf();
  }

  private shownSet(): ShownSet {
    const { chosen, depth, capLifted } = this.view();

    return shownSetOf({ tasks: this.tasks, chosen, depth, capLifted });
  }

  private saveView(edit: Partial<TaskViewState>): void {
    const last = this.view();
    const view: TaskViewState = { ...last, ...edit };

    this.deps.modes.saveTask(view, this.hash);
  }

  /** A new choice, depth or cap, saved with no layout key so the camera fits the new set; it turns task mode on. */
  private choose(edit: Partial<TaskViewState>, at: number | null, notice: string | null = null): void {
    const unplaced: Partial<TaskViewState> = { ...edit, layoutKey: '' };

    this.saveView(unplaced);
    this.enter();
    this.render(at, notice);
  }

  /** The notice, prompt, banner and rows of the shown set, then its layout; an empty set empties the canvas. */
  private render(at: number | null, notice: string | null): void {
    const shownSet = this.shownSet();
    const request = requestOf(this.tasks, shownSet);
    const isEmpty = request.tasks.length === 0;

    this.panel.notice(notice ?? droppedNoticeOf(shownSet.droppedIds.length));
    this.panel.show({ isEmpty, hiddenCount: shownSet.hiddenCount });
    this.controls.setRows(request.tasks);
    this.deps.view.resize();

    if (isEmpty) {
      this.layout.clear();

      return;
    }

    if (at !== null) this.deps.frames.start(at);

    void this.layout.show(request);
  }

  /** The toolbar, the body, the task panel and Controls show once per visit, before any task layout lands. */
  private enter(): void {
    if (this.hasEntered) return;

    const isOpen = this.deps.modes.current()?.controlsOpen ?? true;

    this.hasEntered = true;
    this.deps.screen.showGraph(this.engine() === 'fallback');
    this.panel.enter();
    this.controls.enter(this.view(), isOpen);
  }

  /** Saves the task camera, empties the canvas and hands the page back to the package graph. */
  private leave(): void {
    this.saveCamera();
    this.deps.modes.setMode('packages', this.hash);
    this.layout.clear();
    this.hasEntered = false;
    this.panel.exit();
    this.controls.exit();
    this.deps.view.resize();
    this.deps.onExit();
  }
}
