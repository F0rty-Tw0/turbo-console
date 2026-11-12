import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';

/** The counts the host sent for each Atomizer umbrella, and the counts each group shows: the host's, or its file count. */
export class GraphAtomTally {
  private counts = new Map<string, GraphAtomCounts>();

  /** Keeps `counts` as the umbrella's latest. */
  public set(id: string, counts: GraphAtomCounts): void {
    this.counts.set(id, counts);
  }

  /** Forgets the counts of every umbrella `groups` does not name. */
  public keep(groups: ReadonlyMap<string, GraphAtomGroup>): void {
    const isKnown = ([id]: [string, GraphAtomCounts]): boolean => groups.has(id);
    const entries = [...this.counts];
    const kept = entries.filter(isKnown);

    this.counts = new Map(kept);
  }

  /** The counts of each group: the host's, or its file count with nothing settled while it has sent none. */
  public labelsOf(groups: ReadonlyMap<string, GraphAtomGroup>): ReadonlyMap<string, GraphAtomCounts> {
    const labelOf = ([id, group]: [string, GraphAtomGroup]): [string, GraphAtomCounts] => {
      const fallback: GraphAtomCounts = { files: group.files.length, cached: null, failed: null };

      return [id, this.counts.get(id) ?? fallback];
    };
    const groupEntries = [...groups];
    const entries = groupEntries.map(labelOf);

    return new Map(entries);
  }

  /** The counts of each group the placed layout draws as one umbrella; a plain-sized task keeps its name. */
  public drawnOf(groups: ReadonlyMap<string, GraphAtomGroup>, placement: AtomPlacement): ReadonlyMap<string, GraphAtomCounts> {
    const isDrawn = ([id]: [string, GraphAtomCounts]): boolean => placement.sizes.has(id);
    const labels = this.labelsOf(groups);
    const labelEntries = [...labels];
    const drawn = labelEntries.filter(isDrawn);

    return new Map(drawn);
  }
}
