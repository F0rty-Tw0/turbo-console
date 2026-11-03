import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';

import { COMPOUND_OPTIONS, elkEdgeOf } from './elk-grouped-graph.util.ts';
import { elkTaskGraphOf, taskLayoutKeyOf } from './elk-task-graph.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { NEUTRAL_NAMING } from '../common/graph-task.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { ELK_GROUPED_ROOT_OPTIONS, FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
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

const childIdsOf = (node: ElkNode): string[] => {
  const children = node.children ?? [];

  return children.map((child) => child.id);
};

const graphOf = (
  tasks: GraphTask[],
  shown: ReadonlySet<string>,
  sizes: ReadonlyMap<string, NodeSize> = NO_SIZES,
  titleWidths: ReadonlyMap<string, number> = NO_TITLES
): ElkNode => elkTaskGraphOf({ tasks, shown, sizes, titleWidths, naming: NEUTRAL_NAMING }, SIZE_OF);

/** `web` in `apps`, `ui` and `core` in `packages`; the root `//` is in no folder of the map. */
const NAMING_GROUPED: TaskNaming = {
  grouped: true,
  scopeShown: true,
  labels: new Map(),
  folders: new Map([
    ['web', 'apps'],
    ['ui', 'packages'],
    ['core', 'packages']
  ])
};

/** `web#build` (apps) needs `ui#build`, which needs `core#build` (both packages); the root `//#gen` stands alone. */
const FOLDER_TASKS: GraphTask[] = [
  taskOf('web#build', ['ui#build']),
  taskOf('ui#build', ['core#build']),
  taskOf('core#build', []),
  taskOf('//#gen', [])
];

const PACKAGE_TASKS_SHOWN = new Set(['web#build', 'ui#build', 'core#build']);

const groupedGraphOf = (shown: ReadonlySet<string>, titleWidths: ReadonlyMap<string, number> = NO_TITLES): ElkNode => {
  const input = { tasks: FOLDER_TASKS, shown, sizes: NO_SIZES, titleWidths, naming: NAMING_GROUPED };

  return elkTaskGraphOf(input, SIZE_OF);
};

const compoundOf = (graph: ElkNode, id: string): ElkNode | undefined => graph.children?.find((child) => child.id === id);

const MISSING: ElkNode = { id: 'missing' };

/** The compound reached by following `ids` down from `graph`; `MISSING` where a step has no such child. */
const compoundAt = (graph: ElkNode, ids: string[]): ElkNode => {
  const step = (node: ElkNode, id: string): ElkNode => compoundOf(node, id) ?? MISSING;
  const found = ids.reduce(step, graph);

  return found;
};

/** `web#build` alone, its leaf `leafWidth` wide, its package title `titleWidth` wide, laid out by the real ELK. */
const layoutOf = async (leafWidth: number, titleWidth: number): Promise<ElkNode> => {
  const leafSize: NodeSize = { width: leafWidth, height: 32 };
  const sizes = new Map([['web#build', leafSize]]);
  const titles = new Map([['web', titleWidth]]);
  const graph = graphOf([taskOf('web#build', [])], new Set(['web#build']), sizes, titles);

  return new elkConstructor().layout(graph);
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
      const expected: ElkNode = { id: 'pkg:web', layoutOptions: COMPOUND_OPTIONS, children: [leaf] };

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

      expect(compoundOf(graph, 'pkg:api')?.layoutOptions).toStrictEqual(COMPOUND_OPTIONS);
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

  describe('GIVEN a package title of 130, laid out by the real ELK', () => {
    it('WHEN its one leaf is 80 wide THEN the box is 194 wide, 96 high, and the leaf stays at the padding', async () => {
      const graph = await layoutOf(80, 130);
      const box = compoundOf(graph, 'pkg:web');
      const leaf = firstLeafOf(box);

      expect(box).toMatchObject({ width: 194, height: 96 });
      expect(leaf?.x).toBe(32);
    });

    it('WHEN its one leaf is 200 wide THEN the box keeps the task-driven 264 (the minimum never shrinks)', async () => {
      const graph = await layoutOf(200, 130);

      expect(compoundOf(graph, 'pkg:web')?.width).toBe(264);
    });
  });
});

describe('FEATURE: elkTaskGraphOf grouped by folder', () => {
  describe('GIVEN grouped and the tasks of web (apps), ui and core (packages)', () => {
    it('WHEN built THEN the root children are the folder compounds by code unit', () => {
      const graph = groupedGraphOf(PACKAGE_TASKS_SHOWN);

      expect(childIdsOf(graph)).toStrictEqual([folderIdOf('apps'), folderIdOf('packages')]);
    });

    it('WHEN built THEN the packages folder holds pkg:core and pkg:ui', () => {
      const graph = groupedGraphOf(PACKAGE_TASKS_SHOWN);
      const packages = compoundAt(graph, [folderIdOf('packages')]);

      expect(childIdsOf(packages)).toStrictEqual(['pkg:core', 'pkg:ui']);
    });

    it('WHEN built THEN the apps folder holds pkg:web, which holds web#build', () => {
      const graph = groupedGraphOf(PACKAGE_TASKS_SHOWN);
      const web = compoundAt(graph, [folderIdOf('apps'), 'pkg:web']);

      expect(childIdsOf(web)).toStrictEqual(['web#build']);
    });

    it('WHEN built THEN the edges stay at the root', () => {
      const graph = groupedGraphOf(PACKAGE_TASKS_SHOWN);

      expect(graph.edges).toHaveLength(2);
    });

    it('WHEN the packages folder has a title width THEN its compound asks ELK for it plus both paddings', () => {
      const titles = new Map([[folderIdOf('packages'), 90]]);
      const graph = groupedGraphOf(PACKAGE_TASKS_SHOWN, titles);
      const packages = compoundAt(graph, [folderIdOf('packages')]);

      expect(packages.layoutOptions?.['elk.nodeSize.minimum']).toBe(`(0, ${90 + 2 * FOLDER_PADDING_PX})`);
    });
  });

  describe('GIVEN grouped and the root //#gen shown beside web#build', () => {
    it('WHEN built THEN the root folder comes first and holds pkg://', () => {
      const graph = groupedGraphOf(new Set(['web#build', '//#gen']));
      const root = compoundAt(graph, [folderIdOf('')]);

      expect([childIdsOf(graph), childIdsOf(root)]).toStrictEqual([[folderIdOf(''), folderIdOf('apps')], ['pkg://']]);
    });
  });

  describe('GIVEN ungrouped and the same tasks', () => {
    it('WHEN built THEN the graph is the flat one: package compounds at the root, edges at the root', () => {
      const shown = new Set([...PACKAGE_TASKS_SHOWN, '//#gen']);
      const graph = graphOf(FOLDER_TASKS, shown);
      const compoundOfLeaf = (packageName: string, taskId: string): ElkNode => {
        const leaf: ElkNode = { id: taskId, ...NODE_SIZE };
        const compound: ElkNode = { id: `pkg:${packageName}`, layoutOptions: COMPOUND_OPTIONS, children: [leaf] };

        return compound;
      };
      const children = [
        compoundOfLeaf('//', '//#gen'),
        compoundOfLeaf('core', 'core#build'),
        compoundOfLeaf('ui', 'ui#build'),
        compoundOfLeaf('web', 'web#build')
      ];
      const edges = [elkEdgeOf({ source: 'web#build', target: 'ui#build' }), elkEdgeOf({ source: 'ui#build', target: 'core#build' })];
      const flat: ElkNode = { id: 'root', layoutOptions: ELK_GROUPED_ROOT_OPTIONS, children, edges };

      expect(graph).toStrictEqual(flat);
    });
  });
});

describe('FEATURE: taskLayoutKeyOf grouping', () => {
  const keyOf = (naming: TaskNaming): string => taskLayoutKeyOf(FOLDER_TASKS, PACKAGE_TASKS_SHOWN, NO_COUNTS, naming);
  const moved: TaskNaming = { ...NAMING_GROUPED, folders: new Map([...NAMING_GROUPED.folders, ['ui', 'libs']]) };

  describe('GIVEN the same tasks', () => {
    it('WHEN keyed grouped and ungrouped THEN the keys differ', () => {
      expect(keyOf(NAMING_GROUPED)).not.toBe(keyOf({ ...NAMING_GROUPED, grouped: false }));
    });

    it('WHEN keyed with scopes shown and hidden THEN the keys differ', () => {
      expect(keyOf(NAMING_GROUPED)).not.toBe(keyOf({ ...NAMING_GROUPED, scopeShown: false }));
    });
  });

  describe('GIVEN a shown package whose folder changes from packages to libs', () => {
    it('WHEN keyed grouped THEN the keys differ', () => {
      expect(keyOf(moved)).not.toBe(keyOf(NAMING_GROUPED));
    });

    it('WHEN keyed ungrouped THEN the keys are equal', () => {
      expect(keyOf({ ...moved, grouped: false })).toBe(keyOf({ ...NAMING_GROUPED, grouped: false }));
    });
  });

  describe('GIVEN a folder change of a package with no shown task', () => {
    it('WHEN keyed grouped THEN the keys are equal', () => {
      const elsewhere: TaskNaming = { ...NAMING_GROUPED, folders: new Map([...NAMING_GROUPED.folders, ['gone', 'libs']]) };

      expect(keyOf(elsewhere)).toBe(keyOf(NAMING_GROUPED));
    });
  });
});

describe('FEATURE: taskLayoutKeyOf', () => {
  describe('GIVEN the same tasks and shown set', () => {
    it('WHEN keyed twice, the set in another order THEN the keys are equal', () => {
      const reversed = new Set(['api#build', 'web#build']);

      expect(taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NEUTRAL_NAMING)).toBe(
        taskLayoutKeyOf(TASKS, reversed, NO_COUNTS, NEUTRAL_NAMING)
      );
    });
  });

  describe('GIVEN one more shown task', () => {
    it('WHEN keyed THEN the key differs', () => {
      const more = new Set([...BOTH, 'web#lint']);

      expect(taskLayoutKeyOf(TASKS, more, NO_COUNTS, NEUTRAL_NAMING)).not.toBe(
        taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NEUTRAL_NAMING)
      );
    });
  });

  describe('GIVEN the same shown ids but another edge', () => {
    it('WHEN keyed THEN the key differs', () => {
      const unlinked = [taskOf('api#build', []), taskOf('web#build', [])];

      expect(taskLayoutKeyOf(unlinked, BOTH, NO_COUNTS, NEUTRAL_NAMING)).not.toBe(
        taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NEUTRAL_NAMING)
      );
    });
  });
});

describe('FEATURE: taskLayoutKeyOf with file counts', () => {
  describe('GIVEN a shown umbrella of ten files', () => {
    const tenFiles = new Map([['web#build', 10]]);

    it('WHEN the count changes THEN the key differs', () => {
      const elevenFiles = new Map([['web#build', 11]]);

      expect(taskLayoutKeyOf(TASKS, BOTH, elevenFiles, NEUTRAL_NAMING)).not.toBe(
        taskLayoutKeyOf(TASKS, BOTH, tenFiles, NEUTRAL_NAMING)
      );
    });

    it('WHEN the counts hold another id that is not shown THEN the key is the same', () => {
      const withStranger = new Map([...tenFiles, ['web#lint', 3]]);

      expect(taskLayoutKeyOf(TASKS, BOTH, withStranger, NEUTRAL_NAMING)).toBe(taskLayoutKeyOf(TASKS, BOTH, tenFiles, NEUTRAL_NAMING));
    });

    it('WHEN no shown task has a count THEN the key is the one without counts', () => {
      const strangers = new Map([['web#lint', 3]]);

      expect(taskLayoutKeyOf(TASKS, BOTH, strangers, NEUTRAL_NAMING)).toBe(taskLayoutKeyOf(TASKS, BOTH, NO_COUNTS, NEUTRAL_NAMING));
    });
  });
});
