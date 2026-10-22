import type { InspectionFolders } from '../common/graph-inspection.type.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { TraceResult } from '../common/trace.type.ts';
import { collapsedInspectionOf, foldersToExpandOf } from '../utils/folder-inspection.util.ts';

/** How an inspection meets the collapsed folders: it reaches into the ones holding its packages, and a collapse can swallow it. */
export class GraphInspectionFolders {
  private readonly folders: InspectionFolders;

  public constructor(folders: InspectionFolders) {
    this.folders = folders;
  }

  /** Expands every collapsed folder holding a package of `next`, ghosts of its trace included; nothing to expand calls nothing. */
  public reach(next: Inspection, trace: TraceResult | null): void {
    const scene = this.folders.scene();

    if (scene === null) return;

    const folders = foldersToExpandOf(next, trace, scene);

    if (folders.length > 0) this.folders.expand(folders);
  }

  /** The folder inspection a collapse of `folder` turns `current` into; `null` when `current` stays. */
  public afterCollapse(current: Inspection, folder: string): Inspection | null {
    const scene = this.folders.scene();

    if (scene === null) return null;

    const next = collapsedInspectionOf(current, folder, scene);

    return next === current ? null : next;
  }
}
