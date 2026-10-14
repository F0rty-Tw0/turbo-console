import type { Mock } from 'vitest';

import type { PickItem } from '../../common/picker.type.ts';
import type { RunAllLaunch, RunAllPorts } from '../../common/run-all.type.ts';
import type { Terminable } from '../../common/run.type.ts';

export type RunAllFakes = {
  readonly ports: RunAllPorts;
  readonly canExecute: Mock<(binaryPath: string) => Promise<boolean>>;
  readonly isActive: Mock<(key: string) => boolean>;
  readonly ensureLoaded: Mock<(root: string) => Promise<void>>;
  readonly pick: Mock<(items: PickItem[], placeholder: string) => Promise<PickItem | undefined>>;
  readonly info: Mock<(text: string) => void>;
  readonly execute: Mock<(launch: RunAllLaunch, args: string[]) => Promise<Terminable>>;
  /** What `execute` resolves with. */
  readonly execution: Terminable;
  readonly after: Mock<(delayMs: number, action: () => void) => void>;
  readonly log: Mock<(line: string) => void>;
  readonly notifyFailedToStart: Mock<() => void>;
  /** The values the next picks choose, in order; a pick whose value is not offered (or none left) is closed. */
  readonly choose: (...values: string[]) => void;
};
