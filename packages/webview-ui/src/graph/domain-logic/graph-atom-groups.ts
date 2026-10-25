import { GraphAtomExpansion } from './graph-atom-expansion.ts';
import { GraphAtomTiming } from './graph-atom-timing.ts';
import type { GraphAtomGroupState, GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup, GraphTask, Positions } from '../../bridge/common/graph-state.type.ts';
import { ATOM_BOX_PREFIX } from '../common/graph-atom.const.ts';
import type { AtomGroupsDeps, AtomPlacement } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { atomSpecOf } from '../utils/atom-spec.util.ts';
import { taskBoxIdOf } from '../utils/elk-task-graph.util.ts';

const pkgBoxEntryOf = (task: GraphTask): [string, string] => [task.id, taskBoxIdOf(task.packageName)];

/** The umbrella id behind an `atom:` box id; any other id as it is. */
const umbrellaOfBox = (nodeId: string): string => {
  const isBox = nodeId.startsWith(ATOM_BOX_PREFIX);

  if (!isBox) return nodeId;

  return nodeId.slice(ATOM_BOX_PREFIX.length);
};

/**
 * The Atomizer groups of the task graph: the host's groups by umbrella id, the counts line and file outcomes of each, the
 * umbrellas the last placed layout shows, which it reports to the host as `shownUmbrellas` so their loads arrive, and
 * which of them are expanded into their files. An `atoms` message for an umbrella no group names is ignored.
 */
export class GraphAtomGroups {
  private readonly deps: AtomGroupsDeps;
  private groups = new Map<string, GraphAtomGroup>();
  private counts = new Map<string, string>();
  private outcomes = new Map<string, Record<string, GraphAtomOutcome>>();
  private placement: AtomPlacement | null = null;
  private readonly expansion: GraphAtomExpansion;
  private readonly timing: GraphAtomTiming;

  public constructor(deps: AtomGroupsDeps) {
    this.deps = deps;
    this.expansion = new GraphAtomExpansion(deps.view);
    this.timing = new GraphAtomTiming(deps.now);
  }

  /**
   * Keeps the state's groups by umbrella id; the counts and outcomes of an umbrella no group names are forgotten. While a
   * layout is kept, the expanded groups follow: one that left collapses, one with another file list is drawn again.
   */
  public received(groups: GraphAtomGroup[]): void {
    const entryOf = (group: GraphAtomGroup): [string, GraphAtomGroup] => [group.umbrellaId, group];
    const entries = groups.map(entryOf);
    const known = new Map(entries);
    const isKnown = ([id]: [string, unknown]): boolean => known.has(id);
    const countEntries = [...this.counts];
    const outcomeEntries = [...this.outcomes];
    const keptCounts = countEntries.filter(isKnown);
    const keptOutcomes = outcomeEntries.filter(isKnown);

    this.groups = known;
    this.counts = new Map(keptCounts);
    this.outcomes = new Map(keptOutcomes);
    this.sync();
  }

  /**
   * Keeps the counts and file outcomes of the known umbrellas in `groups`, then writes the counts of the placed umbrellas
   * and the outcomes of the expanded ones to the canvas.
   */
  public states(groups: Record<string, GraphAtomGroupState>): void {
    const isKnown = ([id]: [string, GraphAtomGroupState]): boolean => this.groups.has(id);
    const entries = Object.entries(groups);
    const knownEntries = entries.filter(isKnown);

    for (const [id, state] of knownEntries) {
      this.counts.set(id, state.counts);
      this.outcomes.set(id, state.files);
    }

    if (this.placement === null) return;

    this.deps.view.tasks.setCounts(this.drawnLabels(this.placement));
    this.expansion.outcomes(this.outcomes);
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

  /** The counts line of each umbrella the placed layout draws as one; a plain-sized task keeps its name. */
  private drawnLabels(placement: AtomPlacement): ReadonlyMap<string, string> {
    const isDrawn = ([id]: [string, string]): boolean => placement.sizes.has(id);
    const labels = this.labels();
    const labelEntries = [...labels];
    const drawn = labelEntries.filter(isDrawn);

    return new Map(drawn);
  }

  /**
   * Keeps the layout just placed, whose canvas was drawn collapsed, and reports its umbrellas to the host. A group still
   * shown stays expanded, drawn again on the new base; one no longer shown is dropped.
   */
  public placed(shown: ReadonlySet<string>, base: Positions, sizes: ReadonlyMap<string, NodeSize>, tasks: GraphTask[]): void {
    const pkgBoxes = new Map(tasks.map(pkgBoxEntryOf));

    this.placement = { shown, base, sizes, pkgBoxes };
    this.expansion.forget();
    this.reshown();
    this.sync();
  }

  /** Keeps the dragged centres as the base the groups expand from; groups are collapsed while a drag can happen. */
  public rebased(base: Positions): void {
    if (this.placement !== null) this.placement = { ...this.placement, base };
  }

  /** Expands or collapses the group the node is the umbrella, the box or a file of; any other node changes nothing. */
  public toggle(nodeId: string): void {
    const umbrellaId = this.groupOf(nodeId);

    if (umbrellaId === null) return;

    const isDrawable = this.isDrawable(umbrellaId);

    if (!isDrawable) return;

    this.timing.start();
    this.expansion.flip(umbrellaId);
    this.sync();
  }

  /** A frame was drawn: the first one after a toggle ends its timing. */
  public rendered(): void {
    this.timing.rendered();
  }

  /** From the latest toggle to the first frame drawn after it; `null` until that frame. */
  public toggleMs(): number | null {
    return this.timing.ms();
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

  /** The task layout is gone: every group collapses and grabbing returns; no placement, so nothing is written or reported. */
  public clear(): void {
    this.placement = null;
    this.expansion.release();
  }

  /**
   * The umbrella id of the group a node belongs to: the umbrella itself, its `atom:` box or one of its files. A task that
   * merely shares the id of a box or file belongs to none.
   */
  private groupOf(nodeId: string): string | null {
    const isUmbrella = this.groups.has(nodeId);

    if (isUmbrella) return nodeId;

    const isAtomNode = this.deps.view.atoms.isAtomNode(nodeId);

    if (!isAtomNode) return null;

    const umbrellaId = umbrellaOfBox(nodeId);
    const isBox = this.groups.has(umbrellaId);

    if (isBox) return umbrellaId;

    const hasFile = (group: GraphAtomGroup): boolean => group.files.some((file) => file.id === nodeId);
    const values = this.groups.values();
    const all = [...values];
    const owner = all.find(hasFile);

    return owner?.umbrellaId ?? null;
  }

  /** Whether the kept layout shows the umbrella as one with files to expand into. */
  private isDrawable(umbrellaId: string): boolean {
    const group = this.groups.get(umbrellaId);
    const { placement } = this;

    if (group === undefined || placement === null) return false;

    return atomSpecOf(group, placement) !== null;
  }

  /** Makes the canvas match the expanded set against the kept layout; nothing before a layout is placed. */
  private sync(): void {
    if (this.placement !== null) this.expansion.apply(this.groups, this.outcomes, this.placement);
  }
}
