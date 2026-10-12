import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readRunsDir } from './bench-runs.ts';
import type { BenchResult } from '../common/bench.type.ts';

const IS_WINDOWS = process.platform === 'win32';

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

  describe('GIVEN a results file whose names use every allowed character class', () => {
    it('WHEN a name holds @, . and a space THEN reading keeps it', async () => {
      const results = [result('core/@scope pkg.v2', 1)];

      await writeJson(root, '1/results.json', results);

      const runs = await readRunsDir(root);

      expect(runs).toStrictEqual([results]);
    });

    it('WHEN a name is 200 characters THEN reading keeps it', async () => {
      const results = [result('a'.repeat(200), 1)];

      await writeJson(root, '1/results.json', results);

      const runs = await readRunsDir(root);

      expect(runs).toStrictEqual([results]);
    });
  });

  describe('GIVEN two packages in one run whose results share a bench name', () => {
    it('WHEN the dir is read THEN it rejects naming both files and the bench', async () => {
      await writeJson(root, '1/a/core/results.json', [result('core/x', 1)]);
      await writeJson(root, '1/b/core/results.json', [result('core/x', 2)]);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(
        /a[/\\]core[/\\]results\.json and .*b[/\\]core[/\\]results\.json: duplicate bench name "core\/x"$/
      );
    });
  });

  describe('GIVEN one results file that repeats a bench name', () => {
    it('WHEN the dir is read THEN it rejects naming the file and the bench', async () => {
      await writeJson(root, '1/results.json', [result('core/x', 1), result('core/x', 2)]);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/results\.json and .*results\.json: duplicate bench name "core\/x"$/);
    });
  });

  describe('GIVEN a results file outside the bench JSON contract', () => {
    it('WHEN the dir is read THEN it rejects naming the file', async () => {
      const invalid = [{ name: 'core/parse' }];

      await writeJson(root, '1/packages/core/results.json', invalid);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/packages[/\\]core[/\\]results\.json/);
    });

    it('WHEN a name holds a newline THEN reading rejects', async () => {
      const injected = [result('core/parse\nforged', 1)];

      await writeJson(root, '1/results.json', injected);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/not a bench results file/);
    });

    it('WHEN a name holds a : THEN reading rejects', async () => {
      await writeJson(root, '1/results.json', [result('core/a:b', 1)]);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/not a bench results file/);
    });

    it('WHEN a name is empty THEN reading rejects', async () => {
      await writeJson(root, '1/results.json', [result('', 1)]);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/not a bench results file/);
    });

    it('WHEN a name is 201 characters THEN reading rejects', async () => {
      await writeJson(root, '1/results.json', [result('a'.repeat(201), 1)]);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/not a bench results file/);
    });

    it('WHEN a median is 0 THEN reading rejects', async () => {
      await writeJson(root, '1/results.json', [result('core/parse', 0)]);

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/not a bench results file/);
    });
  });

  describe.skipIf(IS_WINDOWS)('GIVEN a results.json that is a symlink to another file', () => {
    it('WHEN the dir is read THEN it rejects as not a regular file without reading the target', async () => {
      await writeFile(join(root, 'secret.txt'), 'root:x:0:0:secret\n');
      await mkdir(join(root, '1'));
      await symlink(join(root, 'secret.txt'), join(root, '1', 'results.json'));

      const read = readRunsDir(root);

      await expect(read).rejects.toThrow(/results\.json: not a regular file$/);
    });
  });
});
