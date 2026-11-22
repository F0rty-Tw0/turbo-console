import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';

import { edgeIdOf } from './edge-id.util.ts';
import { elkModuleGraphOf } from './elk-module-graph.util.ts';
import { groupedRootOptionsOf, paddedOptionsOf } from './elk-options.util.ts';
import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import { compoundOptionsOf } from './task-compound.util.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import { LAYERING_DEFAULT } from '../common/graph-layout.const.ts';
import type { ModuleMeasures, ModuleScene } from '../common/module-scene.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { REAL_ELK_TIMEOUT_MS } from '../test/common/real-elk.const.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

type Shape = string | [string, Shape[]];

const shapeOf = (node: ElkNode): Shape => {
  if (node.children === undefined) return node.id;

  const nested = node.children.map(shapeOf);
  const shape: Shape = [node.id, nested];

  return shape;
};

const nodesOf = (node: ElkNode): ElkNode[] => {
  const children = node.children ?? [];
  const nested = children.flatMap(nodesOf);

  return [node, ...nested];
};

/** An unplaced coordinate reads as -1, so it counts as outside. */
const coordinateOf = (value: number | undefined): number => value ?? -1;

const lengthOf = (value: number | undefined): number => value ?? 0;

const isBefore = (child: ElkNode): boolean => coordinateOf(child.x) < 0 || coordinateOf(child.y) < 0;

const isPast = (child: ElkNode, parent: ElkNode): boolean => {
  const right = coordinateOf(child.x) + lengthOf(child.width);
  const bottom = coordinateOf(child.y) + lengthOf(child.height);

  return right > lengthOf(parent.width) || bottom > lengthOf(parent.height);
};

/** The ids of children that ELK placed outside their parent's frame; child coordinates are parent-relative. */
const outsidersOf = (parent: ElkNode): string[] => {
  const children = parent.children ?? [];
  const isOutside = (child: ElkNode): boolean => isBefore(child) || isPast(child, parent);
  const own = children.filter(isOutside).map((child) => child.id);
  const nested = children.flatMap(outsidersOf);

  return [...own, ...nested];
};

const MEASURES: ModuleMeasures = {
  sizeOf: (leaf) => {
    const size: NodeSize = { width: 10 * leaf.label.length, height: 32 };

    return size;
  },
  titleWidthOf: (box) => 10 * box.name.length
};

const sceneOf = (data: ModulesFound, expanded: string[]): ModuleScene =>
  moduleSceneOf(moduleTreeOf(data.files), data, { expanded, shown: ALL_SHOWN_STUB });

const SCENE = sceneOf(MODULES_FOUND_STUB, ['src', 'src/lib']);

describe('FEATURE: nested ELK module graph', () => {
  describe('GIVEN the stub scene with src and src/lib expanded', () => {
    const graph = elkModuleGraphOf(SCENE, MEASURES);

    it('WHEN the ELK input is built THEN boxes nest as compounds and stubs sit at the root', () => {
      expect(shapeOf(graph)).toStrictEqual([
        'root',
        [
          ['dir:', [['dir:src', [['dir:src/lib', ['file:src/lib/b.ts', 'file:src/lib/c.ts']], 'dir:src/ui', 'file:src/a.spec.ts', 'file:src/a.ts']], 'file:index.ts']],
          'pkg:@s/x',
          'pkg:@s/y'
        ]
      ]);
    });

    it('WHEN the ELK input is built THEN the root includes children and each box is padded and at least its title wide', () => {
      const src = nodesOf(graph).find((node) => node.id === 'dir:src');

      expect(graph.layoutOptions).toStrictEqual(groupedRootOptionsOf(8, LAYERING_DEFAULT));
      expect(src?.layoutOptions).toStrictEqual(compoundOptionsOf(30, paddedOptionsOf(8, LAYERING_DEFAULT)));
    });

    it('WHEN the ELK input is built THEN every scene link is a root edge and no compound holds an edge', () => {
      const ids = SCENE.links.map((link) => edgeIdOf(link));
      const inner = nodesOf(graph).slice(1).filter((node) => node.edges !== undefined);

      expect(graph.edges?.map((edge) => edge.id)).toStrictEqual(ids);
      expect(inner).toStrictEqual([]);
    });

    it('WHEN the ELK input is built THEN leaves carry the measured size', () => {
      const index = nodesOf(graph).find((node) => node.id === 'file:index.ts');

      expect(index).toStrictEqual({ id: 'file:index.ts', width: 80, height: 32 });
    });

    it('WHEN the real ELK lays it out THEN every node sits inside its parent', { timeout: REAL_ELK_TIMEOUT_MS }, async () => {
      const laid = await new elkConstructor().layout(graph);

      expect(outsidersOf(laid)).toStrictEqual([]);
    });
  });

  describe('GIVEN 101 files at the package root', () => {
    it('WHEN the ELK input is built THEN layering thoroughness drops to 1', () => {
      const files = Array.from({ length: 101 }, (_, index) => `f${String(index).padStart(3, '0')}.ts`);
      const data: ModulesFound = { ...MODULES_FOUND_STUB, files, tests: [], stubs: [], fileLinks: [], stubLinks: [] };

      expect(elkModuleGraphOf(sceneOf(data, []), MEASURES).layoutOptions?.['elk.layered.thoroughness']).toBe('1');
    });
  });

  describe('GIVEN an empty scene', () => {
    it('WHEN the ELK input is built THEN the root has no children and no edges', () => {
      const graph = elkModuleGraphOf({ boxes: [], leaves: [], links: [], leafCount: 0 }, MEASURES);

      expect(graph.children).toStrictEqual([]);
      expect(graph.edges).toStrictEqual([]);
    });
  });
});
