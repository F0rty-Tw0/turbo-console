import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compareRunsDirs } from './bench-comparison.ts';
import type { BenchResult, ComparisonRow } from '../common/bench.type.ts';

const writeRun = async (runsDir: string, run: string, medianNs: number): Promise<void> => {
  const file = join(runsDir, run, 'packages', 'core', 'results.json');
  const results: BenchResult[] = [{ name: 'core/parse', medianNs, samples: 25, gate: true }];
  const json = JSON.stringify(results);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, json);
};

describe('FEATURE: runs dir comparison', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bench-comparison-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN three base runs and three head runs of a gated bench', () => {
    beforeEach(async () => {
      await writeRun(join(root, 'base'), '1', 90);
      await writeRun(join(root, 'base'), '2', 100);
      await writeRun(join(root, 'base'), '3', 400);
      await writeRun(join(root, 'head'), '1', 130);
      await writeRun(join(root, 'head'), '2', 108);
      await writeRun(join(root, 'head'), '3', 140);
    });

    it('WHEN the dirs are compared THEN each side is reduced to its fastest run before the threshold check', async () => {
      const row: ComparisonRow = { name: 'core/parse', baseNs: 90, headNs: 108, ratio: 1.2, gate: true, failed: true };

      const comparison = await compareRunsDirs(join(root, 'base'), join(root, 'head'));

      expect(comparison?.rows).toStrictEqual([row]);
    });
  });

  describe('GIVEN a base dir without results', () => {
    it('WHEN the dirs are compared THEN there is no baseline', async () => {
      await writeRun(join(root, 'head'), '1', 100);

      const comparison = await compareRunsDirs(join(root, 'base'), join(root, 'head'));

      expect(comparison).toBeNull();
    });
  });
});
