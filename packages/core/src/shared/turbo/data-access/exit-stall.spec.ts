import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { setImmediate as nextImmediate } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectTail } from './collect-tail.ts';
import { watchExitStall } from './exit-stall.ts';
import type { ExitStallCheck, RunTurboOptions } from '../common/turbo.type.ts';
import { isJsonEnd, jsonExitCode } from '../utils/stalled-exit-code.util.ts';

/** Prints `{"a":{}`, which ends like JSON; on stdin input `,"b":1`, which does not, then creates the file its argument names. */
const LATE_CHUNK = `process.stdout.write('{"a":{}');
process.stdin.once('data', () => process.stdout.write(',"b":1', () => require('node:fs').writeFileSync(process.argv[1], '')));
setTimeout(() => process.exit(0), 5000);`;

const JSON_CHECK: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

const STALL_MS = 100;

const GUARDED: RunTurboOptions = { exitStallCheck: JSON_CHECK, exitStallMs: STALL_MS, platform: 'win32' };

/** Blocks the event loop for `ms`, as a busy host would. */
const blockLoop = (ms: number): void => {
  const cell = new Int32Array(new SharedArrayBuffer(4));

  Atomics.wait(cell, 0, 0, ms);
};

/** Blocks the loop in 10 ms slices until `path` exists or `slices` run out, then 2 stall times; vitest's timeout cannot fire meanwhile. */
const blockPastFile = (path: string, slices: number): void => {
  blockLoop(10);
  const hasFile = existsSync(path);

  if (hasFile || slices === 0) blockLoop(STALL_MS * 2);
  else blockPastFile(path, slices - 1);
};

/** Advances the faked timers by `ms`, then lets the deferred check, a real `setImmediate`, run. */
const passMs = async (ms: number): Promise<void> => {
  vi.advanceTimersByTime(ms);
  await nextImmediate();
};

describe('FEATURE: exit-stall watch', () => {
  describe('GIVEN a child whose second chunk waits in the pipe while the host loop is blocked past the stall time', () => {
    it('WHEN the overdue stall timer fires THEN the check sees that chunk and onStall is not called', async () => {
      const flagPath = join(tmpdir(), `exit-stall-${process.pid}-${Date.now()}`);
      const child = spawn(process.execPath, ['-e', LATE_CHUNK, flagPath]);
      const onStall = vi.fn<(check: ExitStallCheck) => void>();
      const stop = watchExitStall(child, GUARDED, collectTail(child.stdout), onStall);

      await once(child.stdout, 'data');
      child.stdin.write('go');
      setImmediate(blockPastFile, flagPath, 300);
      await once(child.stdout, 'data');
      await nextImmediate();
      stop();
      child.kill('SIGKILL');
      rmSync(flagPath, { force: true });

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

    it.each(['stdout', 'stderr'] as const)('WHEN a %s chunk precedes the deferred check THEN onStall is not called', async (name) => {
      const streams = { stdout, stderr };

      stdout.write('{}');
      vi.advanceTimersByTime(STALL_MS);
      streams[name].write('{}');
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
