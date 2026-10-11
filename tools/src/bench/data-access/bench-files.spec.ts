import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findBenchFiles, importBenchFile } from './bench-files.ts';

const BENCH_SOURCE = "export default [{ name: 'one', fn: () => 1, gate: true }];\n";

const writeSource = async (root: string, path: string): Promise<void> => {
  const file = join(root, path);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, BENCH_SOURCE);
};

describe('FEATURE: bench files', () => {
  let root = '';

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'bench-files-'));
    await writeSource(root, 'src/b/test/two.bench.ts');
    await writeSource(root, 'src/a/test/one.bench.ts');
    await writeSource(root, 'src/test/top.bench.ts');
    await writeSource(root, 'src/a/outside.bench.ts');
    await writeSource(root, 'src/a/test/nested/deep.bench.ts');
    await writeSource(root, 'src/a/test/helper.ts');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a package with bench files inside and outside test/ folders', () => {
    it('WHEN bench files are listed THEN only src/**/test/*.bench.ts match, as sorted absolute paths', async () => {
      const matching = ['src/a/test/one.bench.ts', 'src/b/test/two.bench.ts', 'src/test/top.bench.ts'];
      const expected = matching.map((path) => join(root, path));

      const files = await findBenchFiles(root);

      expect(files).toStrictEqual(expected);
    });

    it('WHEN a bench file is imported THEN its module exposes the default export', async () => {
      const file = join(root, 'src/a/test/one.bench.ts');

      const module = await importBenchFile(file);

      expect(module).toHaveProperty('default.0.name', 'one');
    });
  });

  describe('GIVEN a package without a src folder', () => {
    it('WHEN bench files are listed THEN none are found', async () => {
      const empty = join(root, 'empty');

      await mkdir(empty);
      const files = await findBenchFiles(empty);

      expect(files).toStrictEqual([]);
    });
  });
});
