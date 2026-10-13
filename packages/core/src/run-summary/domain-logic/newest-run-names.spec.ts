import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newestRunNames } from './newest-run-names.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { MAX_SUMMARY_TRIES } from '../common/run-summary.const.ts';
import { newRunsRoot, writeRun } from '../test/utils/run-summary.spec.util.ts';

/** Seconds since the epoch of the oldest file. */
const OLDEST = 1_760_000_000;

/** `run-<n>.json` for `n` from 0 to `MAX_SUMMARY_TRIES`, one more than the cap, each a second newer than the last. */
const NAMES = Array.from({ length: MAX_SUMMARY_TRIES + 1 }, (_, index) => `run-${index}.json`);

const isEven = (file: RunSummaryFile): boolean => (file.mtimeMs / 1000 - OLDEST) % 2 === 0;

let tempDir = '';

let root = '';

describe('FEATURE: newest run summary names', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'newest-run-names-'));
    root = await newRunsRoot(tempDir, 'root');

    for (const [index, name] of NAMES.entries()) await writeRun(root, name, '{}', OLDEST + index);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a root with no .turbo/runs', () => {
    it('WHEN listed THEN it is null', async () => {
      const bare = join(tempDir, 'bare');

      await mkdir(bare);

      await expect(newestRunNames(bare)).resolves.toBeNull();
    });
  });

  describe(`GIVEN ${MAX_SUMMARY_TRIES + 1} files a second apart`, () => {
    it(`WHEN listed THEN the newest ${MAX_SUMMARY_TRIES} come back newest first`, async () => {
      const expected = NAMES.toReversed().slice(0, MAX_SUMMARY_TRIES);

      await expect(newestRunNames(root)).resolves.toStrictEqual(expected);
    });

    it('WHEN listed with a filter THEN only the kept files come back, newest first', async () => {
      const expected = NAMES.filter((_, index) => index % 2 === 0).toReversed();

      await expect(newestRunNames(root, isEven)).resolves.toStrictEqual(expected);
    });
  });
});
