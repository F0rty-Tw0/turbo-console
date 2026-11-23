import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { fallbackLinksOf } from '../utils/fallback-links.util.ts';
import { fallbackRowsOf } from '../utils/fallback-rows.util.ts';
import { cellPitchOf } from '../utils/grid-layout.util.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** A cell's centre on the unit grid Cytoscape's headless `breadthfirst` returns: a 1 px viewport centred on 0.5. */
const unitOffsetOf = (place: number, length: number): number => 0.5 + (place + 1 - (length + 1) / 2);

/**
 * The layout for when ELK is skipped or fails, dependents above their dependencies: Cytoscape's `breadthfirst` rows
 * (see `fallbackRowsOf`) on a unit grid, scaled to the widest node and to `FALLBACK_SPACING_FACTOR` node heights per
 * row. Plain arrays give the same positions as a headless Cytoscape without building one.
 */
export const breadthfirstPositions = (graph: ElkNode): Positions => {
  const children = graph.children ?? [];
  const pitch = cellPitchOf(children);
  const links = fallbackLinksOf(graph);
  const rows = fallbackRowsOf(links);
  const cells: Position[] = children.map((): Position => ORIGIN);

  rows.forEach((row: number[], depth: number): void => {
    const y = unitOffsetOf(depth, rows.length) * pitch.y;

    row.forEach((node: number, place: number): void => {
      const x = unitOffsetOf(place, row.length) * pitch.x;

      cells[node] = { x, y };
    });
  });

  const entryOf = (child: ElkNode, index: number): [string, Position] => [child.id, cells[index] ?? ORIGIN];
  const entries = children.map(entryOf);

  return Object.fromEntries(entries);
};
