import { vi } from 'vitest';

import type { PickItem } from '../../common/picker.type.ts';
import type { RunAllLaunch, RunAllPorts } from '../../common/run-all.type.ts';
import type { Terminable } from '../../common/run.type.ts';
import type { RunAllFakes } from '../common/run-all-fakes.type.ts';

const afterTimeout = (delayMs: number, action: () => void): void => {
  setTimeout(action, delayMs);
};

/**
 * Run all ports where the binary can run, VS Code runs no task, every root loads at once, the launch succeeds, `after`
 * is a real `setTimeout` (so fake timers drive the start watchdog), and `choose` answers picks.
 */
export const runAllFakes = (): RunAllFakes => {
  const chosen: string[] = [];
  const canExecute = vi.fn<(binaryPath: string) => Promise<boolean>>().mockResolvedValue(true);
  const isActive = vi.fn<(key: string) => boolean>().mockReturnValue(false);
  const ensureLoaded = vi.fn<(root: string) => Promise<void>>().mockResolvedValue(undefined);
  const pick = vi.fn<(items: PickItem[], placeholder: string) => Promise<PickItem | undefined>>(async (items) => {
    const value = chosen.shift();
    const found = items.find((item) => item.value === value);

    return Promise.resolve(found);
  });
  const info = vi.fn<(text: string) => void>();
  const execution: Terminable = { terminate: vi.fn() };
  const execute = vi.fn<(launch: RunAllLaunch, args: string[]) => Promise<Terminable>>().mockResolvedValue(execution);
  const after = vi.fn<(delayMs: number, action: () => void) => void>(afterTimeout);
  const log = vi.fn<(line: string) => void>();
  const notifyFailedToStart = vi.fn<() => void>();
  const choose = (...values: string[]): void => {
    chosen.push(...values);
  };
  const ports: RunAllPorts = { canExecute, isActive, ensureLoaded, pick, info, execute, after, log, notifyFailedToStart };
  const fakes: RunAllFakes = {
    ports,
    canExecute,
    isActive,
    ensureLoaded,
    pick,
    info,
    execute,
    execution,
    after,
    log,
    notifyFailedToStart,
    choose
  };

  return fakes;
};
