import { vi } from 'vitest';

import type { RunLogTail, RunLogs } from '../../common/run-log-tail.type.ts';
import type { ProgressPort } from '../../common/run-progress.type.ts';
import type { RunPorts, Terminable } from '../../common/run.type.ts';

const afterTimeout = (delayMs: number, action: () => void): void => {
  setTimeout(action, delayMs);
};

const noDependencies = (): string[] => [];

/** A tail whose drain resolves at once; a fresh one per call. */
const drainedTail = (): RunLogTail => {
  const drain = vi.fn().mockResolvedValue(undefined);
  const tail: RunLogTail = { drain, close: vi.fn() };

  return tail;
};

/**
 * Run ports where the binary may run, VS Code runs no task of the request, `execute` and `executeScript` resolve with
 * `execution`, no summary matches, `after` is a real `setTimeout` (so fake timers drive the watchdog), the clock reads
 * 1000, every task has no dependencies, the random id is `ab12cd34`, the log folder is made and each tail drains at
 * once, and the progress port only records its calls; `overrides` on top.
 */
export const fakeRunPorts = (execution: Terminable, overrides: Partial<RunPorts> = {}): RunPorts => {
  const canExecute = vi.fn().mockResolvedValue(true);
  const isActive = vi.fn().mockReturnValue(false);
  const execute = vi.fn().mockResolvedValue(execution);
  const executeScript = vi.fn().mockResolvedValue(execution);
  const match = vi.fn().mockResolvedValue(null);
  const prepare = vi.fn().mockResolvedValue(true);
  const logs: RunLogs = { prepare, start: vi.fn(drainedTail) };
  const drain = vi.fn().mockResolvedValue(undefined);
  const progress: ProgressPort = { begin: vi.fn(), tail: vi.fn(), event: vi.fn(), drain, abort: vi.fn() };
  const base: RunPorts = {
    canExecute,
    isActive,
    execute,
    executeScript,
    after: vi.fn(afterTimeout),
    match,
    notifyFailedToStart: vi.fn(),
    info: vi.fn(),
    log: vi.fn(),
    now: () => 1000,
    dependenciesOf: vi.fn(() => noDependencies),
    randomId: () => 'ab12cd34',
    logs,
    progress
  };
  const ports: RunPorts = { ...base, ...overrides };

  return ports;
};
