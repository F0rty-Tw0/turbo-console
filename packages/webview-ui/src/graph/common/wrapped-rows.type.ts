import type { Position } from '../../bridge/common/graph-state.type.ts';

/** A node id and its cell: column across, depth down. */
export type Cell = readonly [id: string, cell: Position];
