import type { EdgeStates, NodeStates } from './graph.type.ts';
import type { Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import type { ProbeFolder, ProbeFolderLink } from '../../src/graph/common/graph-probe.type.ts';

/** What the e2e tests compare of a folder: its key, whether it is collapsed or shown, and its package names. */
export type FolderFacts = Pick<ProbeFolder, 'folder' | 'isCollapsed' | 'isVisible' | 'packages'>;

/** What the e2e tests compare of a folder link. */
export type FolderLinkFacts = Pick<ProbeFolderLink, 'source' | 'target' | 'count'>;

/** The state of each folder by key, and of each drawn folder link by `source>target`. */
export type FolderPaint = {
  readonly folders: NodeStates;
  readonly links: EdgeStates;
};

/** The saved selection, link or trace a paint row opens with. */
type SavedInspection = Partial<Pick<GraphViewState, 'selected' | 'link' | 'trace'>>;

/** One paint case: the saved inspection, the folders collapsed, and the states the probe must report. */
export type FolderPaintRow = {
  readonly name: string;
  readonly saved: SavedInspection;
  readonly collapsed: string[];
  readonly paint: FolderPaint;
};

/** What the probe says of a package inside a folder. */
export type PackageFlags = Pick<ProbeFolder, 'isVisible' | 'isCollapsed'>;

/** A box dragged by `(dx, dy)` screen pixels at `zoom`, and where every package stood before. */
export type BoxDragRecord = {
  readonly before: Positions;
  readonly dx: number;
  readonly dy: number;
  readonly zoom: number;
};
