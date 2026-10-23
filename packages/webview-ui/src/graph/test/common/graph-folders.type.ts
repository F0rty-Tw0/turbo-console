import type { Mock } from 'vitest';

import type { GraphFoldersDeps } from '../../common/graph-folders.type.ts';
import type { DrawnGraph, GraphView } from '../../common/graph-page.type.ts';

/* eslint-disable local/readonly-type-properties -- a spec sets the world between steps */

/** What the deps of a `GraphFolders` under test answer at call time; a spec changes it between steps. */
export type FoldersWorld = {
  clock: number;
  drawn: DrawnGraph | null;
  isGrouped: boolean;
  canAct: boolean;
  ghosts: string[];
  visible: ReadonlySet<string>;
};

/* eslint-enable local/readonly-type-properties */

/** The deps of a `GraphFolders` under test, the world they read and the spies behind them. */
export type FoldersRig = {
  readonly deps: GraphFoldersDeps;
  readonly world: FoldersWorld;
  readonly showFolders: Mock<GraphView['showFolders']>;
  readonly repaint: Mock<GraphFoldersDeps['repaint']>;
  readonly onCollapsed: Mock<GraphFoldersDeps['onCollapsed']>;
  readonly onChange: Mock<GraphFoldersDeps['onChange']>;
  readonly onRedrawn: Mock<GraphFoldersDeps['onRedrawn']>;
};
