import { cellAtOf, elementAt, gridLinesOf } from './controls-grid-lines.ts';
import type { ControlsElements, ControlsRow } from '../common/controls-elements.type.ts';
import type { GraphControlsDeps, KeyboardDeps } from '../common/graph-controls.type.ts';
import type { CellAt, Column, GridLine } from '../common/roving.type.ts';
import { enterActionOf, entryCellOf, firstSelectableOf } from '../utils/list-keys.util.ts';
import { nextCell } from '../utils/roving.util.ts';

const isActivation = (key: string): boolean => key === 'Enter' || key === ' ';

const namesOf = (lines: GridLine[]): string[] => {
  const names: string[] = [];

  for (const { row } of lines) if (row !== null) names.push(row.name);

  return names;
};

/** What the list keys ask: the controls' own deps, the visible test and the selection. */
export const keyboardDepsOf = (
  deps: GraphControlsDeps,
  isVisible: KeyboardDeps['isVisible'],
  selected: KeyboardDeps['selected']
): KeyboardDeps => {
  const keyboardDeps: KeyboardDeps = { ...deps, isVisible, selected };

  return keyboardDeps;
};

/**
 * The package list's roving-tabindex grid and the search box's list keys. The list is one Tab stop, `cell`; every
 * other cell stays at `tabindex=-1`. It listens to the search and Group by folder `input` after `GraphControls` does,
 * so the lines it re-derives are the ones the search left in and the header buttons the checkbox left shown.
 */
export class ControlsKeyboard {
  private readonly elements: ControlsElements;
  private readonly deps: KeyboardDeps;
  private cell: HTMLElement | null = null;
  private remembered: Column = 'name';

  public constructor(elements: ControlsElements, deps: KeyboardDeps) {
    this.elements = elements;
    this.deps = deps;
    elements.list.addEventListener('keydown', (event): void => this.onListKey(event));
    elements.list.addEventListener('focusin', (event): void => this.onFocusIn(event));
    elements.search.addEventListener('keydown', (event): void => this.onSearchKey(event));
    elements.search.addEventListener('input', (): void => this.refresh());
    elements.grouping.addEventListener('input', (): void => this.refresh());
    this.refresh();
  }

  /** Re-derives the lines and puts the Tab stop on the remembered cell, or the first checkbox when its line is gone. */
  private refresh(): void {
    const lines = gridLinesOf(this.elements);
    const remembered = cellAtOf(lines, this.cell);
    const entry = entryCellOf(lines, remembered);

    this.clearStops();

    if (entry !== null) this.setStop(elementAt(lines, entry));
  }

  private clearStops(): void {
    for (const group of this.elements.groups) {
      group.check.tabIndex = -1;
      group.toggle.tabIndex = -1;

      for (const { check, pick, focus } of group.rows) for (const cell of [check, pick, focus]) cell.tabIndex = -1;
    }

    this.cell = null;
  }

  private setStop(element: HTMLElement | undefined): void {
    if (element === undefined) return;

    if (this.cell !== null) this.cell.tabIndex = -1;

    element.tabIndex = 0;
    this.cell = element;
  }

  private moveTo(lines: GridLine[], at: CellAt): void {
    const element = elementAt(lines, at);

    this.setStop(element);
    element?.focus();
  }

  private onFocusIn(event: FocusEvent): void {
    const lines = gridLinesOf(this.elements);
    const at = cellAtOf(lines, event.target);
    const isCell = at !== null && event.target instanceof HTMLElement;

    if (isCell) this.setStop(event.target);
  }

  private onListKey(event: KeyboardEvent): void {
    const lines = gridLinesOf(this.elements);
    const at = cellAtOf(lines, event.target);

    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

    if (at === null || hasModifier) return;

    const row = lines[at.line]?.row ?? null;
    const isNameButton = at.column === 'name' && row !== null;
    const isActivated = isActivation(event.key);

    if (isNameButton && isActivated) {
      this.activate(event, row);

      return;
    }

    this.moveByKey(lines, at, event);
  }

  private moveByKey(lines: GridLine[], at: CellAt, event: KeyboardEvent): void {
    const next = nextCell(lines, at, event.key, this.remembered);

    if (next === null) return;

    event.preventDefault();

    const isSideways = event.key === 'ArrowLeft' || event.key === 'ArrowRight';

    if (isSideways) this.remembered = next.column;

    this.moveTo(lines, next);
  }

  private activate(event: KeyboardEvent, row: ControlsRow): void {
    event.preventDefault();

    if (event.repeat) return;

    const { name } = row;
    const isVisible = this.deps.isVisible(name);

    if (!isVisible) return;

    const selected = this.deps.selected();
    const target = event.key === 'Enter' ? selected : null;
    const action = enterActionOf(target, name);

    if (action === 'details') this.deps.onOpenDetails(name);
    else this.deps.onSelect(name);
  }

  private onSearchKey(event: KeyboardEvent): void {
    const lines = gridLinesOf(this.elements);

    if (event.key === 'ArrowDown') this.enterList(lines, event);
    else if (event.key === 'Enter') this.selectFirst(lines);
  }

  private enterList(lines: GridLine[], event: KeyboardEvent): void {
    const first = entryCellOf(lines, null);

    if (first === null) return;

    event.preventDefault();
    this.moveTo(lines, first);
  }

  private selectFirst(lines: GridLine[]): void {
    const order = namesOf(lines);
    const isVisible = (name: string): boolean => this.deps.isVisible(name);
    const visible = new Set(order.filter(isVisible));
    const name = firstSelectableOf(order, visible);

    if (name !== null) this.deps.onSelect(name);
  }
}
