import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readAtomResults } from './read-atom-results.ts';
import { B, FILE_IDS, NEWEST_OF_ALL, OLDEST, RUN_1_ONLY, WITHOUT_RUN_5 } from '../test/common/atom-results.const.ts';
import { readAtomFixture } from '../test/utils/atom-fixture.spec.util.ts';
import { writeAtomRuns } from '../test/utils/atom-runs.spec.util.ts';
import { newRunsRoot, writeRun } from '../test/utils/run-summary.spec.util.ts';

let tempDir = '';

describe('FEATURE: read atom results', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'read-atom-results-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN five summaries where every file appears in the newest', () => {
    it('WHEN read THEN each id has its newest result, so B passed and run 1 failed is outdated', async () => {
      const root = await newRunsRoot(tempDir, 'all runs');

      await writeAtomRuns(root, 5);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(NEWEST_OF_ALL);
    });

    it('WHEN an id is in no summary THEN it has no key and nothing throws', async () => {
      const root = await newRunsRoot(tempDir, 'never ran');
      const never = '@fx/e2e#e2e-ci--tests/never.spec.ts';
      const wanted = new Set([...FILE_IDS, never]);

      await writeAtomRuns(root, 5);

      await expect(readAtomResults(root, wanted)).resolves.toStrictEqual(NEWEST_OF_ALL);
    });
  });

  describe('GIVEN the four oldest summaries', () => {
    it('WHEN read THEN older appearances fill what newer summaries lack', async () => {
      const root = await newRunsRoot(tempDir, 'runs 1-4');

      await writeAtomRuns(root, 4);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(WITHOUT_RUN_5);
    });
  });

  describe('GIVEN only the first summary', () => {
    it('WHEN read THEN every id has its first-run result', async () => {
      const root = await newRunsRoot(tempDir, 'run 1');

      await writeAtomRuns(root, 1);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(RUN_1_ONLY);
    });
  });

  describe('GIVEN a summary with a spaced id, atoms copies and carriers', () => {
    it('WHEN read THEN only the exact requested id has a key', async () => {
      const root = await newRunsRoot(tempDir, 'copies');
      const text = readAtomFixture('run-4-definitions-copy');
      const expected = new Map([[B, { outcome: 'failed', durationMs: 1085, endedAt: 1792868575830 }]]);

      await writeRun(root, 'run-4.json', text, OLDEST);

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(expected);
    });
  });

  describe('GIVEN a root without runs', () => {
    it('WHEN it has no .turbo directory THEN the map is empty', async () => {
      const root = join(tempDir, 'missing');

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(new Map());
    });

    it('WHEN its runs directory is empty THEN the map is empty', async () => {
      const root = await newRunsRoot(tempDir, 'empty runs');

      await expect(readAtomResults(root, FILE_IDS)).resolves.toStrictEqual(new Map());
    });
  });
});
