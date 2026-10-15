/** The ids of the visible package-details panels, per root. A root with no visible panel has no entry. */
export class VisiblePanels {
  private readonly idsByRoot = new Map<string, Set<string>>();

  public set(root: string, panelId: string, visible: boolean): void {
    const ids = this.idsByRoot.get(root) ?? new Set<string>();

    if (visible) ids.add(panelId);
    else ids.delete(panelId);

    if (ids.size === 0) this.idsByRoot.delete(root);
    else this.idsByRoot.set(root, ids);
  }

  public has(root: string): boolean {
    const count = this.idsByRoot.get(root)?.size ?? 0;

    return count > 0;
  }

  /** Drops the entries of every root not in `kept`. */
  public keepOnly(kept: ReadonlySet<string>): void {
    for (const root of this.idsByRoot.keys()) {
      const isKept = kept.has(root);

      if (!isKept) this.idsByRoot.delete(root);
    }
  }
}
