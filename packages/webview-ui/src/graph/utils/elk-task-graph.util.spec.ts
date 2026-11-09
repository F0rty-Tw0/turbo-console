import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';

import { paddedOptionsOf } from './elk-options.util.ts';
import { elkTaskGraphOf, taskLayoutKeyOf } from './elk-task-graph.util.ts';
import { titleSlotIdOf } from './task-compound.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { LAYERING_DEFAULT } from '../common/graph-layout.const.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { REAL_ELK_TIMEOUT_MS } from '../test/common/real-elk.const.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

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

const NO_COUNTS = new Map<string, number>();

const NO_SIZES = new Map<string, NodeSize>();

const NO_TITLES = new Map<string, number>();

const UMBRELLA_SIZE: NodeSize = { width: 200, height: 48 };

const firstLeafOf = (compound: ElkNode | undefined): ElkNode | undefined => compound?.children?.[0];

const topOf = (node: ElkNode): number => node.y ?? 0;

const leftOf = (node: ElkNode): number => node.x ?? 0;

const childIdsOf = (node: ElkNode): string[] => {
  const children = node.children ?? [];

  return children.map((child) => child.id);
};

const graphOf = (
  tasks: GraphTask[],
  shown: ReadonlySet<string>,
  sizes: ReadonlyMap<string, NodeSize> = NO_SIZES,
  titleWidths: ReadonlyMap<string, number> = NO_TITLES
): ElkNode => elkTaskGraphOf({ tasks, shown, sizes, titleWidths, naming: NAMING_STUB }, SIZE_OF);

const compoundOf = (graph: ElkNode, id: string): ElkNode | undefined => graph.children?.find((child) => child.id === id);

const MISSING: ElkNode = { id: 'missing' };

/** The compound reached by following `ids` down from `graph`; `MISSING` where a step has no such child. */
const compoundAt = (graph: ElkNode, ids: string[]): ElkNode => {
  const step = (node: ElkNode, id: string): ElkNode => compoundOf(node, id) ?? MISSING;
  const found = ids.reduce(step, graph);

  return found;
};

/** The child of `box` with `id`; `MISSING` where it has none. */
const leafAt = (box: ElkNode, id: string): ElkNode => box.children?.find((child) => child.id === id) ?? MISSING;

/** `web#build` alone, its leaf `leafWidth` wide, its package title `titleWidth` wide, laid out by the real ELK. */
const layoutOf = async (leafWidth: number, titleWidth: number): Promise<ElkNode> => {
  const leafSize: NodeSize = { width: leafWidth, height: 32 };
  const sizes = new Map([['web#build', leafSize]]);
  const titles = new Map([['web', titleWidth]]);
  const graph = graphOf([taskOf('web#build', [])], new Set(['web#build']), sizes, titles);

  return new elkConstructor().layout(graph);
};

/** `count` packages `p0`…, each with one turbo task and, by default, a title width, as a flat view. */
const singleTaskGraphOf = (count: number, titleWidths?: ReadonlyMap<string, number>): ElkNode => {
  const slots = Array.from({ length: count }, (_unused, index) => index);
  const tasks = slots.map((index) => taskOf(`p${index}#build`, []));
  const shown = new Set(tasks.map((task) => task.id));
  const titleEntries = slots.map((index): [string, number] => [`p${index}`, 60]);
  const titles = titleWidths ?? new Map(titleEntries);

  return graphOf(tasks, shown, NO_SIZES, titles);
};

describe('FEATURE: elkTaskGraphOf', () => {
  describe('GIVEN web#build and the api#build it depends on, both shown', () => {
    it('WHEN built THEN one compound per package and one root edge', () => {
      const graph = graphOf(TASKS, BOTH);

      expect(childIdsOf(graph)).toStrictEqual(['pkg:api', 'pkg:web']);
      expect(graph.edges).toHaveLength(1);
    });

    it('WHEN built THEN each compound holds its shown tasks at their size, with the compound options', () => {
      const graph = graphOf(TASKS, BOTH);
      const [, web] = graph.children ?? [];
      const leaf: ElkNode = { id: 'web#build', ...NODE_SIZE };
      const layoutOptions = paddedOptionsOf(2, LAYERING_DEFAULT);
      const expected: ElkNode = { id: 'pkg:web', layoutOptions, children: [leaf] };

      expect(web).toMatchObject(expected);
    });

    it('WHEN built THEN the root routes edges across compounds', () => {
      const graph = graphOf(TASKS, BOTH);

      expect(graph.layoutOptions?.['elk.hierarchyHandling']).toBe('INCLUDE_CHILDREN');
    });
  });

  describe('GIVEN web#build has a size of its own', () => {
    it('WHEN built THEN its leaf has that size and api#build keeps the sizer’s', () => {
      const graph = graphOf(TASKS, BOTH, new Map([['web#build', UMBRELLA_SIZE]]));
      const [api, web] = graph.children ?? [];

      expect(firstLeafOf(web)).toMatchObject({ id: 'web#build', ...UMBRELLA_SIZE });
      expect(firstLeafOf(api)).toMatchObject({ id: 'api#build', ...NODE_SIZE });
    });
  });

  describe('GIVEN the dependency is not shown', () => {
    it('WHEN built THEN no edge is drawn', () => {
      const graph = graphOf(TASKS, new Set(['web#build']));

      expect(graph.edges).toStrictEqual([]);
    });
  });

  describe('GIVEN a root task is shown', () => {
    it('WHEN built THEN its compound is pkg://', () => {
      const graph = graphOf(TASKS, new Set(['//#lint']));

      expect(childIdsOf(graph)).toStrictEqual(['pkg://']);
    });
  });

  describe('GIVEN the web package has a title width', () => {
    it('WHEN built THEN its compound asks ELK for that width plus both paddings, in the swapped (height, width) order', () => {
      const graph = graphOf(TASKS, BOTH, NO_SIZES, new Map([['web', 130]]));

      expect(compoundOf(graph, 'pkg:web')?.layoutOptions).toMatchObject({
        'elk.nodeSize.constraints': 'MINIMUM_SIZE',
        'elk.nodeSize.minimum': '(0, 194)'
      });
    });

    it('WHEN built THEN the api package, which has none, keeps the plain compound options', () => {
      const graph = graphOf(TASKS, BOTH, NO_SIZES, new Map([['web', 130]]));

      expect(compoundOf(graph, 'pkg:api')?.layoutOptions).toStrictEqual(paddedOptionsOf(2, LAYERING_DEFAULT));
    });
  });

  describe('GIVEN the root // with one turbo task and a title width', () => {
    it('WHEN built THEN pkg:// holds the title slot and the task, tied together in its own edges', () => {
      const graph = graphOf([taskOf('//#build', [])], new Set(['//#build']), NO_SIZES, new Map([['//', 60]]));
      const root = compoundAt(graph, ['pkg://']);

      expect(childIdsOf(root)).toStrictEqual([titleSlotIdOf('//'), '//#build']);
      expect(root.edges?.map((edge) => edge.id)).toStrictEqual(['title-tie://']);
      expect(graph.edges).toStrictEqual([]);
    });
  });

  describe('GIVEN app with the turbo task app#build and the script app#dev', () => {
    const tasks = [taskOf('app#build', []), scriptOf('app#dev', [])];
    const shown = new Set(['app#build', 'app#dev']);
    const titles = new Map([
      ['app', 60],
      ['scripts:app', 40]
    ]);

    it('WHEN built THEN pkg:app holds the turbo leaf and the compound scripts:app', () => {
      const graph = graphOf(tasks, shown, NO_SIZES, titles);
      const app = compoundAt(graph, ['pkg:app']);

      expect(childIdsOf(app)).toStrictEqual(['app#build', 'scripts:app']);
    });

    it('WHEN built THEN scripts:app holds the script leaf', () => {
      const graph = graphOf(tasks, shown, NO_SIZES, titles);
      const scripts = compoundAt(graph, ['pkg:app', 'scripts:app']);

      expect(childIdsOf(scripts)).toStrictEqual(['app#dev']);
    });

    it('WHEN built THEN scripts:app asks ELK for its title width plus both paddings', () => {
      const graph = graphOf(tasks, shown, NO_SIZES, titles);
      const scripts = compoundAt(graph, ['pkg:app', 'scripts:app']);

      expect(scripts.layoutOptions?.['elk.nodeSize.minimum']).toBe(`(0, ${40 + 2 * FOLDER_PADDING_PX})`);
    });

    it('WHEN both are shown THEN pkg:app has no title slot', () => {
      const graph = graphOf(tasks, shown, NO_SIZES, titles);

      expect(childIdsOf(compoundAt(graph, ['pkg:app']))).not.toContain(titleSlotIdOf('app'));
    });

    it('WHEN only the turbo task is shown THEN pkg:app has no scripts compound', () => {
      const graph = graphOf(tasks, new Set(['app#build']));
      const app = compoundAt(graph, ['pkg:app']);

      expect(childIdsOf(app)).toStrictEqual(['app#build']);
    });

    it('WHEN only the script is shown THEN pkg:app holds just scripts:app', () => {
      const graph = graphOf(tasks, new Set(['app#dev']));
      const app = compoundAt(graph, ['pkg:app']);

      expect(childIdsOf(app)).toStrictEqual(['scripts:app']);
    });
  });

  describe('GIVEN a script of the root //', () => {
    it('WHEN built THEN pkg:// holds scripts://', () => {
      const graph = graphOf([scriptOf('//#dev', [])], new Set(['//#dev']));
      const root = compoundAt(graph, ['pkg://']);

      expect(childIdsOf(root)).toStrictEqual(['scripts://']);
    });
  });

  describe('GIVEN a flat view of single-task packages that all have a title width', () => {
    it('WHEN the tasks and their title slots total 100 THEN the root keeps thoroughness 7', () => {
      const graph = singleTaskGraphOf(50);

      expect(graph.layoutOptions?.['elk.layered.thoroughness']).toBe('7');
    });

    it('WHEN the tasks are 51, under 100, but with their title slots total 102 THEN the root drops to thoroughness 1', () => {
      const graph = singleTaskGraphOf(51);

      expect(graph.layoutOptions?.['elk.layered.thoroughness']).toBe('1');
    });

    it('WHEN the same 51 tasks have no title widths THEN the root keeps thoroughness 7', () => {
      const graph = singleTaskGraphOf(51, NO_TITLES);

      expect(graph.layoutOptions?.['elk.layered.thoroughness']).toBe('7');
    });
  });

  describe('GIVEN a package title of 130, laid out by the real ELK', { timeout: REAL_ELK_TIMEOUT_MS }, () => {
    it('WHEN its one leaf is 80 wide THEN the box is 194 wide and taller than master by at most 21', async () => {
      const graph = await layoutOf(80, 130);
      const box = compoundAt(graph, ['pkg:web']);

      expect(box.width).toBe(194);
      expect(box.height).toBeGreaterThan(96);
      expect(box.height).toBeLessThanOrEqual(117);
    });

    it('WHEN its one leaf is 80 wide THEN the slot sits at the top padding and the leaf below it', async () => {
      const graph = await layoutOf(80, 130);
      const box = compoundAt(graph, ['pkg:web']);
      const slot = leafAt(box, titleSlotIdOf('web'));
      const leaf = leafAt(box, 'web#build');

      expect(slot.y).toBe(8);
      expect(topOf(leaf)).toBeGreaterThanOrEqual(topOf(slot) + 13);
    });

    it('WHEN its one leaf is 80 wide THEN the leaf sits inside the paddings, no longer pinned left', async () => {
      const graph = await layoutOf(80, 130);
      const leaf = leafAt(compoundAt(graph, ['pkg:web']), 'web#build');

      expect(leftOf(leaf)).toBeGreaterThanOrEqual(32);
      expect(leftOf(leaf) + 80).toBeLessThanOrEqual(162);
    });

    it('WHEN its one leaf is 200 wide THEN the box keeps the task-driven 264 (the minimum never shrinks)', async () => {
      const graph = await layoutOf(200, 130);

      expect(compoundOf(graph, 'pkg:web')?.width).toBe(264);
    });
  });
});

describe('FEATURE: taskLayoutKeyOf', () => {
  describe('GIVEN the same tasks and shown set', () => {
    it('WHEN keyed twice, the set in another order THEN the keys are equal', () => {
      const reversed = new Set(['api#build', 'web#build']);

      expect(taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NAMING_STUB)).toBe(taskLayoutKeyOf(TASKS, reversed, NO_COUNTS, NAMING_STUB));
    });
  });

  describe('GIVEN one more shown task', () => {
    it('WHEN keyed THEN the key differs', () => {
      const more = new Set([...BOTH, 'web#lint']);

      expect(taskLayoutKeyOf(TASKS, more, NO_COUNTS, NAMING_STUB)).not.toBe(taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NAMING_STUB));
    });
  });

  describe('GIVEN the same shown ids but another edge', () => {
    it('WHEN keyed THEN the key differs', () => {
      const unlinked = [taskOf('api#build', []), taskOf('web#build', [])];

      expect(taskLayoutKeyOf(unlinked, BOTH, NO_COUNTS, NAMING_STUB)).not.toBe(taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NAMING_STUB));
    });
  });
});

describe('FEATURE: taskLayoutKeyOf with file counts', () => {
  describe('GIVEN a shown umbrella of ten files', () => {
    const tenFiles = new Map([['web#build', 10]]);

    it('WHEN the count changes THEN the key differs', () => {
      const elevenFiles = new Map([['web#build', 11]]);

      expect(taskLayoutKeyOf(TASKS, BOTH, elevenFiles, NAMING_STUB)).not.toBe(taskLayoutKeyOf(TASKS, BOTH, tenFiles, NAMING_STUB));
    });

    it('WHEN the counts hold another id that is not shown THEN the key is the same', () => {
      const withStranger = new Map([...tenFiles, ['web#lint', 3]]);

      expect(taskLayoutKeyOf(TASKS, BOTH, withStranger, NAMING_STUB)).toBe(taskLayoutKeyOf(TASKS, BOTH, tenFiles, NAMING_STUB));
    });

    it('WHEN no shown task has a count THEN the key is the one without counts', () => {
      const strangers = new Map([['web#lint', 3]]);

      expect(taskLayoutKeyOf(TASKS, BOTH, strangers, NAMING_STUB)).toBe(taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NAMING_STUB));
    });
  });
});
