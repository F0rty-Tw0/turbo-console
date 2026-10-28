import { GraphTaskLayout } from './graph-task-layout.ts';
import { GraphTaskMemory } from './graph-task-memory.ts';
import { layoutDepsOf, selectionDepsOf, umbrellaSizersOf } from './graph-task-mode-deps.ts';
import { savePanelToggle } from './graph-task-panel.ts';
import { GraphTaskSelection } from './graph-task-selection.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import { UNKNOWN_TASKS_TEXT } from '../common/graph-task.const.ts';
import type { TaskModeDeps, TaskPanel } from '../common/graph-task.type.ts';
import type { LocationFacts } from '../common/location.type.ts';
import type { TaskControls } from '../common/task-controls.type.ts';
import { choiceOf, droppedNoticeOf, entryTaskIdsOf, packageTaskIdsOf, requestOf, taskIdsOf } from '../utils/task-choice.util.ts';

/**
 * Task mode's routing: whether it is active and what the user does in it. Its tasks, hash and saved view live in
 * `GraphTaskMemory`, its layout in `GraphTaskLayout`, its selected task and side panel in `GraphTaskSelection`, its page
 * parts in the task panel and Controls; the package graph is parked meanwhile.
 */
export class GraphTaskMode {
  public readonly selection: GraphTaskSelection;
  /** The task layout, which Re-layout, Retry and the probe's engine read act on. */
  public readonly layout: GraphTaskLayout;

  private readonly deps: TaskModeDeps;
  private readonly memory: GraphTaskMemory;
  private readonly panel: TaskPanel;
  private readonly controls: TaskControls;
  private hasEntered = false;
  private shownCount = 0;

  public constructor(deps: TaskModeDeps) {
    this.deps = deps;
    this.memory = new GraphTaskMemory(deps.modes);
    const hooks = { onPlaced: (): void => this.saveCamera(), onDrawn: (): void => this.selection.placed() };

    this.layout = new GraphTaskLayout(layoutDepsOf(deps, this.memory, hooks));
    this.selection = new GraphTaskSelection(selectionDepsOf(deps, this.memory));
    this.panel = deps.panelOf({
      onShowAll: (): void => this.choose({ capLifted: true }, null),
      onShowEvery: (at: number): void => this.showTasks(taskIdsOf(this.memory.tasks()), at),
      onShown: deps.onLocation
    });
    this.controls = deps.controlsOf({
      onSearch: (search: string): void => this.memory.save({ search }),
      onDepth: (depth: number): void => this.choose({ depth }, null),
      onPick: (id: string): void => this.selection.select(id),
      onToggle: (controlsOpen: boolean): void => savePanelToggle(deps, { controlsOpen })
    });
  }

  public isActive(): boolean {
    return this.deps.modes.mode() === 'tasks';
  }

  /**
   * Keeps the state's tasks and Atomizer groups; while active, shows the graph view once and draws the shown tasks when
   * their key changed or the root label did, since the key holds no label. A same key and label, never an empty set's,
   * still refreshes the selected task's panel and the banner, since commands and hidden tasks are not in the key, and
   * reports the shown umbrellas again, since a changed file list may have dropped a load the host must request anew.
   */
  public received(state: GraphReady, at: number): void {
    const shownLabel = this.memory.rootLabel();
    const isRelabelled = shownLabel !== state.rootLabel;

    this.memory.keep(state);
    this.layout.atoms.received(state.atomGroups);

    if (!this.isActive()) return;

    this.showPage();

    const shownSet = this.memory.shownSet();
    const request = requestOf(this.memory.tasks(), shownSet, this.layout.atoms.fileCounts(), umbrellaSizersOf(this.deps));
    const shownKey = this.layout.key();
    const knownCount = this.memory.tasks().length;

    this.selection.setShown(request.tasks);

    if (request.key === shownKey && !isRelabelled) {
      this.panel.show({ isEmpty: false, hiddenCount: shownSet.hiddenCount, knownCount });
      this.layout.atoms.reshown();

      return;
    }

    this.render(at, null);
  }

  /** A message replaced the graph view: the next graph state shows the toolbar, the body and the task parts again. */
  public suspend(): void {
    this.hasEntered = false;
  }

  /**
   * Package mode → task mode on the selected package's tasks, which replace the saved choice; with no package selected, one
   * without tasks or one whose tasks are the saved choice, on the saved view or the prompt. In task mode it does nothing.
   */
  public enter(at: number): void {
    if (this.isActive()) return;

    const entryIds = entryTaskIdsOf(this.memory.tasks(), this.deps.selectedPackage(), this.memory.view().chosen);

    if (entryIds !== null) {
      this.showTasks(entryIds, at);

      return;
    }

    this.deps.modes.setMode('tasks', this.memory.hash());
    this.showPage();
    this.render(at, null);
  }

  /** Task mode → package mode with the task camera saved; in package mode it does nothing. */
  public leave(): void {
    const isActive = this.isActive();

    if (isActive) this.hidePage();
  }

  /** Chooses the known ones of `taskIds` from either mode; with none known the page stays as it is and says so. */
  public showTasks(taskIds: string[], at: number): void {
    const { chosen, dropped } = choiceOf(this.memory.tasks(), taskIds);

    if (chosen.length === 0) {
      this.panel.notice(UNKNOWN_TASKS_TEXT);

      return;
    }

    this.choose({ chosen, capLifted: false, selected: null }, at, droppedNoticeOf(dropped));
  }

  /** Shows `text` on the notice line from either mode, or hides it for `null`; the next task render replaces it. */
  public notice(text: string | null): void {
    this.panel.notice(text);
  }

  /** The ids of package `name`'s tasks in the latest state, which Show tasks chooses. */
  public packageTaskIds(name: string): string[] {
    return packageTaskIdsOf(this.memory.tasks(), name);
  }

  /** What the location bar reads of the shown tasks, counted from the shown set the last render or state drew. */
  public locationFacts(): LocationFacts {
    return this.memory.locationFacts(this.shownCount);
  }

  /** Saves the camera on screen and the key of the layout under it; nothing before a task layout is placed. */
  public saveCamera(): void {
    const layoutKey = this.layout.placedKey();

    if (!this.isActive() || layoutKey === null) return;

    const { zoom, pan } = this.deps.view.viewport();
    const fitted = this.deps.view.isFitted();

    this.memory.save({ zoom, pan, fitted, layoutKey });
  }

  /** A new choice, depth or cap, saved with no layout key so the camera fits the new set; it turns task mode on. */
  private choose(edit: Partial<TaskViewState>, at: number | null, notice: string | null = null): void {
    const unplaced: Partial<TaskViewState> = { ...edit, layoutKey: '' };

    this.memory.save(unplaced);
    this.showPage();
    this.render(at, notice);
  }

  /** The notice, prompt, banner and rows of the shown set, then its layout; an empty set empties the canvas. */
  private render(at: number | null, notice: string | null): void {
    const shownSet = this.memory.shownSet();
    const request = requestOf(this.memory.tasks(), shownSet, this.layout.atoms.fileCounts(), umbrellaSizersOf(this.deps));
    const isEmpty = request.tasks.length === 0;
    const knownCount = this.memory.tasks().length;

    this.shownCount = shownSet.ids.length;
    this.panel.notice(notice ?? droppedNoticeOf(shownSet.droppedIds.length));
    this.panel.show({ isEmpty, hiddenCount: shownSet.hiddenCount, knownCount });
    this.controls.setRows(request.tasks, this.memory.rootLabel());
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
  private showPage(): void {
    if (this.hasEntered) return;

    const current = this.deps.modes.current();

    this.hasEntered = true;
    this.deps.screen.showGraph(this.layout.engine() === 'fallback');
    this.panel.enter();
    this.controls.enter(this.memory.view(), current?.controlsOpen ?? true);
    this.selection.enter(current?.detailsOpen ?? true);
  }

  /** Saves the task camera, empties the canvas and hands the page back to the package graph. */
  private hidePage(): void {
    this.saveCamera();
    this.deps.modes.setMode('packages', this.memory.hash());
    this.layout.clear();
    this.hasEntered = false;
    this.panel.exit();
    this.controls.exit();
    this.selection.exit();
    this.deps.view.resize();
    this.deps.onExit();
    this.deps.onLocation();
  }
}
