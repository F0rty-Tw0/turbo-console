import { describe, expect, it } from 'vitest';

import { isNodeToolbarCompact, packageToolbarCountOf, packageToolbarShownOf } from './package-toolbar.util.ts';
import type { PackageMenuState, PackageToolbarShown } from '../common/widget.type.ts';

const stateOf = (isFocus: boolean, hasTasks: boolean): PackageMenuState => {
  const state: PackageMenuState = { isFocus, hasTasks };

  return state;
};

type ShownCase = {
  readonly name: string;
  readonly isFocus: boolean;
  readonly hasTasks: boolean;
  readonly hasFolder: boolean;
  readonly isCompact: boolean;
  readonly expected: PackageToolbarShown;
};

const FLAT_PLAIN: PackageToolbarShown = { focus: true, startTrace: true, showTasks: false, collapse: false };
const FLAT_TASKS: PackageToolbarShown = { focus: true, startTrace: true, showTasks: true, collapse: false };
const GROUPED_TASKS: PackageToolbarShown = { focus: true, startTrace: true, showTasks: true, collapse: true };
const NONE: PackageToolbarShown = { focus: false, startTrace: false, showTasks: false, collapse: false };

const SHOWN_CASES: ShownCase[] = [
  { name: 'no tasks, flat', isFocus: false, hasTasks: false, hasFolder: false, isCompact: false, expected: FLAT_PLAIN },
  { name: 'the focus, flat', isFocus: true, hasTasks: false, hasFolder: false, isCompact: false, expected: FLAT_PLAIN },
  { name: 'tasks, flat', isFocus: false, hasTasks: true, hasFolder: false, isCompact: false, expected: FLAT_TASKS },
  { name: 'tasks, grouped', isFocus: false, hasTasks: true, hasFolder: true, isCompact: false, expected: GROUPED_TASKS },
  { name: 'tasks, grouped, compact', isFocus: false, hasTasks: true, hasFolder: true, isCompact: true, expected: NONE }
];

describe('FEATURE: packageToolbarShownOf', () => {
  it.each(SHOWN_CASES)('GIVEN $name THEN the shown buttons match', ({ isFocus, hasTasks, hasFolder, isCompact, expected }) => {
    const shown = packageToolbarShownOf(stateOf(isFocus, hasTasks), hasFolder, isCompact);

    expect(shown).toStrictEqual(expected);
  });
});

describe('FEATURE: packageToolbarCountOf', () => {
  it.each([
    { name: 'flat, no tasks', hasTasks: false, hasFolder: false, expected: 3 },
    { name: 'flat, tasks', hasTasks: true, hasFolder: false, expected: 4 },
    { name: 'grouped, no tasks', hasTasks: false, hasFolder: true, expected: 4 },
    { name: 'grouped, tasks', hasTasks: true, hasFolder: true, expected: 5 }
  ])('GIVEN $name THEN the toolbar has $expected buttons, the "…" included', ({ hasTasks, hasFolder, expected }) => {
    const count = packageToolbarCountOf(stateOf(false, hasTasks), hasFolder);

    expect(count).toBe(expected);
  });
});

describe('FEATURE: isNodeToolbarCompact', () => {
  it.each([
    { zoom: 0.49, expected: true },
    { zoom: 0.5, expected: false }
  ])('GIVEN zoom $zoom THEN compact is $expected', ({ zoom, expected }) => {
    expect(isNodeToolbarCompact(zoom)).toBe(expected);
  });
});
