import { edgeIdOf } from './edge-id.util.ts';
import type { GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomPositions, BoxBounds } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';

const centreOf = (positions: Positions, id: string): Position | undefined =>
  Object.hasOwn(positions, id) ? positions[id] : undefined;

/**
 * The source end of a link out of an umbrella: with its `box` open, the box bottom under the umbrella centre, as an
 * offset from that centre; `null` (its border) while it is collapsed.
 */
const sourceEndOf = (source: Position, box: BoxBounds | undefined): string | null => {
  if (box === undefined) return null;

  return `0px ${box.y + box.height - source.y}px`;
};

/**
 * The source end of each link out of an umbrella the placement draws, by edge id, once `atoms` placed the nodes: a link
 * whose umbrella is open leaves its box's bottom under the umbrella, so its straight line runs past the files instead of
 * through them; `null` starts any other at its umbrella's border. A link with an end not placed is left out.
 */
export const umbrellaLinkEndsOf = (placement: AtomPlacement, atoms: AtomPositions): Map<string, string | null> => {
  const ends = new Map<string, string | null>();
  const isFromUmbrella = (link: GraphEdge): boolean => placement.sizes.has(link.source);
  const umbrellaLinks = placement.links.filter(isFromUmbrella);

  for (const link of umbrellaLinks) {
    const source = centreOf(atoms.positions, link.source);
    const target = centreOf(atoms.positions, link.target);

    if (source === undefined || target === undefined) continue;

    const boxId = `${ATOM_BOX_PREFIX}${link.source}`;
    const box = Object.hasOwn(atoms.boxes, boxId) ? atoms.boxes[boxId] : undefined;

    ends.set(edgeIdOf(link), sourceEndOf(source, box));
  }

  return ends;
};
