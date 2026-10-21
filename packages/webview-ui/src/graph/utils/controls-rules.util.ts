import type { GroupState, RowView } from '../common/graph-controls.type.ts';
import type { GraphFilters, GraphFocus } from '../common/graph-filters.type.ts';
import { MAX_DEPTH, MIN_DEPTH } from '../common/graph.const.ts';

const WHOLE_DIGITS = /^\d+$/;

const isFocused = (filters: GraphFilters, name: string): boolean => filters.focus?.name === name;

const withHidden = (filters: GraphFilters, hidden: Set<string>): GraphFilters => {
  const next: GraphFilters = { ...filters, hidden };

  return next;
};

const withFocus = (filters: GraphFilters, focus: GraphFocus | null): GraphFilters => {
  const next: GraphFilters = { ...filters, focus };

  return next;
};

const hiddenAfter = (filters: GraphFilters, names: string[], isChecked: boolean): Set<string> => {
  const hidden = new Set(filters.hidden);

  for (const name of names) {
    if (isChecked) hidden.delete(name);
    else hidden.add(name);
  }

  return hidden;
};

const withoutFocus = (filters: GraphFilters, names: string[]): string[] => names.filter((name) => !isFocused(filters, name));

/** Shows or hides one package; the focused package always stays, so it is a no-op there. */
export const toggleRow = (filters: GraphFilters, name: string, isChecked: boolean): GraphFilters => {
  const isFocus = isFocused(filters, name);

  if (isFocus) return filters;

  const hidden = hiddenAfter(filters, [name], isChecked);

  return withHidden(filters, hidden);
};

/** Shows or hides every name; the focused package is skipped, and a group of only that package is a no-op. */
export const toggleGroup = (filters: GraphFilters, names: string[], isChecked: boolean): GraphFilters => {
  const toggled = withoutFocus(filters, names);

  if (toggled.length === 0) return filters;

  const hidden = hiddenAfter(filters, toggled, isChecked);

  return withHidden(filters, hidden);
};

/** Over the names without the focused one; none left counts as checked. */
export const groupStateOf = (filters: GraphFilters, names: string[]): GroupState => {
  const others = withoutFocus(filters, names);
  const hiddenCount = others.filter((name) => filters.hidden.has(name)).length;

  if (hiddenCount === 0) return 'checked';

  return hiddenCount === others.length ? 'unchecked' : 'mixed';
};

/** Every name of the group is the focused package, so the group has nothing to toggle. */
export const isGroupLocked = (filters: GraphFilters, names: string[]): boolean => {
  const others = withoutFocus(filters, names);

  return filters.focus !== null && others.length === 0;
};

/** Focuses `name` at `depth` and shows it; focusing the focused name again clears the focus. */
export const focusOn = (filters: GraphFilters, name: string, depth: number): GraphFilters => {
  const isFocus = isFocused(filters, name);

  if (isFocus) return withFocus(filters, null);

  const hidden = hiddenAfter(filters, [name], true);
  const focus: GraphFocus = { name, depth };
  const next: GraphFilters = { ...filters, hidden, focus };

  return next;
};

export const withDepth = (filters: GraphFilters, depth: number): GraphFilters => {
  if (filters.focus === null) return filters;

  const focus: GraphFocus = { name: filters.focus.name, depth };

  return withFocus(filters, focus);
};

export const withTag = (filters: GraphFilters, tag: string, isChecked: boolean): GraphFilters => {
  const tags = new Set(filters.tags);

  if (isChecked) tags.add(tag);
  else tags.delete(tag);

  const next: GraphFilters = { ...filters, tags };

  return next;
};

/** Clears the hidden names, the focus and the tags. */
export const showAllOf = (filters: GraphFilters): GraphFilters => {
  const cleared: GraphFilters = { ...filters, hidden: new Set(), focus: null, tags: new Set() };

  return cleared;
};

export const isFiltered = (filters: GraphFilters): boolean => {
  const isHiding = filters.hidden.size > 0;
  const isTagged = filters.tags.size > 0;

  return isHiding || isTagged || filters.focus !== null;
};

/** A whole number from `MIN_DEPTH` to `MAX_DEPTH`, digits only; anything else is `null`. */
export const depthOf = (text: string): number | null => {
  const isWhole = WHOLE_DIGITS.test(text);

  if (!isWhole) return null;

  const depth = Number(text);
  const isInRange = depth >= MIN_DEPTH && depth <= MAX_DEPTH;

  return isInRange ? depth : null;
};

export const sameMembers = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean => {
  if (left.size !== right.size) return false;

  const names = [...left];

  return names.every((name) => right.has(name));
};

export const rowViewOf = (filters: GraphFilters, visible: ReadonlySet<string>, name: string): RowView => {
  const isLocked = isFocused(filters, name);
  const isChecked = isLocked || !filters.hidden.has(name);
  const isDimmed = isChecked && !visible.has(name);
  const view: RowView = { isChecked, isDimmed, isLocked };

  return view;
};
