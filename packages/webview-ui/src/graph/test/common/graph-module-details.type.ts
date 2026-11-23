import type { Mock, Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { TaskModes } from '../../common/graph-task.type.ts';
import type { ModuleDetailsActions, ModuleDetailsDeps, ModuleDetailsElements } from '../../common/module-details.type.ts';

/** The module Details panel's deps under test over the real builders, each fake also reachable on its own. */
export type ModuleDetailsRig = {
  readonly deps: ModuleDetailsDeps;
  readonly post: Mock<Bridge['post']>;
  readonly savePanels: Mock<TaskModes['savePanels']>;
  readonly actions: Mocked<ModuleDetailsActions>;
  readonly panel: HTMLElement;
  readonly packageAside: HTMLElement;
  /** The views built so far, the latest last. */
  readonly built: ModuleDetailsElements[];
};
