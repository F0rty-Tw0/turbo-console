import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { COMPOUND_OPTIONS } from './elk-grouped-graph.util.ts';
import { elkTaskGraphOf, taskLayoutKeyOf } from './elk-task-graph.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const SIZE_OF = (): NodeSize => NODE_SIZE;

/** `web#build` depends on `api#build`; `web#lint` and the root `//#lint` stand alone. */
const TASKS: GraphTask[] = [
  taskOf('api#build', []),
  taskOf('web#build', ['api#build']),
  taskOf('web#lint', []),
  taskOf('//#lint', [])
];

const BOTH = new Set(['web#build', 'api#build']);

const childIdsOf = (node: ElkNode): string[] => {
  const children = node.children ?? [];

  return children.map((child) => child.id);
};

describe('FEATURE: elkTaskGraphOf', () => {
  describe('GIVEN web#build and the api#build it depends on, both shown', () => {
    it('WHEN built THEN one compound per package and one root edge', () => {
      const graph = elkTaskGraphOf(TASKS, BOTH, SIZE_OF);

      expect(childIdsOf(graph)).toStrictEqual(['pkg:api', 'pkg:web']);
      expect(graph.edges).toHaveLength(1);
    });

    it('WHEN built THEN each compound holds its shown tasks at their size, with the compound options', () => {
      const graph = elkTaskGraphOf(TASKS, BOTH, SIZE_OF);
      const [, web] = graph.children ?? [];
      const leaf: ElkNode = { id: 'web#build', ...NODE_SIZE };
      const expected: ElkNode = { id: 'pkg:web', layoutOptions: COMPOUND_OPTIONS, children: [leaf] };

      expect(web).toMatchObject(expected);
    });

    it('WHEN built THEN the root routes edges across compounds', () => {
      const graph = elkTaskGraphOf(TASKS, BOTH, SIZE_OF);

      expect(graph.layoutOptions?.['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    });
  });

  describe('GIVEN the dependency is not shown', () => {
    it('WHEN built THEN no edge is drawn', () => {
      const graph = elkTaskGraphOf(TASKS, new Set(['web#build']), SIZE_OF);

      expect(graph.edges).toStrictEqual([]);
    });
  });

  describe('GIVEN a root task is shown', () => {
    it('WHEN built THEN its compound is pkg://', () => {
      const graph = elkTaskGraphOf(TASKS, new Set(['//#lint']), SIZE_OF);

      expect(childIdsOf(graph)).toStrictEqual(['pkg://']);
    });
  });
});

describe('FEATURE: taskLayoutKeyOf', () => {
  describe('GIVEN the same tasks and shown set', () => {
    it('WHEN keyed twice, the set in another order THEN the keys are equal', () => {
      const reversed = new Set(['api#build', 'web#build']);

      expect(taskLayoutKeyOf(TASKS, BOTH)).toBe(taskLayoutKeyOf(TASKS, reversed));
    });
  });

  describe('GIVEN one more shown task', () => {
    it('WHEN keyed THEN the key differs', () => {
      const more = new Set([...BOTH, 'web#lint']);

      expect(taskLayoutKeyOf(TASKS, more)).not.toBe(taskLayoutKeyOf(TASKS, BOTH));
    });
  });

  describe('GIVEN the same shown ids but another edge', () => {
    it('WHEN keyed THEN the key differs', () => {
      const unlinked = [taskOf('api#build', []), taskOf('web#build', [])];

      expect(taskLayoutKeyOf(unlinked, BOTH)).not.toBe(taskLayoutKeyOf(TASKS, BOTH));
    });
  });
});
