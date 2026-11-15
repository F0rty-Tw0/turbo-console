import { describe, expect, it } from 'vitest';

import { affectedOf } from './graph-affected.util.ts';
import type { AffectedView } from '../../tree/common/affected.type.ts';
import { AFFECTED_MARKS_STUB, AFFECTED_VIEW_STUB } from '../test/stubs/graph-affected.stub.ts';
import { GRAPH_TASKS_STUB } from '../test/stubs/graph-model.stub.ts';
import { protoNamed } from '../test/utils/proto-named.spec.util.ts';

describe('FEATURE: the affected marks of a graph', () => {
  describe('GIVEN a view', () => {
    it('WHEN affectedOf runs THEN each listed task the view marks gets its mark', () => {
      expect(affectedOf(GRAPH_TASKS_STUB, AFFECTED_VIEW_STUB)).toStrictEqual(AFFECTED_MARKS_STUB);
    });
  });

  describe('GIVEN a null view', () => {
    it('WHEN affectedOf runs THEN the result is null', () => {
      expect(affectedOf(GRAPH_TASKS_STUB, null)).toBeNull();
    });
  });

  describe('GIVEN a view that marks no listed task', () => {
    it('WHEN affectedOf runs THEN the result is an object with no tasks, not null', () => {
      const view: AffectedView = { settledAt: 1, mode: 'package', tasks: new Map([['gone#x', { mark: 'changed', line: 'x' }]]) };

      expect(affectedOf(GRAPH_TASKS_STUB, view)).toStrictEqual({ mode: 'package', tasks: {} });
    });
  });

  describe('GIVEN a listed task whose id is __proto__ and a view that marks it', () => {
    it('WHEN affectedOf runs THEN the mark is an own key of the tasks record', () => {
      const tasks = GRAPH_TASKS_STUB.slice(0, 1).map(protoNamed);
      const view: AffectedView = { settledAt: 1, mode: 'package', tasks: new Map([['__proto__', { mark: 'changed', line: 'x' }]]) };
      const marks = affectedOf(tasks, view)?.tasks ?? {};

      expect(Object.hasOwn(marks, '__proto__')).toBe(true);
      expect(Object.entries(marks)).toStrictEqual([['__proto__', 'changed']]);
    });
  });
});
