import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { queryTurbo } from './query-turbo.ts';

/** Never exits on its own; the default SIGTERM action stops it. */
const HANGING_STUB = '#!/bin/sh\nwhile :; do sleep 0.1; done\n';

// The stub is a POSIX shell script; queryTurbo adds no platform-specific code of its own.
describe.skipIf(process.platform === 'win32')('FEATURE: queryTurbo', () => {
  let stubDir = '';

  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'query-turbo-'));
    await writeFile(join(stubDir, 'hang.sh'), HANGING_STUB, { mode: 0o755 });
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
});
