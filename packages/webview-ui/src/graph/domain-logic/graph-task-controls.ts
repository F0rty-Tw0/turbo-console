import { TaskGrid } from './task-grid.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import { TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import { CONTROLS_ID } from '../common/graph.const.ts';
import type { TaskControlsDeps, TaskControlsElements, TaskViewChecks } from '../common/task-controls.type.ts';
import type { TaskGridFacts } from '../common/task-grid.type.ts';
import { modeFocusOf } from '../utils/mode-focus.util.ts';
import { taskDepthOf } from '../utils/task-choice.util.ts';

/**
 * The task Controls panel. It replaces the package panel while task mode is on and keeps its own open state, which the
 * Controls button flips: the package panel only shows that state while it is mounted. The search narrows the Projects
 * grid only; the grid is one Tab stop with a roving focus.
 */
export class GraphTaskControls {
  private readonly deps: TaskControlsDeps;
  private readonly elements: TaskControlsElements;
  private readonly grid: TaskGrid;
  private isActive = false;
  private isOpen = true;

  public constructor(deps: TaskControlsDeps) {
    const elements = deps.views.build();

    this.deps = deps;
    this.elements = elements;
    this.grid = new TaskGrid(elements.list, {
      build: deps.views.line,
      search: (): string => elements.search.value,
      onPick: deps.actions.onPick,
      onCheck: deps.actions.onCheck
    });
    elements.search.addEventListener('input', (): void => this.searched());
    elements.depth.addEventListener('input', (): void => this.depthTyped());
    elements.grouping.addEventListener('input', (): void => deps.actions.onGrouping(elements.grouping.checked));
    elements.scope.addEventListener('input', (): void => deps.actions.onViewToggle('scope', elements.scope.checked));
    elements.scripts.addEventListener('input', (): void => deps.actions.onViewToggle('scripts', elements.scripts.checked));
    elements.prediction.addEventListener('input', (): void => deps.actions.onViewToggle('prediction', elements.prediction.checked));
    elements.affected.addEventListener('input', (): void => deps.actions.onViewToggle('affected', elements.affected.checked));
    deps.page.controls.addEventListener('click', (): void => this.toggleOpen());
  }

  public enter(task: TaskViewState, isOpen: boolean): void {
    const { body, controls } = this.deps.page;
    const { panel, search, depth } = this.elements;

    this.isActive = true;
    this.isOpen = isOpen;
    search.value = task.search;
    depth.value = String(task.depth);

    if (!panel.isConnected) body.prepend(panel);

    controls.setAttribute('aria-controls', TASK_CONTROLS_ID);
    this.render();
  }

  public exit(): void {
    const { panel } = this.elements;
    const hadFocus = panel.contains(document.activeElement);

    this.isActive = false;
    panel.hidden = true;
    this.deps.page.controls.setAttribute('aria-controls', CONTROLS_ID);

    if (hadFocus) modeFocusOf(this.deps.page).focus();
  }

  /** Sets the boxes as properties, which fire no event, so a state-driven sync reports nothing; Show scripts needs a listed script. */
  public setView(checks: TaskViewChecks): void {
    const { grouping, groupingField, scope, scripts, scriptsField, prediction, affected } = this.elements;

    grouping.checked = checks.grouped;
    groupingField.hidden = !checks.canGroup;
    scope.checked = checks.scopeShown;
    scripts.checked = checks.scriptsShown;
    scriptsField.hidden = !checks.hasScripts;
    prediction.checked = checks.predictionShown;
    affected.checked = checks.affectedShown;
  }

  /** Lists the pool as the Projects grid; a cell with focus hands it, and the Tab stop, to its twin among the new rows. */
  public setProjects(facts: TaskGridFacts): void {
    this.grid.setFacts(facts);
  }

  private render(): void {
    this.elements.panel.hidden = !this.isOpen;
    this.deps.page.controls.setAttribute('aria-expanded', String(this.isOpen));
  }

  private toggleOpen(): void {
    if (!this.isActive) return;

    this.isOpen = !this.isOpen;
    this.render();
    this.deps.actions.onToggle(this.isOpen);
  }

  private searched(): void {
    this.grid.paint();
    this.deps.actions.onSearch(this.elements.search.value);
  }

  private depthTyped(): void {
    const depth = taskDepthOf(this.elements.depth.value);

    if (depth !== null) this.deps.actions.onDepth(depth);
  }
}
