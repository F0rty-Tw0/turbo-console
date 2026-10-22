import type { GraphEdge, GraphPackage } from '../../../bridge/common/graph-state.type.ts';
import type { FolderGroup } from '../../common/folder-group.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';

const packageOf = (name: string, path: string): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return pkg;
};

/** The boards fixture: `apps` holds `docs` and `web`; `packages` holds `@acme/config`, `@acme/ui` and `@acme/utils`. */
export const BOARDS_GROUPS_STUB: FolderGroup[] = [
  { folder: 'apps', packages: [packageOf('docs', 'apps/docs'), packageOf('web', 'apps/web')] },
  {
    folder: 'packages',
    packages: [
      packageOf('@acme/config', 'packages/config'),
      packageOf('@acme/ui', 'packages/ui'),
      packageOf('@acme/utils', 'packages/utils')
    ]
  }
];

export const BOARDS_EDGES_STUB: GraphEdge[] = [
  { source: 'web', target: '@acme/ui' },
  { source: 'docs', target: '@acme/ui' },
  { source: 'docs', target: '@acme/utils' },
  { source: '@acme/ui', target: '@acme/utils' }
];

/** Every package is 100 by 32 px. */
export const BOARDS_SIZE_STUB: NodeSize = { width: 100, height: 32 };
