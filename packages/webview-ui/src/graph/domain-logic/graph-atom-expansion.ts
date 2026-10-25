import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import type { AtomGroupsDeps, AtomPlacement } from '../common/graph-atom.type.ts';
import { atomPositionsOf } from '../utils/atom-positions.util.ts';
import { atomSpecOf } from '../utils/atom-spec.util.ts';

type Outcomes = Record<string, GraphAtomOutcome>;

type Drawn = { readonly key: string; readonly pkgBoxId: string };

const keyOf = (group: GraphAtomGroup): string => JSON.stringify(group.files);

const keyOfMaybe = (group: GraphAtomGroup | undefined): string | null => {
  if (group === undefined) return null;

  return keyOf(group);
};

/**
 * The umbrellas open on the canvas and the groups drawn for them. `apply` makes the canvas match: a group that closed,
 * left the layout or got another file list is collapsed, one newly open is drawn, and every position is set from the base.
 */
export class GraphAtomExpansion {
  private readonly view: AtomGroupsDeps['view'];
  private readonly open = new Set<string>();
  private readonly drawn = new Map<string, Drawn>();

  public constructor(view: AtomGroupsDeps['view']) {
    this.view = view;
  }

  public flip(umbrellaId: string): void {
    const isOpen = this.open.has(umbrellaId);

    if (isOpen) this.open.delete(umbrellaId);
    else this.open.add(umbrellaId);
  }

  /** The canvas was emptied under the drawn groups: they are no longer there to collapse. */
  public forget(): void {
    this.drawn.clear();
  }

  /** Collapses every drawn group and lets the canvas grab again. */
  public release(): void {
    for (const [umbrellaId, { pkgBoxId }] of this.drawn) this.view.atoms.collapse(umbrellaId, pkgBoxId);

    this.drawn.clear();
    this.open.clear();
    this.view.atoms.setGrabbable(true);
  }

  /** Draws the outcomes of the groups on screen; the others are drawn with theirs when they open. */
  public outcomes(byUmbrella: ReadonlyMap<string, Outcomes>): void {
    const keys = this.drawn.keys();
    const drawnIds = [...keys];

    if (drawnIds.length === 0) return;

    const merged: Outcomes = {};

    for (const umbrellaId of drawnIds) Object.assign(merged, byUmbrella.get(umbrellaId));

    this.view.atoms.setOutcomes(merged);
  }

  public apply(groups: ReadonlyMap<string, GraphAtomGroup>, outcomes: ReadonlyMap<string, Outcomes>, placement: AtomPlacement): void {
    const specs = this.drawableSpecs(groups, placement);
    const collapsed = this.collapseStale(groups);
    const isFresh = (spec: AtomBoxSpec): boolean => this.open.has(spec.umbrellaId) && !this.drawn.has(spec.umbrellaId);
    const fresh = specs.filter(isFresh);

    for (const spec of fresh) this.draw(spec, groups, outcomes, placement);

    if (this.open.size > 0 || collapsed) {
      const { positions } = atomPositionsOf(placement.base, specs, this.open);

      this.view.atoms.setPositions(positions);
    }

    if (fresh.length > 0) this.view.tasks.remark();

    this.view.atoms.setGrabbable(this.open.size === 0);
  }

  /** The specs of the groups the layout can draw; an open group it cannot is no longer open. */
  private drawableSpecs(groups: ReadonlyMap<string, GraphAtomGroup>, placement: AtomPlacement): AtomBoxSpec[] {
    const specs: AtomBoxSpec[] = [];

    for (const group of groups.values()) {
      const spec = atomSpecOf(group, placement);

      if (spec !== null) specs.push(spec);
    }

    const ids = new Set(specs.map((spec) => spec.umbrellaId));
    const isGone = (umbrellaId: string): boolean => !ids.has(umbrellaId);
    const openIds = [...this.open];
    const gone = openIds.filter(isGone);

    for (const umbrellaId of gone) this.open.delete(umbrellaId);

    return specs;
  }

  /** Collapses each drawn group that is closed, gone, or has another file list; whether any was. */
  private collapseStale(groups: ReadonlyMap<string, GraphAtomGroup>): boolean {
    let hasCollapsed = false;

    for (const [umbrellaId, drawn] of [...this.drawn]) {
      const group = groups.get(umbrellaId);
      const isOpen = this.open.has(umbrellaId);
      const key = keyOfMaybe(group);
      const isCurrent = isOpen && key === drawn.key;

      if (isCurrent) continue;

      this.view.atoms.collapse(umbrellaId, drawn.pkgBoxId);
      this.drawn.delete(umbrellaId);
      hasCollapsed = true;
    }

    return hasCollapsed;
  }

  private draw(
    spec: AtomBoxSpec,
    groups: ReadonlyMap<string, GraphAtomGroup>,
    outcomes: ReadonlyMap<string, Outcomes>,
    placement: AtomPlacement
  ): void {
    const group = groups.get(spec.umbrellaId);
    const pkgBoxId = placement.pkgBoxes.get(spec.umbrellaId);

    if (group === undefined || pkgBoxId === undefined) return;

    this.view.atoms.expand(spec, pkgBoxId, group.files, outcomes.get(spec.umbrellaId) ?? {});
    this.drawn.set(spec.umbrellaId, { key: keyOf(group), pkgBoxId });
  }
}
