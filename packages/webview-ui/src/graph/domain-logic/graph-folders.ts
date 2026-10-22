import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GraphFoldersDeps } from '../common/graph-folders.type.ts';
import type { TextMeasure } from '../common/graph-page.type.ts';
import { collapsedLabelOf } from '../utils/collapsed-label.util.ts';
import { folderTitleOf } from '../utils/controls-text.util.ts';
import { folderSceneOf } from '../utils/folder-scene.util.ts';

type LabelOf = (folder: string) => string;

const labelsOf = (scene: FolderScene | null, measure: TextMeasure): LabelOf => {
  const labelOf = (folder: string): string => {
    const count = scene?.members.get(folder)?.length ?? 0;

    return collapsedLabelOf(folderTitleOf(folder), count, measure);
  };

  return labelOf;
};

/**
 * The collapsed folders of the grouped drawing and the folder pass that shows them. Collapse is display only: no
 * position and no camera changes. `toggleMs` times a toggle from the call to the first frame drawn after it.
 */
export class GraphFolders {
  private readonly deps: GraphFoldersDeps;
  private readonly collapsedSet = new Set<string>();
  private toggleStart: number | null = null;
  private measured: number | null = null;

  public constructor(deps: GraphFoldersDeps) {
    this.deps = deps;
  }

  public collapsed(): ReadonlySet<string> {
    return this.collapsedSet;
  }

  /** What the folder pass draws; `null` while no graph is drawn or the drawing is flat. */
  public scene(): FolderScene | null {
    const { drawn, visible, ghosts } = this.deps;
    const graph = drawn();
    const isGrouped = this.deps.isGrouped();

    if (graph === null || !isGrouped) return null;

    const ghostSet = new Set(ghosts());

    return folderSceneOf(graph.infos, graph.edges, this.collapsedSet, visible(), ghostSet);
  }

  /** Collapses or expands a folder of the drawn graph; ignored while a mode switch waits or for an unknown folder. */
  public toggle(folder: string): void {
    const scene = this.scene();
    const isKnown = scene?.members.has(folder) ?? false;
    const canAct = this.deps.canAct();

    if (!canAct || !isKnown) return;

    const isCollapsed = this.collapsedSet.has(folder);
    const isCollapse = !isCollapsed;

    this.toggleStart = this.deps.now();
    this.measured = null;

    if (isCollapse) this.collapsedSet.add(folder);
    else this.collapsedSet.delete(folder);

    this.redraw();

    if (isCollapse) this.deps.onCollapsed(folder);
  }

  /** Expands each of `folders` that is collapsed, then redraws once. */
  public expand(folders: Iterable<string>): void {
    for (const folder of folders) this.collapsedSet.delete(folder);

    this.redraw();
  }

  /** Repaints the inspection with the new scene, then runs the folder pass. */
  public redraw(): void {
    const scene = this.scene();

    this.deps.repaint(scene);
    this.pass(scene);
  }

  /** The folder pass alone, for a canvas that already painted with `scene()` (after its ghosts were drawn). */
  public show(): void {
    const scene = this.scene();

    this.pass(scene);
  }

  /** A frame was drawn: the first one after a toggle ends its timing. */
  public rendered(): void {
    const start = this.toggleStart;

    if (start === null) return;

    this.measured = this.deps.now() - start;
    this.toggleStart = null;
  }

  /** From the latest toggle to the first frame drawn after it; `null` until that frame. */
  public toggleMs(): number | null {
    return this.measured;
  }

  private pass(scene: FolderScene | null): void {
    const labelOf = labelsOf(scene, this.deps.measure);

    this.deps.view.showFolders(scene, labelOf);
  }
}
