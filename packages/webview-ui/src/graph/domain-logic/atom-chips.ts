import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import { atomCountsText } from '../../bridge/utils/atom-counts-text.util.ts';
import type { AtomChipRow, AtomChipsDeps } from '../common/atom-chips.type.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import { chipRowTransformOf } from '../utils/atom-chip-transform.util.ts';

/**
 * The count chip row of each drawn umbrella, in the widgets layer over the node's counts band: built from its counts,
 * rebuilt only when their text changes, and placed from the node's model box and the camera, writing only what changed.
 */
export class AtomChips {
  private readonly deps: AtomChipsDeps;
  private rows = new Map<string, AtomChipRow>();

  public constructor(deps: AtomChipsDeps) {
    this.deps = deps;
  }

  /** Keeps one row per umbrella in `drawn` and removes the others; a new row is placed at once, so none waits a frame at the layer's corner. */
  public sync(drawn: ReadonlyMap<string, GraphAtomCounts>): void {
    const isGone = ([id]: [string, AtomChipRow]): boolean => !drawn.has(id);
    const entries = [...this.rows];
    const gone = entries.filter(isGone);

    for (const [id, row] of gone) {
      row.element.remove();
      this.rows.delete(id);
    }

    for (const [id, counts] of drawn) this.syncRow(id, counts);

    this.place();
  }

  /** Moves each row over its umbrella's box at the current camera; a row whose umbrella is not drawn stays where it is. */
  public place(): void {
    const viewport = this.deps.view.viewport();
    const entries = [...this.rows];

    for (const [id, row] of entries) this.placeRow(id, row, viewport);
  }

  public clear(): void {
    for (const row of this.rows.values()) row.element.remove();

    this.rows = new Map();
  }

  private syncRow(id: string, counts: GraphAtomCounts): void {
    const text = atomCountsText(counts);
    const row = this.rows.get(id);

    if (row?.text === text) return;

    row?.element.remove();

    const element = this.deps.port.rowOf(counts);

    element.dataset['umbrella'] = id;
    this.deps.port.layer.prepend(element);
    this.rows.set(id, { element, text, transform: '', width: '' });
  }

  private placeRow(id: string, row: AtomChipRow, viewport: Viewport): void {
    const box = this.deps.view.atoms.boxOf(id);

    if (box === null) return;

    const transform = chipRowTransformOf(box.centre, box.width, viewport.pan, viewport.zoom);
    const width = `${String(box.width)}px`;
    const { style } = row.element;

    if (transform !== row.transform) style.transform = transform;

    if (width !== row.width) style.width = width;

    this.rows.set(id, { ...row, transform, width });
  }
}
