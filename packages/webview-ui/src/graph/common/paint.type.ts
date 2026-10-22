import type { FolderLink } from './folder-scene.type.ts';
import type { ProbeState } from './graph-probe.type.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

/** How the canvas paints each package, link, folder box, collapsed folder and folder link, by one of the four state classes. */
export type Paint = {
  readonly nodeState: (name: string) => ProbeState;
  readonly edgeState: (edge: GraphEdge) => ProbeState;
  readonly boxState: (folder: string) => ProbeState;
  readonly collapsedState: (folder: string) => ProbeState;
  readonly folderLinkState: (link: FolderLink) => ProbeState;
};

/** The folder half of a `Paint`. */
export type FolderPaint = Pick<Paint, 'boxState' | 'collapsedState' | 'folderLinkState'>;
