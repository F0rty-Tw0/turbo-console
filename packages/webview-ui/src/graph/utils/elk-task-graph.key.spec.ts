import { describe, expect, it } from 'vitest';

import { taskLayoutKeyOf } from './elk-task-graph.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { LAYOUT_VERSION } from '../common/graph-layout.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const TASKS: GraphTask[] = [taskOf('web#build', ['ui#build']), taskOf('ui#build', [])];

const SHOWN = new Set(['web#build', 'ui#build']);

const NO_COUNTS = new Map<string, number>();

/** Ungrouped, scopes shown, `web` in `apps` and `ui` in `packages`. */
const BASE: TaskNaming = {
  grouped: false,
  scopeShown: true,
  labels: new Map(),
  folders: new Map([
    ['web', 'apps'],
    ['ui', 'packages']
  ])
};

const MOVED = new Map([
  ['web', 'libs'],
  ['ui', 'packages']
]);

const MOVED_UNSHOWN = new Map([...BASE.folders, ['gone', 'libs']]);

const keyOf = (naming: TaskNaming): string => taskLayoutKeyOf(TASKS, SHOWN, NO_COUNTS, naming);

const GROUPED: Partial<TaskNaming> = { grouped: true };

const GROUPED_MOVED: Partial<TaskNaming> = { grouped: true, folders: MOVED };

const GROUPED_MOVED_UNSHOWN: Partial<TaskNaming> = { grouped: true, folders: MOVED_UNSHOWN };

const SCOPE_HIDDEN: Partial<TaskNaming> = { scopeShown: false };

const RELABELLED: Partial<TaskNaming> = { labels: new Map([['web', 'Web']]) };

const UNGROUPED_MOVED: Partial<TaskNaming> = { folders: MOVED };

type KeyRow = {
  readonly fact: string;
  readonly before: Partial<TaskNaming>;
  readonly after: Partial<TaskNaming>;
  readonly isEqual: boolean;
};

const ROWS: KeyRow[] = [
  { fact: 'grouped flips', before: {}, after: GROUPED, isEqual: false },
  { fact: 'scopeShown flips', before: {}, after: SCOPE_HIDDEN, isEqual: false },
  { fact: 'a label changes but scopeShown does not', before: {}, after: RELABELLED, isEqual: true },
  { fact: 'a shown package changes folder while grouped', before: GROUPED, after: GROUPED_MOVED, isEqual: false },
  { fact: 'a shown package changes folder while ungrouped', before: {}, after: UNGROUPED_MOVED, isEqual: true },
  { fact: 'an unshown package changes folder while grouped', before: GROUPED, after: GROUPED_MOVED_UNSHOWN, isEqual: true }
];

/** The key as it was saved before the naming bits and the layout version: the current key without both. */
const oldShapeOf = (naming: TaskNaming): string => keyOf(naming).replace(/,\[(true|false),(true|false),.*\],\d+\]$/, ']');

describe('FEATURE: taskLayoutKeyOf naming bits', () => {
  describe('GIVEN two namings that differ in one fact', () => {
    it.each(ROWS)('WHEN $fact THEN the keys are equal: $isEqual', ({ before, after, isEqual }) => {
      const keyBefore = keyOf({ ...BASE, ...before });
      const keyAfter = keyOf({ ...BASE, ...after });

      expect(keyBefore === keyAfter).toBe(isEqual);
    });
  });

  describe('GIVEN a key built now', () => {
    it('WHEN a key is built THEN its last element is the layout version', () => {
      const key = keyOf(BASE);

      expect(key.endsWith(`,${LAYOUT_VERSION}]`)).toBe(true);
    });
  });

  describe('GIVEN a key saved before the naming bits existed', () => {
    it('WHEN it is the current key without its last element THEN it never equals a current key', () => {
      const saved = oldShapeOf(BASE);
      const ungroupedKey = keyOf(BASE);
      const groupedKey = keyOf({ ...BASE, grouped: true });

      expect(saved).not.toBe(ungroupedKey);
      expect(saved).not.toBe(groupedKey);
    });
  });
});
