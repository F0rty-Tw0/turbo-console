import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { readNewestRunSummary } from './read-newest-run-summary.ts';
import type * as runSummaryConst from '../common/run-summary.const.ts';
import { newRunsRoot, summaryText, writeRun } from '../test/utils/run-summary.spec.util.ts';

const cap = vi.hoisted(() => {
  const state = { bytes: 4096 };

  return state;
});

vi.mock('../common/run-summary.const.ts', async (importOriginal) => {
  const real = await importOriginal<typeof runSummaryConst>();
  // eslint-disable-next-line @typescript-eslint/naming-convention -- the mocked module's own constant name.
  const mocked = { ...real, MAX_SUMMARY_BYTES: cap.bytes };

  return mocked;
});

/** Seconds since the epoch, one apart per file. */
const OLDEST = 1_760_000_000;

/** One more than `MAX_SUMMARY_TRIES` (20), which this spec does not mock. */
const BROKEN_COUNT = 21;

let tempDir = '';

describe('FEATURE: newest run summary limits', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'run-summary-limits-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a newer valid summary padded past the 4096-byte cap of this spec', () => {
    it('WHEN read THEN it is skipped for the older valid one', async () => {
      const root = await newRunsRoot(tempDir, 'over cap');
      const padded = `${summaryText('padded')}${' '.repeat(cap.bytes)}`;

      await writeRun(root, 'a.json', summaryText('small'), OLDEST);
      await writeRun(root, 'b.json', padded, OLDEST + 1);

      await expect(readNewestRunSummary(root)).resolves.toMatchObject({ id: 'small' });
    });
  });

  describe('GIVEN 21 broken summaries newer than the only valid one', () => {
    it('WHEN read THEN only the newest 20 are tried, so it is null', async () => {
      const root = await newRunsRoot(tempDir, 'over tries');
      const brokenTimes = Array.from({ length: BROKEN_COUNT }, (_, index) => OLDEST + index + 1);

      await writeRun(root, 'valid.json', summaryText('oldest'), OLDEST);

      for (const seconds of brokenTimes) await writeRun(root, `broken-${seconds}.json`, '{', seconds);

      await expect(readNewestRunSummary(root)).resolves.toBeNull();
    });
  });
});
