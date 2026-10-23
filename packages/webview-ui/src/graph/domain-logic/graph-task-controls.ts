import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import { TASK_CONTROLS_ID } from '../common/graph-task.const.ts';
import type { CellAt, ListLine } from '../common/roving.type.ts';
import type { TaskControlsDeps, TaskControlsElements, TaskControlsRow } from '../common/task-controls.type.ts';
import { nextCell } from '../utils/roving.util.ts';
import { matchesTaskSearch, taskDepthOf } from '../utils/task-choice.util.ts';

/** The package Controls panel's id, which the Controls button points at again when task mode ends. */
const PACKAGE_CONTROLS_ID = 'graph-controls';

const TASK_LINE: ListLine = { kind: 'row', columns: ['name'] };

/**
 * The task Controls panel. It replaces the package panel while task mode is on and keeps its own open state, which the
 * Controls button flips: the package panel only shows that state while it is mounted. The search narrows the rows only;
 * the rows are one Tab stop with a roving focus.
 */
export class GraphTaskControls {
  private readonly deps: TaskControlsDeps;
  private readonly elements: TaskControlsElements;
  private rows: TaskControlsRow[] = [];
  private isActive = false;
  private isOpen = true;

  public constructor(deps: TaskControlsDeps) {
    const elements = deps.views.build();

    this.deps = deps;
    this.elements = elements;
    elements.search.addEventListener('input', (): void => this.searched());
    elements.depth.addEventListener('input', (): void => this.depthTyped());
    elements.list.addEventListener('keydown', (event: KeyboardEvent): void => this.keyed(event));
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
    this.isActive = false;
    this.elements.panel.hidden = true;
    this.deps.page.controls.setAttribute('aria-controls', PACKAGE_CONTROLS_ID);
  }

  public setRows(tasks: GraphTask[]): void {
    const rows = tasks.map(this.deps.views.row);
    const lines = rows.map((row) => row.line);

    this.rows = rows;
    this.elements.list.replaceChildren(...lines);
    this.filter();
  }

  private render(): void {
    this.elements.panel.hidden = !this.isOpen;
    this.deps.page.controls.setAttribute('aria-expanded', String(this.isOpen));
  }

  private toggleOpen(): void {
    if (!this.isActive) return;

    this.isOpen = !this.isOpen;
    this.render();
    this.deps.actions.onResize();
  }

  private searched(): void {
    this.filter();
    this.deps.actions.onSearch(this.elements.search.value);
  }

  private depthTyped(): void {
    const depth = taskDepthOf(this.elements.depth.value);

    if (depth !== null) this.deps.actions.onDepth(depth);
  }

  /** Hides the rows the search misses; the first row shown is the list's one Tab stop. */
  private filter(): void {
    const search = this.elements.search.value;

    for (const row of this.rows) row.line.hidden = !matchesTaskSearch(row.task, search);

    this.rove(this.shownRows().at(0));
  }

  private shownRows(): TaskControlsRow[] {
    return this.rows.filter((row) => !row.line.hidden);
  }

  private rove(to: TaskControlsRow | undefined): void {
    for (const row of this.rows) row.pick.tabIndex = row === to ? 0 : -1;
  }

  private keyed(event: KeyboardEvent): void {
    const shown = this.shownRows();
    const from = shown.findIndex((row) => row.pick === event.target);
    const lines = shown.map((): ListLine => TASK_LINE);
    const at: CellAt = { line: from, column: 'name' };
    const cell = nextCell(lines, at, event.key, 'name');

    if (from === -1 || cell === null) return;

    const to = shown[cell.line];

    if (to === undefined) return;

    event.preventDefault();
    this.rove(to);
    to.pick.focus();
  }
}
