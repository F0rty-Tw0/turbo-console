import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runBenches } from './bench-run.ts';

const writeSource = async (root: string, path: string, source: string): Promise<void> => {
  const file = join(root, path);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, source);
};

describe('FEATURE: bench run', () => {
  let packageDir = '';

  beforeEach(async () => {
    const root = await mkdtemp(join(tmpdir(), 'bench-run-'));

    packageDir = join(root, 'pkg');
  });

  afterEach(async () => {
    await rm(dirname(packageDir), { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a package with two bench files', () => {
    beforeEach(async () => {
      await writeSource(packageDir, 'src/b/test/b.bench.ts', "export default [{ name: 'beta', fn: () => 2, gate: false }];\n");
      await writeSource(packageDir, 'src/a/test/a.bench.ts', "export default [{ name: 'alpha', fn: async () => 1, gate: true }];\n");
    });

    describe('WHEN the benches run', () => {
      it('THEN each result is named <package dir>/<bench>, in file order', async () => {
        const results = await runBenches(packageDir);
        const names = results.map((result) => result.name);

        expect(names).toStrictEqual(['pkg/alpha', 'pkg/beta']);
      });

      it('THEN each result carries its gate and 25 samples', async () => {
        const results = await runBenches(packageDir);
        const rows = results.map((result) => [result.gate, result.samples]);

        expect(rows).toStrictEqual([
          [true, 25],
          [false, 25]
        ]);
      });

      it('THEN .bench/results.json holds the same results', async () => {
        const results = await runBenches(packageDir);
        const text = await readFile(join(packageDir, '.bench', 'results.json'), 'utf8');
        const written: unknown = JSON.parse(text);

        expect(written).toStrictEqual(results);
      });
    });
  });

  describe('GIVEN a package whose bench file has no default array', () => {
    beforeEach(async () => {
      await writeSource(packageDir, 'src/a/test/a.bench.ts', "export default [{ name: 'alpha', fn: () => 1, gate: true }];\n");
      await writeSource(packageDir, 'src/b/test/bad.bench.ts', 'export const benches = [];\n');
    });

    it('WHEN the benches run THEN it rejects naming the file', async () => {
      const run = runBenches(packageDir);

      await expect(run).rejects.toThrow(/bad\.bench\.ts/);
    });

    it('WHEN the benches run THEN no results file is written', async () => {
      await runBenches(packageDir).catch(() => undefined);
      const written = existsSync(join(packageDir, '.bench', 'results.json'));

      expect(written).toBe(false);
    });
  });

  describe('GIVEN a package without bench files', () => {
    it('WHEN the benches run THEN it writes an empty results list', async () => {
      await mkdir(packageDir);

      await runBenches(packageDir);
      const text = await readFile(join(packageDir, '.bench', 'results.json'), 'utf8');
      const written: unknown = JSON.parse(text);

      expect(written).toStrictEqual([]);
    });
  });
});
