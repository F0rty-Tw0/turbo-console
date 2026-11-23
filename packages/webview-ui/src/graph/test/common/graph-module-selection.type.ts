import type { Mock, Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { ModulesViewState } from '../../../bridge/common/graph-view-state.type.ts';
import type { ModulePhase } from '../../common/module-mode.type.ts';
import type { ModuleDetailsSink, ModuleSelectionDeps, ModuleSelectionMode } from '../../common/module-selection.type.ts';

/** The selection's deps under test over one mutable saved view and phase, each fake also reachable on its own. */
export type ModuleSelectionRig = {
  readonly deps: ModuleSelectionDeps;
  readonly mode: Mocked<ModuleSelectionMode>;
  readonly post: Mock<Bridge['post']>;
  readonly show: Mock<ModuleDetailsSink['show']>;
  /** The view `save` or `update` wrote last, or the one the rig started from. */
  readonly saved: () => ModulesViewState | null;
  readonly setPhase: (phase: ModulePhase) => void;
};
