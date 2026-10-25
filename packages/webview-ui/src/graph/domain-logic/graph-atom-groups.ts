import type { GraphAtomGroupState } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomGroupsDeps } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';

/** The last placed task layout an Atomizer group is read against: the umbrellas shown, their base centres and sizes. */
type Placement = {
  readonly shown: ReadonlySet<string>;
  readonly base: Positions;
  readonly sizes: ReadonlyMap<string, NodeSize>;
};

/**
 * The Atomizer groups of the task graph: the host's groups by umbrella id, the counts line each umbrella shows, and the
 * umbrellas the last placed layout shows, which it reports to the host as `shownUmbrellas` so their loads arrive. An `atoms`
 * message for an umbrella no group names is ignored.
 */
export class GraphAtomGroups {
  private readonly deps: AtomGroupsDeps;
  private groups = new Map<string, GraphAtomGroup>();
  private counts = new Map<string, string>();
  private placement: Placement | null = null;

  public constructor(deps: AtomGroupsDeps) {
    this.deps = deps;
  }

  /** Keeps the state's groups by umbrella id; the counts of an umbrella no group names are forgotten. */
  public received(groups: GraphAtomGroup[]): void {
    const entryOf = (group: GraphAtomGroup): [string, GraphAtomGroup] => [group.umbrellaId, group];
    const entries = groups.map(entryOf);
    const known = new Map(entries);
    const isKnown = ([id]: [string, string]): boolean => known.has(id);
    const countEntries = [...this.counts];
    const keptCounts = countEntries.filter(isKnown);

    this.groups = known;
    this.counts = new Map(keptCounts);
  }

  /** Keeps the counts of the known umbrellas in `groups`, then writes them to the canvas when a layout is placed. */
  public states(groups: Record<string, GraphAtomGroupState>): void {
    const isKnown = ([id]: [string, GraphAtomGroupState]): boolean => this.groups.has(id);
    const entries = Object.entries(groups);
    const knownEntries = entries.filter(isKnown);

    for (const [id, state] of knownEntries) this.counts.set(id, state.counts);

    if (this.placement !== null) this.deps.view.tasks.setCounts(this.labels());
  }

  /** The file count of each umbrella. */
  public fileCounts(): ReadonlyMap<string, number> {
    const countOf = ([id, group]: [string, GraphAtomGroup]): [string, number] => [id, group.files.length];
    const groupEntries = [...this.groups];
    const entries = groupEntries.map(countOf);

    return new Map(entries);
  }

  /** The counts line of each umbrella: the host's, or `<n> files` while it has sent none. */
  public labels(): ReadonlyMap<string, string> {
    const labelOf = ([id, group]: [string, GraphAtomGroup]): [string, string] => {
      const fallback = `${group.files.length} files`;

      return [id, this.counts.get(id) ?? fallback];
    };
    const groupEntries = [...this.groups];
    const entries = groupEntries.map(labelOf);

    return new Map(entries);
  }

  /** Keeps the layout just placed and reports its umbrellas to the host. */
  public placed(shown: ReadonlySet<string>, base: Positions, sizes: ReadonlyMap<string, NodeSize>): void {
    this.placement = { shown, base, sizes };
    this.reshown();
  }

  /** Reports the last placement's umbrellas again; nothing before a placement or with no umbrella shown. */
  public reshown(): void {
    if (this.placement === null) return;

    const isUmbrella = (id: string): boolean => this.groups.has(id);
    const shownIds = [...this.placement.shown];
    const umbrellas = shownIds.filter(isUmbrella);

    if (umbrellas.length === 0) return;

    const ids = umbrellas.sort();

    this.deps.bridge.post({ type: 'shownUmbrellas', ids });
  }

  /** The task layout is gone: no placement, so nothing is written to the canvas or reported. */
  public clear(): void {
    this.placement = null;
  }
}
