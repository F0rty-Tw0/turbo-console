import { vi } from 'vitest';

import type { GraphFoldersDeps } from '../../common/graph-folders.type.ts';
import type { DrawnGraph, GraphView } from '../../common/graph-page.type.ts';
import type { FoldersRig, FoldersWorld } from '../common/graph-folders.type.ts';
import { BOARDS_DRAWN, BOARDS_NAMES } from '../utils/folder-boards.spec.util.ts';

/** The boards graph drawn grouped with every package visible and no ghost, at clock 0; `measure` counts characters. */
export const foldersRigMock = (): FoldersRig => {
  const world: FoldersWorld = {
    clock: 0,
    drawn: BOARDS_DRAWN,
    isGrouped: true,
    canAct: true,
    ghosts: [],
    visible: new Set(BOARDS_NAMES)
  };
  const showFolders = vi.fn<GraphView['showFolders']>();
  const repaint = vi.fn<GraphFoldersDeps['repaint']>();
  const onCollapsed = vi.fn<GraphFoldersDeps['onCollapsed']>();
  const view: GraphFoldersDeps['view'] = { showFolders };
  const deps: GraphFoldersDeps = {
    view,
    repaint,
    drawn: (): DrawnGraph | null => world.drawn,
    visible: (): ReadonlySet<string> => world.visible,
    ghosts: (): string[] => world.ghosts,
    isGrouped: (): boolean => world.isGrouped,
    canAct: (): boolean => world.canAct,
    measure: (text: string): number => text.length,
    now: (): number => world.clock,
    onCollapsed
  };
  const rig: FoldersRig = { deps, world, showFolders, repaint, onCollapsed };

  return rig;
};
