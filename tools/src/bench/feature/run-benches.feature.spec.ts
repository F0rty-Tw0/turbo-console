import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runBenchesCli } from './run-benches.feature.ts';

const writeBench = async (packageDir: string, source: string): Promise<void> => {
  const testDir = join(packageDir, 'src', 'test');

  await mkdir(testDir, { recursive: true });
  await writeFile(join(testDir, 'one.bench.ts'), source);
};

describe('FEATURE: run-benches CLI', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'run-benches-'));
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a package with a valid bench file', () => {
    beforeEach(async () => {
      await writeBench(join(root, 'pkg'), "export default [{ name: 'one', fn: () => 1, gate: true }];\n");
    });

    it('WHEN run THEN it resolves to 0', async () => {
      const code = await runBenchesCli(join(root, 'pkg'));

      expect(code).toBe(0);
    });

    it('WHEN run THEN stdout names each bench with its median', async () => {
      await runBenchesCli(join(root, 'pkg'));

      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringMatching(/^pkg\/one: median [\d.]+ ms over 25 samples \(gated\)\n$/)
      );
    });
  });

  describe('GIVEN a package whose bench file has no default array', () => {
    beforeEach(async () => {
      await writeBench(join(root, 'pkg'), 'export const one = 1;\n');
    });

    it('WHEN run THEN it resolves to 1', async () => {
      const code = await runBenchesCli(join(root, 'pkg'));

      expect(code).toBe(1);
    });

    it('WHEN run THEN stderr names the file', async () => {
      await runBenchesCli(join(root, 'pkg'));

      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringMatching(/^run-benches: .*one\.bench\.ts/));
    });
  });
});
