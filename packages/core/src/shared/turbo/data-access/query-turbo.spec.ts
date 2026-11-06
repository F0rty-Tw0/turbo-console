import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { queryTurbo } from './query-turbo.ts';
import { SINGLE_PACKAGE, SKIP_INFER } from '../common/turbo-args.const.ts';
import type { QueryTurboOptions } from '../common/turbo.type.ts';

/** Never exits on its own; the default SIGTERM action stops it. */
const HANGING_STUB = '#!/bin/sh\nwhile :; do sleep 0.1; done\n';

/** Prints each argument on its own line; `runTurbo` puts `--skip-infer` first. */
const ECHO_STUB = '#!/bin/sh\nfor a in "$@"; do echo "$a"; done\n';

/** Stubs that print a query stdout, then never exit, as turbo stalled on exit on Windows. */
const STALLING_STUBS: Record<string, string> = {
  'data-hang.sh': `echo '{"data":{}}'`,
  'errors-hang.sh': `echo '{"data":null,"errors":[{"message":"Package not found: nope-pkg"}]}'`,
  'half-hang.sh': `printf '{"data":'`
};

/** The exit-stall guard as on win32, with a stall short enough to land far inside the timeout. */
const STALL_GUARDED: QueryTurboOptions = { platform: 'win32', exitStallMs: 200, timeoutMs: 3000 };

const TIMEOUT_CAUSE = { name: 'TimeoutError' };

const TIMEOUT_ABORT = { name: 'AbortError', cause: TIMEOUT_CAUSE };

let stubDir = '';

const writeStallingStub = async ([name, output]: [string, string]): Promise<void> => {
  await writeFile(join(stubDir, name), `#!/bin/sh\n${output}\nwhile :; do sleep 0.1; done\n`, { mode: 0o755 });
};

const argvOf = (stdout: string): string[] => stdout.trimEnd().split('\n');

// The stubs are POSIX shell scripts; `platform` stands in for win32 where the exit-stall guard runs.
describe.skipIf(process.platform === 'win32')('FEATURE: queryTurbo', () => {
  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'query-turbo-'));
    await writeFile(join(stubDir, 'hang.sh'), HANGING_STUB, { mode: 0o755 });
    await writeFile(join(stubDir, 'echo.sh'), ECHO_STUB, { mode: 0o755 });
    await Promise.all(Object.entries(STALLING_STUBS).map(writeStallingStub));
  });

  afterAll(async () => {
    await rm(stubDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a binary that never exits', () => {
    it('WHEN a 300 ms timeout is passed THEN runTurbo gets it and queryTurbo rejects with an AbortError', async () => {
      const run = queryTurbo(join(stubDir, 'hang.sh'), 'q', stubDir, { timeoutMs: 300 });

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('GIVEN a binary that prints complete query JSON, then stalls on exit', () => {
    it('WHEN the exit-stall guard runs THEN queryTurbo resolves with exit code 0', async () => {
      const result = await queryTurbo(join(stubDir, 'data-hang.sh'), 'q', stubDir, STALL_GUARDED);

      expect(result).toMatchObject({ stdout: '{"data":{}}\n', exitCode: 0 });
    });
  });

  describe('GIVEN a binary that prints query JSON with errors, then stalls on exit', () => {
    it('WHEN the exit-stall guard runs THEN queryTurbo resolves with exit code 2, as turbo exits on GraphQL errors', async () => {
      const result = await queryTurbo(join(stubDir, 'errors-hang.sh'), 'q', stubDir, STALL_GUARDED);

      expect(result.exitCode).toBe(2);
    });
  });

  describe('GIVEN a binary that prints half a query JSON, then hangs', () => {
    it('WHEN the exit-stall guard runs THEN queryTurbo still rejects with the timeout', async () => {
      const options: QueryTurboOptions = { ...STALL_GUARDED, timeoutMs: 1000 };
      const run = queryTurbo(join(stubDir, 'half-hang.sh'), 'q', stubDir, options);

      await expect(run).rejects.toMatchObject(TIMEOUT_ABORT);
    });
  });

  describe('GIVEN a binary that prints its argv', () => {
    it('WHEN singlePackage is true THEN --single-package ends the argv', async () => {
      const { stdout } = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir, { singlePackage: true });

      expect(argvOf(stdout)).toStrictEqual([SKIP_INFER, 'query', 'q', SINGLE_PACKAGE]);
    });

    it('WHEN singlePackage is absent THEN the argv has no flag', async () => {
      const { stdout } = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir);

      expect(argvOf(stdout)).toStrictEqual([SKIP_INFER, 'query', 'q']);
    });

    it('WHEN singlePackage is false THEN the argv has no flag', async () => {
      const { stdout } = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir, { singlePackage: false });

      expect(argvOf(stdout)).toStrictEqual([SKIP_INFER, 'query', 'q']);
    });

    it('WHEN variables and singlePackage are both set THEN the flag follows -V <file>', async () => {
      const variables = { a: 'b' };
      const options = { variables, singlePackage: true };
      const { stdout } = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir, options);
      const argv = argvOf(stdout);

      expect([argv[3], argv.at(-1)]).toStrictEqual(['-V', SINGLE_PACKAGE]);
    });
  });
});
