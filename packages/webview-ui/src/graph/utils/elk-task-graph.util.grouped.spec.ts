import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { elkEdgeOf } from './elk-grouped-graph.util.ts';
import { paddedOptionsOf } from './elk-options.util.ts';
import { elkTaskGraphOf } from './elk-task-graph.util.ts';
import { folderIdOf } from './folder-id.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { LAYERING_DEFAULT } from '../common/graph-layout.const.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import { FOLDER_PADDING_PX } from '../common/graph.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { packedRootOptionsOf, wrapperIdOf, wrapperLayoutOptionsOf } from '../test/utils/elk-pack.spec.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const SIZE_OF = (): NodeSize => NODE_SIZE;

const NO_SIZES = new Map<string, NodeSize>();

const NO_TITLES = new Map<string, number>();

const childIdsOf = (node: ElkNode): string[] => {
  const children = node.children ?? [];

  return children.map((child) => child.id);
};

const compoundOf = (graph: ElkNode, id: string): ElkNode | undefined => graph.children?.find((child) => child.id === id);

const MISSING: ElkNode = { id: 'missing' };

/** The compound reached by following `ids` down from `graph`; `MISSING` where a step has no such child. */
const compoundAt = (graph: ElkNode, ids: string[]): ElkNode => {
  const step = (node: ElkNode, id: string): ElkNode => compoundOf(node, id) ?? MISSING;
  const found = ids.reduce(step, graph);

  return found;
};

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

const graphOf = (shown: ReadonlySet<string>, naming: TaskNaming, titleWidths: ReadonlyMap<string, number> = NO_TITLES): ElkNode => {
  const input = { tasks: FOLDER_TASKS, shown, sizes: NO_SIZES, titleWidths, naming };

  return elkTaskGraphOf(input, SIZE_OF);
};

describe('FEATURE: elkTaskGraphOf grouped by folder', () => {
  describe('GIVEN grouped and the tasks of web (apps), ui and core (packages)', () => {
    describe('WHEN built', () => {
      it('THEN the root children are the folder compounds by code unit', () => {
        const graph = graphOf(PACKAGE_TASKS_SHOWN, NAMING_GROUPED);

        expect(childIdsOf(graph)).toStrictEqual([folderIdOf('apps'), folderIdOf('packages')]);
      });

      it('THEN the packages folder holds pkg:core and pkg:ui', () => {
        const graph = graphOf(PACKAGE_TASKS_SHOWN, NAMING_GROUPED);
        const packages = compoundAt(graph, [folderIdOf('packages')]);

        expect(childIdsOf(packages)).toStrictEqual(['pkg:core', 'pkg:ui']);
      });

      it('THEN the apps folder holds pkg:web, which holds web#build', () => {
        const graph = graphOf(PACKAGE_TASKS_SHOWN, NAMING_GROUPED);
        const web = compoundAt(graph, [folderIdOf('apps'), 'pkg:web']);

        expect(childIdsOf(web)).toStrictEqual(['web#build']);
      });

      it('THEN the edges stay at the root', () => {
        const graph = graphOf(PACKAGE_TASKS_SHOWN, NAMING_GROUPED);

        expect(graph.edges).toHaveLength(2);
      });
    });

    it('WHEN the packages folder has a title width THEN its compound asks ELK for it plus both paddings', () => {
      const titles = new Map([[folderIdOf('packages'), 90]]);
      const graph = graphOf(PACKAGE_TASKS_SHOWN, NAMING_GROUPED, titles);
      const packages = compoundAt(graph, [folderIdOf('packages')]);

      expect(packages.layoutOptions?.['elk.nodeSize.minimum']).toBe(`(0, ${90 + 2 * FOLDER_PADDING_PX})`);
    });
  });

  describe('GIVEN grouped and the root //#gen shown beside web#build, unlinked', () => {
    it('WHEN built THEN the root folder comes first (in the first wrapper) and holds pkg://', () => {
      const graph = graphOf(new Set(['web#build', '//#gen']), NAMING_GROUPED);
      const folders = childIdsOf(graph).flatMap((id) => childIdsOf(compoundAt(graph, [id])));
      const root = compoundAt(graph, [wrapperIdOf(0), folderIdOf('')]);

      expect(folders).toStrictEqual([folderIdOf(''), folderIdOf('apps')]);
      expect(childIdsOf(root)).toStrictEqual(['pkg://']);
    });
  });

  describe('GIVEN grouped tasks where a script of web (apps) needs a task of ui (packages), and cli (tools) stands alone', () => {
    it('c9: WHEN built THEN two wrappers: apps and packages in the first, tools in the second', () => {
      const tasks = [scriptOf('web#lint-fix', ['ui#build']), taskOf('ui#build', []), taskOf('cli#build', [])];
      const shown = new Set(tasks.map((task) => task.id));
      const folders = new Map([
        ['web', 'apps'],
        ['ui', 'packages'],
        ['cli', 'tools']
      ]);
      const naming = { ...NAMING_GROUPED, folders };
      const input = { tasks, shown, sizes: NO_SIZES, titleWidths: NO_TITLES, naming };

      const graph = elkTaskGraphOf(input, SIZE_OF);
      const folderIds = childIdsOf(graph).map((id) => childIdsOf(compoundAt(graph, [id])));
      const linkId = edgeIdOf({ source: 'web#lint-fix', target: 'ui#build' });
      const firstEdges = compoundAt(graph, [wrapperIdOf(0)]).edges ?? [];
      const firstEdgeIds = firstEdges.map((edge) => edge.id);

      expect(childIdsOf(graph)).toStrictEqual([wrapperIdOf(0), wrapperIdOf(1)]);
      expect(folderIds).toStrictEqual([[folderIdOf('apps'), folderIdOf('packages')], [folderIdOf('tools')]]);
      expect(firstEdgeIds).toStrictEqual([linkId]);
    });
  });

  describe('GIVEN ungrouped and the same tasks', () => {
    it('WHEN built THEN the packed graph: one wrapper for //#gen, one for web, ui and core with the edges', () => {
      const shown = new Set([...PACKAGE_TASKS_SHOWN, '//#gen']);
      const graph = graphOf(shown, { ...NAMING_GROUPED, grouped: false });
      const layoutOptions = paddedOptionsOf(4, LAYERING_DEFAULT);
      const compoundOfLeaf = (packageName: string, taskId: string): ElkNode => {
        const leaf: ElkNode = { id: taskId, ...NODE_SIZE };
        const compound: ElkNode = { id: `pkg:${packageName}`, layoutOptions, children: [leaf] };

        return compound;
      };
      const wrapperOptions = wrapperLayoutOptionsOf(4, LAYERING_DEFAULT);
      const edges = [elkEdgeOf({ source: 'web#build', target: 'ui#build' }), elkEdgeOf({ source: 'ui#build', target: 'core#build' })];
      const gen: ElkNode = {
        id: wrapperIdOf(0),
        layoutOptions: wrapperOptions,
        children: [compoundOfLeaf('//', '//#gen')],
        edges: []
      };
      const chain: ElkNode = {
        id: wrapperIdOf(1),
        layoutOptions: wrapperOptions,
        children: [compoundOfLeaf('core', 'core#build'), compoundOfLeaf('ui', 'ui#build'), compoundOfLeaf('web', 'web#build')],
        edges
      };
      const packed: ElkNode = {
        id: 'root',
        layoutOptions: packedRootOptionsOf(4, LAYERING_DEFAULT),
        children: [gen, chain],
        edges: []
      };

      expect(graph).toStrictEqual(packed);
    });
  });
});
