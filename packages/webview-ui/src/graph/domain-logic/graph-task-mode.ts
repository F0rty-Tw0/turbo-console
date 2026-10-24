import { GraphTaskLayout } from './graph-task-layout.ts';
import { savePanelToggle } from './graph-task-panel.ts';
import { GraphTaskSelection } from './graph-task-selection.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import { UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskModeDeps, TaskPanel } from '../common/graph-task.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import type { TaskControls } from '../common/task-controls.type.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';
import { shownSetOf } from '../utils/shown-set.util.ts';
import { choiceOf, droppedNoticeOf, packageTaskIdsOf, requestOf } from '../utils/task-choice.util.ts';

/**
 * Task mode's state and routing: whether it is active, the host's latest tasks and hash, and the task view it saves.
 * Its layout lives in `GraphTaskLayout`, its selected task and side panel in `GraphTaskSelection`, its page parts in the
 * task panel and Controls; the package graph is parked meanwhile.
 */
export class GraphTaskMode {
  public readonly selection: GraphTaskSelection;
  /** The task layout, which Re-layout, Retry and the probe's engine read act on. */
  public readonly layout: GraphTaskLayout;

  private readonly deps: TaskModeDeps;
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
    this.selection = new GraphTaskSelection({
      ...deps,
      task: (): TaskViewState => this.view(),
      save: (edit: Partial<TaskViewState>): void => this.saveView(edit)
    });
    this.panel = deps.panelOf({ onShowAll: (): void => this.choose({ capLifted: true }, null) });
    this.controls = deps.controlsOf({
      onSearch: (search: string): void => this.saveView({ search }),
      onDepth: (depth: number): void => this.choose({ depth }, null),
      onPick: (id: string): void => this.selection.select(id),
      onToggle: (controlsOpen: boolean): void => savePanelToggle(deps, { controlsOpen })
    });
  }

  public isActive(): boolean {
    return this.deps.modes.mode() === 'tasks';
  }

  /**
   * Keeps the state's tasks; while active, shows the graph view once and draws the shown tasks when their key changed. A
   * same key, never an empty set's, still refreshes the selected task's panel and the banner, since commands and hidden
   * tasks are not in the key.
   */
  public received(state: GraphReady, at: number): void {
    this.tasks = state.tasks;
    this.hash = state.hash;

    if (!this.isActive()) return;

    this.enter();

    const shownSet = this.shownSet();
    const request = requestOf(this.tasks, shownSet);
    const shownKey = this.layout.key();

    this.selection.setShown(request.tasks);

    if (request.key === shownKey) {
      this.panel.show({ isEmpty: false, hiddenCount: shownSet.hiddenCount });

      return;
    }

    this.render(at, null);
  }

  /** A message replaced the graph view: the next graph state shows the toolbar, the body and the task parts again. */
  public suspend(): void {
    this.hasEntered = false;
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

  /** The ids of package `name`'s tasks in the latest state, which Show tasks chooses. */
  public packageTaskIds(name: string): string[] {
    return packageTaskIdsOf(this.tasks, name);
  }

  /** Saves the camera on screen and the key of the layout under it; nothing before a task layout is placed. */
  public saveCamera(): void {
    const layoutKey = this.layout.placedKey();

    if (!this.isActive() || layoutKey === null) return;

    const { zoom, pan } = this.deps.view.viewport();

    this.saveView({ zoom, pan, layoutKey });
  }

  /** The pointer entered a task or left it (`null`); the canvas lights its chain without selecting it. */
  public hover(id: string | null): void {
    this.selection.hover(id);
  }

  /** A drag only moves the layout kept in page memory; nothing is posted. */
  public dragged(): void {
    this.layout.dragged();
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
    this.selection.setShown(request.tasks);
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

    const current = this.deps.modes.current();

    this.hasEntered = true;
    this.deps.screen.showGraph(this.layout.engine() === 'fallback');
    this.panel.enter();
    this.controls.enter(this.view(), current?.controlsOpen ?? true);
    this.selection.enter(current?.detailsOpen ?? true);
  }

  /** Saves the task camera, empties the canvas and hands the page back to the package graph. */
  private leave(): void {
    this.saveCamera();
    this.deps.modes.setMode('packages', this.hash);
    this.layout.clear();
    this.hasEntered = false;
    this.panel.exit();
    this.controls.exit();
    this.selection.exit();
    this.deps.view.resize();
    this.deps.onExit();
  }
}
