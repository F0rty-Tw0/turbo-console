import type { Position, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { WidthChange } from '../../common/graph.type.ts';

const COLUMNS = 4;

const COLUMN_PITCH = 150;

const ROW_PITCH = 100;

const gridEntry = (name: string, index: number): [string, Position] => {
  const centre: Position = { x: (index % COLUMNS) * COLUMN_PITCH, y: Math.floor(index / COLUMNS) * ROW_PITCH };

  return [name, centre];
};

/** One centre per name on a fixed grid, four to a row; an own key even for `__proto__`. */
export const gridPositionsOf = (names: string[]): Positions => Object.fromEntries(names.map(gridEntry));

/** The opacity `element` is drawn at: its own times every ancestor's, as nested opacities multiply. Runs in the page. */
export const effectiveOpacityOf = (element: Element): number => {
  let opacity = 1;

  for (let node: Element | null = element; node !== null; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);

  return opacity;
};

/** `names` without `excluded`, in order. */
export const without = (names: string[], excluded: string[]): string[] => {
  const isKept = (name: string): boolean => !excluded.includes(name);

  return names.filter(isKept);
};

/** Clicks the Controls toggle and reads `canvas`'s width just before and just after, in the same task. Runs in the page. */
export const toggleControlsMeasured = (canvas: Element): WidthChange => {
  const toggle = document.querySelector('[aria-controls="graph-controls"]');

  if (!(toggle instanceof HTMLElement)) throw new Error('graph e2e: no Controls toggle');

  const before = canvas.getBoundingClientRect().width;

  toggle.click();

  const after = canvas.getBoundingClientRect().width;
  const change: WidthChange = { before, after };

  return change;
};
