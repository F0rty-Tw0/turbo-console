import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeBenchResults } from './bench-results.ts';
import { benchResultsSchema } from '../common/bench.schema.ts';
import type { BenchResult } from '../common/bench.type.ts';

const RESULT: BenchResult = { name: 'core/parse', medianNs: 1500, samples: 25, gate: true };

describe('FEATURE: bench results file', () => {
  let dir = '';

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bench-results-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a package dir without a .bench folder', () => {
    it('WHEN results are written THEN .bench/results.json holds them in the bench JSON contract', async () => {
      await writeBenchResults(dir, [RESULT]);
      const text = await readFile(join(dir, '.bench', 'results.json'), 'utf8');
      const parsed = benchResultsSchema.parse(JSON.parse(text));

      expect(parsed).toStrictEqual([RESULT]);
    });
  });

  describe('GIVEN a package dir with results from an earlier run', () => {
    it('WHEN results are written THEN they replace the earlier ones', async () => {
      await mkdir(join(dir, '.bench'));
      await writeFile(join(dir, '.bench', 'results.json'), '[{"name":"old"}]');

      await writeBenchResults(dir, []);
      const text = await readFile(join(dir, '.bench', 'results.json'), 'utf8');
      const written: unknown = JSON.parse(text);

      expect(written).toStrictEqual([]);
    });
  });

  describe('GIVEN a result named from a package dir that holds a +', () => {
    const invalid: BenchResult = { ...RESULT, name: 'c++/parse' };

    it('WHEN results are written THEN it rejects naming the dir', async () => {
      const write = writeBenchResults(dir, [invalid]);

      await expect(write).rejects.toThrow(`${dir}: results outside the bench JSON contract`);
    });

    it('WHEN results are written THEN no results file is written', async () => {
      await writeBenchResults(dir, [invalid]).catch(() => undefined);
      const written = existsSync(join(dir, '.bench', 'results.json'));

      expect(written).toBe(false);
    });
  });
});
