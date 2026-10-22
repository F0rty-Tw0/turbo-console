import type { FolderScene } from './folder-scene.type.ts';
import type { DrawnGraph, GraphView, TextMeasure } from './graph-page.type.ts';

export type GraphFoldersDeps = {
  readonly view: Pick<GraphView, 'showFolders'>;
  /** Paints the shown inspection again with `scene` (`InspectionCanvas.repaint`). */
  readonly repaint: (scene: FolderScene | null) => void;
  readonly drawn: () => DrawnGraph | null;
  /** The package names the controls leave visible. */
  readonly visible: () => ReadonlySet<string>;
  /** The trace's hidden path packages drawn as ghosts. */
  readonly ghosts: () => string[];
  /** The mode on screen is grouped. */
  readonly isGrouped: () => boolean;
  /** The checkbox's mode and the mode on screen are both grouped, so a folder action may act. */
  readonly canAct: () => boolean;
  readonly measure: TextMeasure;
  readonly now: () => number;
  /** After a folder was collapsed. */
  readonly onCollapsed: (folder: string) => void;
  /** After a toggle or an expand drew the folders again: the collapsed set changed. */
  readonly onChange: () => void;
};
