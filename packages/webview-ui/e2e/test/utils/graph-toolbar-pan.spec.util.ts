import { isInside } from './element-rect.spec.util.ts';
import { nodeBoxOf } from './graph-geometry.spec.util.ts';
import type { GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import {
  focusLabelOf,
  folderTitleOf,
  folderToggleLabelOf,
  packageActionsLabelOf
} from '../../../src/graph/utils/controls-text.util.ts';
import { folderOf } from '../../../src/graph/utils/folder-group.util.ts';
import { folderOfElementId } from '../../../src/graph/utils/folder-id.util.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/** The container less `margin` on every side. */
const shrunkBy = (container: ElementRect, margin: number): ElementRect => {
  const inner: ElementRect = {
    left: container.left + margin,
    top: container.top + margin,
    width: container.width - 2 * margin,
    height: container.height - 2 * margin
  };

  return inner;
};

/** The first package node, not a folder box, whose drawn box lies wholly inside the container less `margin`; throws when none does. */
export const firstPackageClearOf = (nodes: ProbeNode[], zoom: number, container: ElementRect, margin: number): string => {
  const inner = shrunkBy(container, margin);
  const isClear = (node: ProbeNode): boolean => folderOfElementId(node.id) === null && isInside(nodeBoxOf(node, zoom), inner);
  const found = nodes.find(isClear);

  if (found === undefined) throw new Error(`graph e2e: no package is drawn ${margin} px inside the container`);

  return found.id;
};

/** The toolbar buttons of the package `name` of a state with no tasks, expanded: Focus, Start trace, Collapse folder, the "…". */
export const groupedToolbarLabelsOf = (state: GraphReady, name: string): string[] => {
  const pkg = state.packages.find((candidate): boolean => candidate.name === name);

  if (pkg === undefined) throw new Error(`graph e2e: the state has no package '${name}'`);

  const folder = folderTitleOf(folderOf(pkg.path));

  return [focusLabelOf(name), 'Start trace', folderToggleLabelOf(folder, false), packageActionsLabelOf(name)];
};
