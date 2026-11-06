import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { setImmediate as nextImmediate, setTimeout } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectTail } from './collect-tail.ts';
import { watchExitStall } from './exit-stall.ts';
import type { ExitStallCheck, RunTurboOptions } from '../common/turbo.type.ts';
import { isJsonEnd, jsonExitCode } from '../utils/stalled-exit-code.util.ts';

/** Prints `{}` twice, 300 ms apart, then idles; exits by itself after 5 s so a failed case cannot leave it running. */
const TWICE_COMPLETE = `process.stdout.write('{}\\n');
setTimeout(() => process.stdout.write('{}\\n'), 300);
setTimeout(() => process.exit(0), 5000);`;

/** Prints `{"a":{}`, which ends like JSON, then `,"b":1` 150 ms later, which does not; then idles like `TWICE_COMPLETE`. */
const LATE_CHUNK = `process.stdout.write('{"a":{}');
setTimeout(() => process.stdout.write(',"b":1'), 150);
setTimeout(() => process.exit(0), 5000);`;

const JSON_CHECK: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

const STALL_MS = 100;

/** Past both prints and two stall periods after the last one. */
const WATCH_MS = 700;

/** Longer than `LATE_CHUNK`'s 150 ms gap plus `STALL_MS`: the stall timer is overdue and the second chunk waits in the pipe. */
const BLOCK_MS = 600;

const GUARDED: RunTurboOptions = { exitStallCheck: JSON_CHECK, exitStallMs: STALL_MS, platform: 'win32' };

const children: ChildProcess[] = [];

const startChild = (script: string): ChildProcess => {
  const child = spawn(process.execPath, ['-e', script]);

  children.push(child);

  return child;
};

/** Blocks the event loop for `ms`, as a busy host would. */
const blockLoop = (ms: number): void => {
  const cell = new Int32Array(new SharedArrayBuffer(4));

  Atomics.wait(cell, 0, 0, ms);
};

/** The `onStall` calls the watch makes over `watchMs` of `script` under `options`; `onChild` runs once the watch is on. */
const stallsOf = async (
  script: string,
  options: RunTurboOptions,
  watchMs = WATCH_MS,
  onChild: (child: ChildProcess) => void = vi.fn()
): Promise<unknown[][]> => {
  const child = startChild(script);
  const onStall = vi.fn<(check: ExitStallCheck) => void>();
  const stop = watchExitStall(child, options, collectTail(child.stdout), onStall);

  onChild(child);
  await setTimeout(watchMs);
  stop();

  return onStall.mock.calls;
};

/** Blocks the loop in the check phase right after the first stdout chunk, so the next loop turn starts with the timers. */
const blockAfterFirstChunk = (child: ChildProcess): void => {
  const onFirstChunk = (): void => {
    setImmediate(blockLoop, BLOCK_MS);
  };

  child.stdout?.once('data', onFirstChunk);
};

const stopChild = async (child: ChildProcess): Promise<void> => {
  const isRunning = child.exitCode === null && child.signalCode === null;

  if (!isRunning) return;

  const exited = once(child, 'exit');

  child.kill('SIGKILL');
  await exited;
};

describe('FEATURE: exit-stall watch', () => {
  afterEach(async () => {
    await Promise.all(children.map(stopChild));
    children.length = 0;
  });

  describe('GIVEN a child that prints complete JSON twice, then idles', () => {
    it('WHEN watched on win32 with a check THEN onStall gets the check exactly once', async () => {
      await expect(stallsOf(TWICE_COMPLETE, GUARDED)).resolves.toStrictEqual([[JSON_CHECK]]);
    });

    it('WHEN watched on linux THEN onStall is never called', async () => {
      const options: RunTurboOptions = { ...GUARDED, platform: 'linux' };

      await expect(stallsOf(TWICE_COMPLETE, options)).resolves.toStrictEqual([]);
    });

    it('WHEN watched on win32 without a check THEN onStall is never called', async () => {
      const options: RunTurboOptions = { ...GUARDED, exitStallCheck: undefined };

      await expect(stallsOf(TWICE_COMPLETE, options)).resolves.toStrictEqual([]);
    });
  });

  describe('GIVEN a child whose second chunk waits in the pipe while the host loop is blocked past the stall time', () => {
    it('WHEN the overdue stall timer fires THEN the check sees that chunk and onStall is not called', async () => {
      const watchMs = BLOCK_MS + WATCH_MS;

      await expect(stallsOf(LATE_CHUNK, GUARDED, watchMs, blockAfterFirstChunk)).resolves.toStrictEqual([]);
    });
  });
});

describe('FEATURE: exit-stall watch timing', () => {
  let stdout: PassThrough;
  let stderr: PassThrough;
  let onStall = vi.fn<(check: ExitStallCheck) => void>();
  let stop = (): void => undefined;

  /** Advances the faked timers by `ms`, then lets the deferred check, a real `setImmediate`, run. */
  const passMs = async (ms: number): Promise<void> => {
    vi.advanceTimersByTime(ms);
    await nextImmediate();
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    stdout = new PassThrough();
    stderr = new PassThrough();
    onStall = vi.fn<(check: ExitStallCheck) => void>();
    stop = watchExitStall({ stdout, stderr }, GUARDED, collectTail(stdout), onStall);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  describe('GIVEN complete JSON on stdout', () => {
    it('WHEN the stall time passes THEN onStall gets the check', async () => {
      stdout.write('{}');
      await passMs(STALL_MS);

      expect(onStall).toHaveBeenCalledExactlyOnceWith(JSON_CHECK);
    });

    it('WHEN a stderr chunk comes just before the stall time THEN the wait restarts from it', async () => {
      stdout.write('{}');
      await passMs(STALL_MS - 10);
      stderr.write('x');
      await passMs(STALL_MS - 10);

      expect(onStall).not.toHaveBeenCalled();
    });

    it('WHEN stop runs before the stall time THEN onStall is not called', async () => {
      stdout.write('{}');
      stop();
      await passMs(STALL_MS * 2);

      expect(onStall).not.toHaveBeenCalled();
    });

    it('WHEN stop runs between the stall timer and its deferred check THEN onStall is not called', async () => {
      stdout.write('{}');
      vi.advanceTimersByTime(STALL_MS);
      stop();
      await nextImmediate();

      expect(onStall).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a stopped watch', () => {
    it('WHEN complete JSON arrives on stdout THEN onStall is not called', async () => {
      stop();
      stdout.write('{}');
      await passMs(STALL_MS * 2);

      expect(onStall).not.toHaveBeenCalled();
    });
  });
});
