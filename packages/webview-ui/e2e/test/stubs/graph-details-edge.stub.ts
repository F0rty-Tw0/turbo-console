import type { GraphEdge, GraphPackage, GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { PositionRow } from '../../common/graph.type.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';
import { positionsOf } from '../utils/graph-positions.spec.util.ts';

const PROTO_PACKAGES: GraphPackage[] = [
  packageOf('__proto__', 'packages/__proto__', [], 1),
  packageOf('constructor', 'packages/constructor', ['__proto__'], 2),
  packageOf('plain', 'apps/plain', [], 0)
];

const PROTO_EDGES: GraphEdge[] = [
  { source: '__proto__', target: 'constructor' },
  { source: 'constructor', target: 'plain' }
];

const PROTO_ROWS: PositionRow[] = [
  ['__proto__', 0, 0],
  ['constructor', 0, 150],
  ['plain', 0, 300]
];

const PROTO_POSITIONS: Positions = positionsOf(PROTO_ROWS);

/** Packages, a tag and link ends named like `Object` members, cached; own keys even for `__proto__`. */
export const PROTO_DETAILS_STUB: GraphReady = {
  kind: 'graph',
  hash: 'f2f2f2f2',
  packages: PROTO_PACKAGES,
  edges: PROTO_EDGES,
  positions: PROTO_POSITIONS
};

const LONG_NAME = 'a-very-long-package-name-that-keeps-going-and-going-and-going';

const LONG_SEGMENTS = 12;

const segmentOf = (index: number): string => `segment-${String(index + 1).padStart(2, '0')}`;

const LONG_NESTING = Array.from({ length: LONG_SEGMENTS }, (_, index): string => segmentOf(index));

const LONG_PARTS: string[] = ['packages', ...LONG_NESTING];

const LONG_PATH = LONG_PARTS.join('/');

const LONG_PACKAGES: GraphPackage[] = [
  packageOf(LONG_NAME, LONG_PATH, ['a-very-long-tag-name-for-one-badge'], 1),
  packageOf('plain', 'apps/plain', [], 0)
];

const LONG_EDGES: GraphEdge[] = [{ source: LONG_NAME, target: 'plain' }];

const LONG_ROWS: PositionRow[] = [
  [LONG_NAME, 0, 0],
  ['plain', 0, 150]
];

const LONG_POSITIONS: Positions = positionsOf(LONG_ROWS);

/** A package whose name, path and tag are each far wider than the panel. */
export const LONG_PATH_STUB: GraphReady = {
  kind: 'graph',
  hash: '1e9a0001',
  packages: LONG_PACKAGES,
  edges: LONG_EDGES,
  positions: LONG_POSITIONS
};
