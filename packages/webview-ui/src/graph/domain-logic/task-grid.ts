import { NO_NAMES } from '../common/graph-task.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { CellAt, Column, ListLine } from '../common/roving.type.ts';
import type { TaskGridDeps, TaskGridFacts, TaskGridOpen, TaskGridRow } from '../common/task-grid.type.ts';
import { nextCell } from '../utils/roving.util.ts';
import { taskGridLinesOf } from '../utils/task-grid.util.ts';

const GRID_LINE: ListLine = { kind: 'row', columns: ['check', 'name'] };

const NO_NAMING: TaskNaming = { grouped: false, scopeShown: true, labels: NO_NAMES, folders: NO_NAMES };

const NO_FACTS: TaskGridFacts = { tasks: [], chosen: new Set(), shown: new Set(), naming: NO_NAMING, rootLabel: null };

/** A grid cell by its line's key and column; the key `''` matches no line. */
type GridStop = { readonly key: string; readonly column: Column };

const cellOf = (row: TaskGridRow, column: Column): HTMLElement => (column === 'name' ? row.name : row.check);

/**
 * The Projects grid in the task Controls panel. It owns what the reader opened (never saved) and rebuilds the rows from
 * the latest facts on every push, toggle and search keystroke; the cell with focus keeps it, by line key and column, and
 * is the grid's one Tab stop with a roving focus.
 */
export class TaskGrid {
  private readonly list: HTMLElement;
  private readonly deps: TaskGridDeps;
  private readonly toggled = new Set<string>();
  private facts: TaskGridFacts = NO_FACTS;
  private rows: TaskGridRow[] = [];
  private stop: GridStop = { key: '', column: 'check' };

  public constructor(list: HTMLElement, deps: TaskGridDeps) {
    this.list = list;
    this.deps = deps;
    list.addEventListener('keydown', (event: KeyboardEvent): void => this.keyed(event));
    list.addEventListener('focusin', (event: FocusEvent): void => this.focused(event));
  }

  public setFacts(facts: TaskGridFacts): void {
    this.facts = facts;
    this.paint();
  }

  /** Rebuilds the rows from the facts, the opened keys and the search text. */
  public paint(): void {
    const focus = this.cellAt(document.activeElement);
    const open: TaskGridOpen = { toggled: this.toggled, search: this.deps.search() };
    const lines = taskGridLinesOf(this.facts, open);
    const rows = lines.map((line) => this.deps.build(line));
    const elements = rows.map((row) => row.element);

    for (const row of rows) this.wire(row);

    this.rows = rows;
    this.list.replaceChildren(...elements);
    this.rove();

    if (focus !== null) this.refocus(focus);
  }

  private wire(row: TaskGridRow): void {
    row.name.addEventListener('click', (): void => this.named(row));
    row.check.addEventListener('input', (): void => this.checked(row));
  }

  private checked(row: TaskGridRow): void {
    const { line } = row;

    if (line.kind === 'task') {
      this.deps.onCheck([line.task.id], row.check.checked);

      return;
    }

    this.deps.onCheck(line.ids, row.check.checked);
  }

  private named(row: TaskGridRow): void {
    const { line } = row;

    if (line.kind === 'task') {
      if (line.isDrawn) this.deps.onPick(line.task.id);

      return;
    }

    const wasToggled = this.toggled.delete(line.key);

    if (!wasToggled) this.toggled.add(line.key);

    this.stop = { key: line.key, column: 'name' };
    this.paint();
  }

  private cellAt(target: EventTarget | null): GridStop | null {
    const row = this.rows.find((each) => each.check === target || each.name === target);

    if (row === undefined) return null;

    const column = row.check === target ? 'check' : 'name';
    const cell: GridStop = { key: row.line.key, column };

    return cell;
  }

  private stopCell(): HTMLElement | undefined {
    const kept = this.rows.find((row) => row.line.key === this.stop.key);

    if (kept !== undefined) return cellOf(kept, this.stop.column);

    return this.rows.at(0)?.check;
  }

  private rove(): void {
    const stop = this.stopCell();

    for (const row of this.rows) {
      row.check.tabIndex = row.check === stop ? 0 : -1;
      row.name.tabIndex = row.name === stop ? 0 : -1;
    }
  }

  private refocus(cell: GridStop): void {
    const row = this.rows.find((each) => each.line.key === cell.key);

    if (row === undefined) {
      this.stopCell()?.focus();

      return;
    }

    cellOf(row, cell.column).focus();
  }

  private focused(event: FocusEvent): void {
    const cell = this.cellAt(event.target);

    if (cell === null) return;

    this.stop = cell;
    this.rove();
  }

  private keyed(event: KeyboardEvent): void {
    const from = this.cellAt(event.target);

    if (from === null) return;

    const index = this.rows.findIndex((row) => row.line.key === from.key);
    const lines = this.rows.map((): ListLine => GRID_LINE);
    const at: CellAt = { line: index, column: from.column };
    const cell = nextCell(lines, at, event.key, from.column);

    if (cell === null) return;

    const row = this.rows[cell.line];

    if (row === undefined) return;

    event.preventDefault();
    cellOf(row, cell.column).focus();
  }
}
