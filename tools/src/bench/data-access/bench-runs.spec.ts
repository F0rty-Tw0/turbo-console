import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readRunsDir } from './bench-runs.ts';
import type { BenchResult } from '../common/bench.type.ts';

const result = (name: string, medianNs: number): BenchResult => {
  const benchResult: BenchResult = { name, medianNs, samples: 25, gate: true };

  return benchResult;
};

const writeJson = async (root: string, path: string, value: unknown): Promise<void> => {
  const file = join(root, path);
  const json = JSON.stringify(value);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, json);
};

describe('FEATURE: bench runs dir', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bench-runs-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN two runs, each with results from two packages', () => {
    beforeEach(async () => {
      await writeJson(root, '1/packages/repo-gen/results.json', [result('repo-gen/generate', 3)]);
      await writeJson(root, '1/packages/core/results.json', [result('core/parse', 1)]);
      await writeJson(root, '2/packages/core/results.json', [result('core/parse', 2)]);
      await writeJson(root, '2/packages/repo-gen/results.json', [result('repo-gen/generate', 4)]);
    });

    it('WHEN the dir is read THEN each run merges its results files in path order', async () => {
      const first = [result('core/parse', 1), result('repo-gen/generate', 3)];
      const second = [result('core/parse', 2), result('repo-gen/generate', 4)];

      const runs = await readRunsDir(root);

      expect(runs).toStrictEqual([first, second]);
    });
  });

  describe('GIVEN a run whose results file sits directly in the run folder', () => {
    it('WHEN the dir is read THEN that file is read too', async () => {
      await writeJson(root, '1/results.json', [result('core/parse', 1)]);

      const runs = await readRunsDir(root);

      expect(runs).toStrictEqual([[result('core/parse', 1)]]);
    });
  });

  describe('GIVEN a run folder without results files and a stray top-level file', () => {
    it('WHEN the dir is read THEN the folder is an empty run and the file is ignored', async () => {
      await mkdir(join(root, '1'));
      await writeJson(root, 'results.json', [result('core/parse', 1)]);

      const runs = await readRunsDir(root);

      expect(runs).toStrictEqual([[]]);
    });
  });

  describe('GIVEN an empty dir', () => {
    it('WHEN the dir is read THEN there are no runs', async () => {
      const runs = await readRunsDir(root);

      expect(runs).toStrictEqual([]);
    });
  });

  describe('GIVEN a dir that does not exist', () => {
    it('WHEN the dir is read THEN there are no runs', async () => {
      const missing = join(root, 'missing');

      const runs = await readRunsDir(missing);

      expect(runs).toStrictEqual([]);
    });
  });

  describe('GIVEN a results file outside the bench JSON contract', () => {
    it('WHEN the dir is read THEN it rejects naming the file', async () => {
      const invalid = [{ name: 'core/parse' }];

      await writeJson(root, '1/packages/core/results.json', invalid);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/packages[/\\]core[/\\]results\.json/);
    });
  });
});
