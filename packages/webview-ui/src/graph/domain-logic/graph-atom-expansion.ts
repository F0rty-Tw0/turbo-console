import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomGroup } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomGroupsDeps, AtomPlacement } from '../common/graph-atom.type.ts';
import { atomPositionsOf } from '../utils/atom-positions.util.ts';
import { atomSpecOf, outcomesOf } from '../utils/atom-spec.util.ts';

type Outcomes = Record<string, GraphAtomOutcome>;

type Drawn = { readonly key: string; readonly pkgBoxId: string };

const keyOf = (spec: AtomDrawSpec): string => JSON.stringify([spec.files, spec.hidden]);

const keyOfMaybe = (spec: AtomDrawSpec | undefined): string | null => {
  if (spec === undefined) return null;

  return keyOf(spec);
};

/**
 * The umbrellas open on the canvas and the groups drawn for them. `apply` makes the canvas match: a group that closed,
 * left the layout or got other drawn files or another hidden count is collapsed, one newly open is drawn (or closed
 * again if the canvas refuses it), and every position is set from the base.
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
    const specs = this.drawableSpecs(groups, outcomes, placement);
    const collapsed = this.collapseStale(specs);
    const isFresh = (spec: AtomDrawSpec): boolean => this.open.has(spec.umbrellaId) && !this.drawn.has(spec.umbrellaId);
    const specValues = specs.values();
    const specList = [...specValues];
    const fresh = specList.filter(isFresh);
    const hasDrawn = this.drawFresh(fresh, outcomes, placement);

    if (hasDrawn || collapsed) {
      const { positions } = atomPositionsOf(placement.base, specList, this.open);

      this.view.atoms.setPositions(positions);
    }

    if (hasDrawn) this.view.tasks.remark();

    this.view.atoms.setGrabbable(this.open.size === 0);
  }

  /** The specs of the groups the layout can draw; an open group it cannot is no longer open. */
  private drawableSpecs(
    groups: ReadonlyMap<string, GraphAtomGroup>,
    outcomes: ReadonlyMap<string, Outcomes>,
    placement: AtomPlacement
  ): Map<string, AtomDrawSpec> {
    const specs = new Map<string, AtomDrawSpec>();

    for (const group of groups.values()) {
      const spec = atomSpecOf(group, placement, outcomesOf(outcomes, group.umbrellaId));

      if (spec !== null) specs.set(spec.umbrellaId, spec);
    }

    const isGone = (umbrellaId: string): boolean => !specs.has(umbrellaId);
    const openIds = [...this.open];
    const gone = openIds.filter(isGone);

    for (const umbrellaId of gone) this.open.delete(umbrellaId);

    return specs;
  }

  /** Collapses each drawn group that is closed, gone, or has other drawn files or another hidden count; whether any was. */
  private collapseStale(specs: ReadonlyMap<string, AtomDrawSpec>): boolean {
    let hasCollapsed = false;

    for (const [umbrellaId, drawn] of [...this.drawn]) {
      const spec = specs.get(umbrellaId);
      const isOpen = this.open.has(umbrellaId);
      const key = keyOfMaybe(spec);
      const isCurrent = isOpen && key === drawn.key;

      if (isCurrent) continue;

      this.view.atoms.collapse(umbrellaId, drawn.pkgBoxId);
      this.drawn.delete(umbrellaId);
      hasCollapsed = true;
    }

    return hasCollapsed;
  }

  /** Draws each newly open group; one the canvas refuses is closed again, so it moves no node and keeps grabbing. Whether any was drawn. */
  private drawFresh(fresh: AtomDrawSpec[], outcomes: ReadonlyMap<string, Outcomes>, placement: AtomPlacement): boolean {
    let hasDrawn = false;

    for (const spec of fresh) {
      const isDrawn = this.draw(spec, outcomes, placement);

      if (isDrawn) hasDrawn = true;
      else this.open.delete(spec.umbrellaId);
    }

    return hasDrawn;
  }

  /** Expands the group and records it as drawn; whether the canvas drew it. */
  private draw(spec: AtomDrawSpec, outcomes: ReadonlyMap<string, Outcomes>, placement: AtomPlacement): boolean {
    const pkgBoxId = placement.pkgBoxes.get(spec.umbrellaId);

    if (pkgBoxId === undefined) return false;

    const fileOutcomes = outcomesOf(outcomes, spec.umbrellaId);
    const isDrawn = this.view.atoms.expand(spec, pkgBoxId, fileOutcomes);

    if (isDrawn) this.drawn.set(spec.umbrellaId, { key: keyOf(spec), pkgBoxId });

    return isDrawn;
  }
}
