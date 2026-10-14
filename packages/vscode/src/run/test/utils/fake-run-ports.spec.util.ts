import { vi } from 'vitest';

import type { RunPorts, Terminable } from '../../common/run.type.ts';

const afterTimeout = (delayMs: number, action: () => void): void => {
  setTimeout(action, delayMs);
};

/**
 * Run ports where the binary may run, VS Code runs no task of the request, `execute` resolves with `execution`, no
 * summary matches, `after` is a real `setTimeout` (so fake timers drive the watchdog) and the clock reads 1000;
 * `overrides` on top.
 */
export const fakeRunPorts = (execution: Terminable, overrides: Partial<RunPorts> = {}): RunPorts => {
  const canExecute = vi.fn().mockResolvedValue(true);
  const isActive = vi.fn().mockReturnValue(false);
  const execute = vi.fn().mockResolvedValue(execution);
  const match = vi.fn().mockResolvedValue(null);
  const base: RunPorts = {
    canExecute,
    isActive,
    execute,
    after: vi.fn(afterTimeout),
    match,
    notifyFailedToStart: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    now: () => 1000
  };
  const ports: RunPorts = { ...base, ...overrides };

  return ports;
};
