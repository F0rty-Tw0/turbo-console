import type { GraphEdge, GraphPackage, Position, Positions } from '../../../bridge/common/graph-state.type.ts';
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

const at = (x: number, y: number): Position => {
  const position: Position = { x, y };

  return position;
};

/** `apps` on the top row, `packages` 300 px below; every package 120 px from its neighbour. */
export const BOARDS_POSITIONS_STUB: Positions = {
  docs: at(0, 0),
  web: at(120, 0),
  '@acme/config': at(0, 300),
  '@acme/ui': at(120, 300),
  '@acme/utils': at(240, 300)
};

/** Folder `__proto__` holds package `constructor`, which depends on `x` in folder `libs`. */
export const PROTO_GROUPS_STUB: FolderGroup[] = [
  { folder: '__proto__', packages: [packageOf('constructor', '__proto__/constructor')] },
  { folder: 'libs', packages: [packageOf('x', 'libs/x')] }
];

export const PROTO_EDGES_STUB: GraphEdge[] = [{ source: 'constructor', target: 'x' }];

export const PROTO_POSITIONS_STUB: Positions = { constructor: at(10, 20), x: at(200, 20) };
