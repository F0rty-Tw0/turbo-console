import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runTurbo } from './run-turbo.ts';
import { toTurboException } from '../../errors/utils/turbo-error.util.ts';

const STUB_SCRIPT = '#!/bin/sh\necho "FATAL: daemon socket gone" >&2\nkill -9 $$\n';

/** The stub is a POSIX shell script, as in `run-turbo.spec.ts`. */
const IS_WINDOWS = process.platform === 'win32';

const rejectionOf = (rejection: unknown): unknown => rejection;

describe.skipIf(IS_WINDOWS)('FEATURE: runTurbo rejection after a kill signal', () => {
  let stubDir = '';

  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'run-turbo-signal-'));
    await writeFile(join(stubDir, 'sigkill.sh'), STUB_SCRIPT, { mode: 0o755 });
  });

  afterAll(async () => {
    await rm(stubDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a binary that writes to stderr, then kills itself with SIGKILL', () => {
    it('WHEN it runs THEN the TurboException names the signal and the stderr tail', async () => {
      const run = runTurbo(join(stubDir, 'sigkill.sh'), [], stubDir);
      const error = await run.catch(rejectionOf);

      expect(toTurboException(error, 'run build').message).toBe('turbo run build failed: SIGKILL\nFATAL: daemon socket gone');
    });
  });
});
