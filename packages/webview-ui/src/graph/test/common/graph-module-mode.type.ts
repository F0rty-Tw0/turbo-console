import type { Mock, Mocked } from 'vitest';

import type { Bridge } from '../../../bridge/common/bridge.type.ts';
import type { FrameClock } from '../../common/frame-clock.type.ts';
import type { ModuleExit, ModuleModeDeps, ModuleScreen, ModuleTaskSide } from '../../common/module-mode.type.ts';

/** Modules mode's deps under test, each fake also reachable on its own. */
export type ModuleModeRig = {
  readonly deps: ModuleModeDeps;
  readonly post: Mock<Bridge['post']>;
  readonly screen: Mocked<ModuleScreen>;
  readonly tasks: Mocked<ModuleTaskSide>;
  readonly onExit: Mock<(to: ModuleExit) => void>;
  readonly notice: Mock<(text: string) => void>;
  readonly start: Mock<FrameClock['start']>;
};
