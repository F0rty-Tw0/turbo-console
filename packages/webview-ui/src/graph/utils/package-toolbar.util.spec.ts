import { describe, expect, it } from 'vitest';

import { packageToolbarCountOf, packageToolbarShownOf, toolbarShownKindsOf, toolbarStopOf } from './package-toolbar.util.ts';
import type { PackageMenuState, PackageToolbarKind, PackageToolbarShown } from '../common/widget.type.ts';

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

type StopCase = {
  readonly name: string;
  readonly preferred: PackageToolbarKind;
  readonly shown: PackageToolbarKind[];
  readonly expected: PackageToolbarKind;
};

const FLAT_KINDS: PackageToolbarKind[] = ['focus', 'startTrace', 'ellipsis'];

const STOP_CASES: StopCase[] = [
  { name: 'startTrace is preferred and shown', preferred: 'startTrace', shown: FLAT_KINDS, expected: 'startTrace' },
  { name: 'showTasks is preferred and hidden', preferred: 'showTasks', shown: FLAT_KINDS, expected: 'focus' },
  { name: 'startTrace is preferred and only the "…" shows', preferred: 'startTrace', shown: ['ellipsis'], expected: 'ellipsis' },
  { name: 'nothing shows', preferred: 'focus', shown: [], expected: 'ellipsis' }
];

describe('FEATURE: package toolbar', () => {
  describe('GIVEN a package menu state, a folder flag and a compact flag', () => {
    describe.each(SHOWN_CASES)('GIVEN $name', ({ isFocus, hasTasks, hasFolder, isCompact, expected }) => {
      it('THEN the shown buttons match', () => {
        const shown = packageToolbarShownOf(stateOf(isFocus, hasTasks), hasFolder, isCompact);

        expect(shown).toStrictEqual(expected);
      });
    });
  });

  describe('GIVEN a package menu state and a folder flag', () => {
    describe.each([
      { name: 'flat, no tasks', hasTasks: false, hasFolder: false, expected: 3 },
      { name: 'flat, tasks', hasTasks: true, hasFolder: false, expected: 4 },
      { name: 'grouped, no tasks', hasTasks: false, hasFolder: true, expected: 4 },
      { name: 'grouped, tasks', hasTasks: true, hasFolder: true, expected: 5 }
    ])('GIVEN $name', ({ hasTasks, hasFolder, expected }) => {
      it(`THEN the toolbar has ${expected} buttons, the "…" included`, () => {
        const count = packageToolbarCountOf(stateOf(false, hasTasks), hasFolder);

        expect(count).toBe(expected);
      });
    });
  });

  describe('GIVEN a set of shown toolbar buttons', () => {
    describe.each([
      { name: 'grouped with tasks', shown: GROUPED_TASKS, expected: ['focus', 'startTrace', 'showTasks', 'collapse', 'ellipsis'] },
      { name: 'flat without tasks', shown: FLAT_PLAIN, expected: ['focus', 'startTrace', 'ellipsis'] },
      { name: 'compact', shown: NONE, expected: ['ellipsis'] }
    ])('GIVEN $name', ({ shown, expected }) => {
      it(`THEN the shown kinds are ${JSON.stringify(expected)} in DOM order`, () => {
        const kinds = toolbarShownKindsOf(shown);

        expect(kinds).toStrictEqual(expected);
      });
    });
  });

  describe('GIVEN a preferred stop and the shown kinds', () => {
    describe.each(STOP_CASES)('GIVEN $name', ({ preferred, shown, expected }) => {
      it(`THEN the stop is ${expected}`, () => {
        const stop = toolbarStopOf(preferred, shown);

        expect(stop).toBe(expected);
      });
    });
  });
});
