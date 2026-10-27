import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { queryTurbo } from './query-turbo.ts';
import { SINGLE_PACKAGE, SKIP_INFER } from '../common/turbo-args.const.ts';

/** Never exits on its own; the default SIGTERM action stops it. */
const HANGING_STUB = '#!/bin/sh\nwhile :; do sleep 0.1; done\n';

/** Prints each argument on its own line; `runTurbo` puts `--skip-infer` first. */
const ECHO_STUB = '#!/bin/sh\nfor a in "$@"; do echo "$a"; done\n';

const argvOf = (stdout: string): string[] => stdout.trimEnd().split('\n');

// The stub is a POSIX shell script; queryTurbo adds no platform-specific code of its own.
describe.skipIf(process.platform === 'win32')('FEATURE: queryTurbo', () => {
  let stubDir = '';

  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'query-turbo-'));
    await writeFile(join(stubDir, 'hang.sh'), HANGING_STUB, { mode: 0o755 });
    await writeFile(join(stubDir, 'echo.sh'), ECHO_STUB, { mode: 0o755 });
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

  describe('GIVEN a binary that prints its argv', () => {
    it('WHEN singlePackage is true THEN --single-package ends the argv', async () => {
      const { stdout } = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir, { singlePackage: true });

      expect(argvOf(stdout)).toStrictEqual([SKIP_INFER, 'query', 'q', SINGLE_PACKAGE]);
    });

    it('WHEN singlePackage is absent or false THEN the argv has no flag', async () => {
      const absent = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir);
      const off = await queryTurbo(join(stubDir, 'echo.sh'), 'q', stubDir, { singlePackage: false });

      expect([argvOf(absent.stdout), argvOf(off.stdout)]).toStrictEqual([
        [SKIP_INFER, 'query', 'q'],
        [SKIP_INFER, 'query', 'q']
      ]);
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
