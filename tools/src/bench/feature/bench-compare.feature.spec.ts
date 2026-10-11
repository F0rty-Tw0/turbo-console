import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runBenchCompare } from './bench-compare.feature.ts';
import type { BenchResult } from '../common/bench.type.ts';

const writeRuns = async (runsDir: string, medianNs: number): Promise<void> => {
  const results: BenchResult[] = [{ name: 'core/parse', medianNs, samples: 25, gate: true }];
  const json = JSON.stringify(results);

  for (const run of ['1', '2', '3']) {
    const file = join(runsDir, run, 'packages', 'core', 'results.json');

    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, json);
  }
};

describe('FEATURE: bench-compare CLI', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bench-compare-'));
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN head medians 1.2x the base medians on a gated bench', () => {
    beforeEach(async () => {
      await writeRuns(join(root, 'base'), 1_000_000);
      await writeRuns(join(root, 'head'), 1_200_000);
    });

    it('WHEN compared THEN it resolves to 1', async () => {
      const code = await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(code).toBe(1);
    });

    it('WHEN compared THEN stdout shows the failing row', async () => {
      await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(process.stdout.write).toHaveBeenCalledWith(expect.stringMatching(/^core\/parse +1\.000 +1\.200 +1\.200 +gated +FAIL$/m));
    });
  });

  describe('GIVEN head medians equal to the base medians', () => {
    it('WHEN compared THEN it resolves to 0', async () => {
      await writeRuns(join(root, 'base'), 1_000_000);
      await writeRuns(join(root, 'head'), 1_000_000);

      const code = await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(code).toBe(0);
    });
  });

  describe('GIVEN an empty base dir', () => {
    beforeEach(async () => {
      await mkdir(join(root, 'base'));
      await writeRuns(join(root, 'head'), 1_000_000);
    });

    it('WHEN compared THEN it resolves to 0', async () => {
      const code = await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(code).toBe(0);
    });

    it('WHEN compared THEN stdout says there is no baseline', async () => {
      await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(process.stdout.write).toHaveBeenCalledWith('no baseline\n');
    });
  });

  describe('GIVEN a base results file outside the bench JSON contract', () => {
    beforeEach(async () => {
      await mkdir(join(root, 'base', '1'), { recursive: true });
      await writeFile(join(root, 'base', '1', 'results.json'), '{}');
      await writeRuns(join(root, 'head'), 1_000_000);
    });

    it('WHEN compared THEN it resolves to 1', async () => {
      const code = await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(code).toBe(1);
    });

    it('WHEN compared THEN stderr names the file', async () => {
      await runBenchCompare(join(root, 'base'), join(root, 'head'));

      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringMatching(/^bench-compare: .*results\.json/));
    });
  });
});
