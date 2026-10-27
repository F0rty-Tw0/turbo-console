import type { GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';

const WIDE_FOLDER = 'a-folder-name-far-wider-than-its-two-packages';

const WIDE_PACKAGES: GraphPackage[] = [packageOf('x', `${WIDE_FOLDER}/x`), packageOf('y', `${WIDE_FOLDER}/y`)];

/** One folder whose title is far wider than its box of two small packages, laid out by ELK. */
export const WIDE_TITLE_STUB: GraphReady = {
  kind: 'graph',
  singlePackage: false,
  rootLabel: null,
  hash: 'e1d2c3b4',
  packages: WIDE_PACKAGES,
  edges: [],
  positions: null,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};
