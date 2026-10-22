import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

/** The package links between two drawn ends, merged; an end is a package name or `collapsedIdOf(folder)`. */
export type FolderLink = {
  readonly source: string;
  readonly target: string;
  readonly links: GraphEdge[];
};

/** What the folder pass draws, built from the graph and the collapse state. */
export type FolderScene = {
  readonly folderOf: ReadonlyMap<string, string>;
  /** Every package of each folder by name, in graph order, hidden ones included. */
  readonly members: ReadonlyMap<string, string[]>;
  readonly collapsed: ReadonlySet<string>;
  readonly visible: ReadonlySet<string>;
  readonly ghosts: ReadonlySet<string>;
  /** The folders with a visible package or a ghost. */
  readonly shown: ReadonlySet<string>;
  /** The visible links that touch a collapsed folder, merged per drawn pair. */
  readonly links: FolderLink[];
  /** Every package link, visible or not. */
  readonly edges: GraphEdge[];
};
