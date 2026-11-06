import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { collectTail } from './collect-tail.ts';
import { watchExitStall } from './exit-stall.ts';
import type { ExitStallCheck, RunTurboOptions } from '../common/turbo.type.ts';
import { isJsonEnd, jsonExitCode } from '../utils/stalled-exit-code.util.ts';

/** Prints `{}` twice, 300 ms apart, then idles; exits by itself after 5 s so a failed case cannot leave it running. */
const TWICE_COMPLETE = `process.stdout.write('{}\\n');
setTimeout(() => process.stdout.write('{}\\n'), 300);
setTimeout(() => process.exit(0), 5000);`;

const JSON_CHECK: ExitStallCheck = { isEnd: isJsonEnd, exitCodeOf: jsonExitCode };

const STALL_MS = 100;

/** Past both prints and two stall periods after the last one. */
const WATCH_MS = 700;

const children: ChildProcess[] = [];

const startChild = (): ChildProcess => {
  const child = spawn(process.execPath, ['-e', TWICE_COMPLETE]);

  children.push(child);

  return child;
};

/** The `onStall` calls the watch makes over `WATCH_MS` of `TWICE_COMPLETE` under `options`. */
const stallsOf = async (options: RunTurboOptions): Promise<unknown[][]> => {
  const child = startChild();
  const onStall = vi.fn<(check: ExitStallCheck) => void>();
  const stop = watchExitStall(child, options, collectTail(child.stdout), onStall);

  await setTimeout(WATCH_MS);
  stop();

  return onStall.mock.calls;
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
      const options: RunTurboOptions = { exitStallCheck: JSON_CHECK, exitStallMs: STALL_MS, platform: 'win32' };

      await expect(stallsOf(options)).resolves.toStrictEqual([[JSON_CHECK]]);
    });

    it('WHEN watched on linux THEN onStall is never called', async () => {
      const options: RunTurboOptions = { exitStallCheck: JSON_CHECK, exitStallMs: STALL_MS, platform: 'linux' };

      await expect(stallsOf(options)).resolves.toStrictEqual([]);
    });

    it('WHEN watched on win32 without a check THEN onStall is never called', async () => {
      const options: RunTurboOptions = { exitStallMs: STALL_MS, platform: 'win32' };

      await expect(stallsOf(options)).resolves.toStrictEqual([]);
    });
  });
});
