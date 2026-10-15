import type * as childProcess from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTurbo } from './run-turbo.ts';
import { toTurboException } from '../../errors/utils/turbo-error.util.ts';

type Spawn = { readonly file: unknown; readonly options: unknown };

const spawns = vi.hoisted(() => {
  const calls: Spawn[] = [];
  const state = { calls };

  return state;
});

/**
 * Records the file and options of each `execFile(file, args, options, callback)` call, then spawns for real. The memory
 * watch's probe spawns too (macOS `/bin/ps`), so assertions keep only the stub's calls.
 */
vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();

  const execFile = (...args: unknown[]): unknown => {
    const call: Spawn = { file: args[0], options: args[2] };

    spawns.calls.push(call);

    return Reflect.apply(real.execFile, undefined, args);
  };

  const mocked = { ...real, execFile };

  return mocked;
});

/** Over execFile's own 1 MiB default, so only a cap `runTurbo` sets lets it through. */
const STDOUT_BYTES = 2 * 1024 * 1024;

/** Prints `STDOUT_BYTES` bytes to stdout, then exits 0. */
const PRINTING_STUB = `#!/bin/sh\nhead -c ${String(STDOUT_BYTES)} /dev/zero | tr '\\0' x\n`;

/** `MAX_BUFFER` in `run-turbo.ts`. Printing past it costs ~750 MB of RSS, so the option execFile gets is checked instead. */
const DEFAULT_MAX_BUFFER = 256 * 1024 * 1024;

const DEFAULT_CAP = [{ maxBuffer: DEFAULT_MAX_BUFFER }];

// The stub is a POSIX shell script; runTurbo hands maxBuffer to execFile the same way on every platform.
describe.skipIf(process.platform === 'win32')('FEATURE: runTurbo output cap', () => {
  let stubDir = '';
  let stub = '';

  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'run-turbo-buffer-'));
    stub = join(stubDir, 'print.sh');
    await writeFile(stub, PRINTING_STUB, { mode: 0o755 });
  });

  afterAll(async () => {
    await rm(stubDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    spawns.calls.length = 0;
  });

  describe('GIVEN a binary that prints 2 MiB and exits 0', () => {
    it('WHEN maxBuffer is 100 THEN the rejection maps to failed, too much output', async () => {
      const error = await runTurbo(stub, [], stubDir, { maxBuffer: 100 }).catch((caught: unknown) => caught);

      const exception = toTurboException(error, 'query packageGraph');

      expect(exception).toMatchObject({
        kind: 'failed',
        message: 'turbo query packageGraph printed too much output (over the output cap)'
      });
    });

    it('WHEN no maxBuffer is given THEN the default cap lets all of it through', async () => {
      const result = await runTurbo(stub, [], stubDir);

      expect(result.stdout).toHaveLength(STDOUT_BYTES);
    });

    it('WHEN no maxBuffer is given THEN execFile is capped at 256 MiB, not left uncapped', async () => {
      await runTurbo(stub, [], stubDir);

      const stubCalls = spawns.calls.filter((call) => call.file === stub);
      const stubOptions = stubCalls.map((call) => call.options);

      expect(stubOptions).toMatchObject(DEFAULT_CAP);
    });
  });
});
