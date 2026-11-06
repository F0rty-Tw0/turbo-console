import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { setImmediate as nextImmediate, setTimeout } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectTail } from './collect-tail.ts';
import { watchExitStall } from './exit-stall.ts';
import type { ExitStallCheck, RunTurboOptions } from '../common/turbo.type.ts';
import { isJsonEnd, jsonExitCode } from '../utils/stalled-exit-code.util.ts';

/** Prints `{"a":{}`, which ends like JSON, then `,"b":1` 150 ms later, which does not; exits by itself after 5 s. */
const LATE_CHUNK = `process.stdout.write('{"a":{}');
setTimeout(() => process.stdout.write(',"b":1'), 150);
setTimeout(() => process.exit(0), 5000);`;

const JSON_CHECK: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

const STALL_MS = 100;

/** Longer than `LATE_CHUNK`'s 150 ms gap plus `STALL_MS`: the stall timer is overdue and the second chunk waits in the pipe. */
const BLOCK_MS = 600;

const GUARDED: RunTurboOptions = { exitStallCheck: JSON_CHECK, exitStallMs: STALL_MS, platform: 'win32' };

/** Blocks the event loop for `ms`, as a busy host would. */
const blockLoop = (ms: number): void => {
  const cell = new Int32Array(new SharedArrayBuffer(4));

  Atomics.wait(cell, 0, 0, ms);
};

/** Advances the faked timers by `ms`, then lets the deferred check, a real `setImmediate`, run. */
const passMs = async (ms: number): Promise<void> => {
  vi.advanceTimersByTime(ms);
  await nextImmediate();
};

describe('FEATURE: exit-stall watch', () => {
  describe('GIVEN a child whose second chunk waits in the pipe while the host loop is blocked past the stall time', () => {
    it('WHEN the overdue stall timer fires THEN the check sees that chunk and onStall is not called', async () => {
      const child = spawn(process.execPath, ['-e', LATE_CHUNK]);
      const onStall = vi.fn<(check: ExitStallCheck) => void>();
      const stop = watchExitStall(child, GUARDED, collectTail(child.stdout), onStall);
      const blockAfterFirstChunk = (): NodeJS.Immediate => setImmediate(blockLoop, BLOCK_MS);

      child.stdout.once('data', blockAfterFirstChunk);
      await setTimeout(BLOCK_MS + STALL_MS * 5);
      stop();
      child.kill('SIGKILL');

      expect(onStall).not.toHaveBeenCalled();
    });
  });
});

describe('FEATURE: exit-stall watch timing', () => {
  let stdout: PassThrough;
  let stderr: PassThrough;
  let onStall = vi.fn<(check: ExitStallCheck) => void>();
  let stop = (): void => undefined;

  const watch = (options: RunTurboOptions): void => {
    stop = watchExitStall({ stdout, stderr }, options, collectTail(stdout), onStall);
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    stdout = new PassThrough();
    stderr = new PassThrough();
    onStall = vi.fn<(check: ExitStallCheck) => void>();
    watch(GUARDED);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  describe('GIVEN complete JSON on stdout twice, a stall time apart', () => {
    it('WHEN watched on win32 with a check THEN onStall gets the check exactly once', async () => {
      stdout.write('{}');
      await passMs(STALL_MS);
      stdout.write('{}');
      await passMs(STALL_MS);

      expect(onStall.mock.calls).toStrictEqual([[JSON_CHECK]]);
    });

    it.each([
      ['on linux', { ...GUARDED, platform: 'linux' }],
      ['on win32 without a check', { ...GUARDED, exitStallCheck: undefined }]
    ] satisfies [string, RunTurboOptions][])('WHEN watched %s THEN onStall is never called', async (_, options) => {
      stop();
      watch(options);
      stdout.write('{}');
      await passMs(STALL_MS);
      stdout.write('{}');
      await passMs(STALL_MS);

      expect(onStall).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN complete JSON on stdout', () => {
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
