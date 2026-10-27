import { packageOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';

const EDGES: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'web', target: 'core' },
  { source: 'docs', target: 'ui' },
  { source: 'ui', target: 'core' },
  { source: 'core', target: 'utils' },
  { source: 'lint', target: 'core' },
  { source: 'build', target: 'utils' }
];

/** Seven packages in `apps`, `libs` and `tools`, with no cached positions: the shot lays them out with ELK, grouped. */
export const foldersShotState = (): GraphReady => {
  const state: GraphReady = {
    kind: 'graph',
    singlePackage: false,
    rootLabel: null,
    hash: '5407d001',
    packages: [
      packageOf('web', 'apps/web'),
      packageOf('docs', 'apps/docs'),
      packageOf('ui', 'libs/ui'),
      packageOf('core', 'libs/core'),
      packageOf('utils', 'libs/utils'),
      packageOf('lint', 'tools/lint'),
      packageOf('build', 'tools/build')
    ],
    edges: EDGES,
    positions: null,
    folderPositions: null,
    tasks: [],
    atomGroups: []
  };

  return state;
};
