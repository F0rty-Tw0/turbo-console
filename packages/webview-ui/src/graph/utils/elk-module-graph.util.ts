import type { ElkNode } from 'elkjs/lib/elk-api.js';

import { elkEdgeOf } from './elk-grouped-graph.util.ts';
import { groupedRootOptionsOf, paddedOptionsOf } from './elk-options.util.ts';
import { packComponentsOf } from './elk-pack.util.ts';
import { compoundOptionsOf } from './task-compound.util.ts';
import { LAYERING_DEFAULT } from '../common/graph-layout.const.ts';
import type { ModuleBox, ModuleLeaf, ModuleMeasures, ModuleScene } from '../common/module-scene.type.ts';

const parentOf = (node: ModuleBox | ModuleLeaf): string | null => node.parent;

/**
 * The nested ELK input of a module scene: each box a padded compound holding its child boxes then its leaves, stubs at the
 * root, and every link a root edge so ELK routes it across boxes (`INCLUDE_CHILDREN`); unlinked parts are packed
 * (`packComponentsOf`).
 */
export const elkModuleGraphOf = (scene: ModuleScene, measures: ModuleMeasures): ElkNode => {
  const base = paddedOptionsOf(scene.leafCount, LAYERING_DEFAULT);
  const boxesOf = Map.groupBy(scene.boxes, parentOf);
  const leavesOf = Map.groupBy(scene.leaves, parentOf);
  const leafOf = (leaf: ModuleLeaf): ElkNode => {
    const { width, height } = measures.sizeOf(leaf);
    const node: ElkNode = { id: leaf.id, width, height };

    return node;
  };
  const compoundOf = (box: ModuleBox): ElkNode => {
    const titleWidth = measures.titleWidthOf(box);
    const layoutOptions = compoundOptionsOf(titleWidth, base);
    const boxes = boxesOf.get(box.id) ?? [];
    const leaves = leavesOf.get(box.id) ?? [];
    const nested = boxes.map(compoundOf);
    const own = leaves.map(leafOf);
    const children = [...nested, ...own];
    const compound: ElkNode = { id: box.id, layoutOptions, children };

    return compound;
  };
  const rootBoxes = boxesOf.get(null) ?? [];
  const stubs = leavesOf.get(null) ?? [];
  const rootCompounds = rootBoxes.map(compoundOf);
  const stubLeaves = stubs.map(leafOf);
  const children = [...rootCompounds, ...stubLeaves];
  const layoutOptions = groupedRootOptionsOf(scene.leafCount, LAYERING_DEFAULT);
  const edges = scene.links.map(elkEdgeOf);
  const root: ElkNode = { id: 'root', layoutOptions, children, edges };

  return packComponentsOf(root);
};
