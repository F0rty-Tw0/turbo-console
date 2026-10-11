import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runGenerateCli } from './generate-cli.ts';

describe('FEATURE: generate CLI', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'repo-gen-cli-'));
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  describe('GIVEN a known preset, a seed and an out dir', () => {
    describe('WHEN run', () => {
      it('THEN it resolves to 0', async () => {
        const out = join(root, 'repo');

        const code = await runGenerateCli(['--preset', 'target-like', '--seed', '1', '--out', out]);

        expect(code).toBe(0);
      });

      it('THEN <out>.manifest.json sits outside <out> and lists 14 packages', async () => {
        const out = join(root, 'repo');

        await runGenerateCli(['--preset', 'target-like', '--seed', '1', '--out', out]);
        const manifest = await readFile(`${out}.manifest.json`, 'utf8');
        const insideOut = existsSync(join(out, 'repo.manifest.json'));

        expect(manifest).toMatch(/"packages": \[/);
        expect(manifest.match(/"role": /g)).toHaveLength(14);
        expect(insideOut).toBe(false);
      });

      it('THEN <out> is a repo with one "base" commit', async () => {
        const out = join(root, 'repo');

        await runGenerateCli(['--preset', 'target-like', '--seed', '1', '--out', out]);
        const log = execFileSync('git', ['log', '--format=%s'], { cwd: out, encoding: 'utf8' });

        expect(log).toBe('base\n');
      });

      it('THEN it reports the out dir and counts on stdout', async () => {
        const out = join(root, 'repo');

        await runGenerateCli(['--preset', 'target-like', '--seed', '1', '--out', out]);

        expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining(`${out} (14 packages,`));
      });
    });

    it('WHEN the out dir has a trailing slash THEN the manifest still lands beside it', async () => {
      const out = join(root, 'repo');

      await runGenerateCli(['--preset', 'target-like', '--out', `${out}/`]);

      expect(existsSync(`${out}.manifest.json`)).toBe(true);
    });

    it('WHEN two seeds are generated THEN their manifests differ', async () => {
      await runGenerateCli(['--preset', 'target-like', '--seed', '1', '--out', join(root, 'one')]);
      await runGenerateCli(['--preset', 'target-like', '--seed', '2', '--out', join(root, 'two')]);

      const one = await readFile(join(root, 'one.manifest.json'), 'utf8');
      const two = await readFile(join(root, 'two.manifest.json'), 'utf8');

      expect(one).not.toBe(two);
    });
  });

  describe('GIVEN invalid arguments', () => {
    it('WHEN the preset is unknown THEN it resolves to 2 and prints the valid names', async () => {
      const code = await runGenerateCli(['--preset', 'nope', '--out', join(root, 'repo')]);

      expect(code).toBe(2);
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('target-like, stretch-300, stress'));
    });

    it('WHEN --out is missing THEN it resolves to 2 and prints the usage', async () => {
      const code = await runGenerateCli(['--preset', 'target-like']);

      expect(code).toBe(2);
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
    });

    it('WHEN the seed is not an integer THEN it resolves to 2', async () => {
      const code = await runGenerateCli(['--preset', 'target-like', '--seed', 'x', '--out', join(root, 'repo')]);

      expect(code).toBe(2);
    });

    it('WHEN the seed is 2^32 THEN it resolves to 2 and names the seed range', async () => {
      const code = await runGenerateCli(['--preset=target-like', '--seed=4294967296', `--out=${join(root, 'repo')}`]);

      expect(code).toBe(2);
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('0 <= seed < 4294967296'));
    });

    it('WHEN the seed is negative THEN it resolves to 2', async () => {
      const code = await runGenerateCli(['--preset=target-like', '--seed=-1', `--out=${join(root, 'repo')}`]);

      expect(code).toBe(2);
    });

    it('WHEN the usage is printed THEN it shows the --seed=<n> form', async () => {
      await runGenerateCli([]);

      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('[--seed=<n>]'));
    });

    it('WHEN an unknown flag is passed THEN it resolves to 2 and prints the usage', async () => {
      const code = await runGenerateCli(['--bogus']);

      expect(code).toBe(2);
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('usage:'));
    });
  });

  describe('GIVEN an out dir that already has an entry', () => {
    it('WHEN run THEN it resolves to 2, says the dir is not empty and writes nothing', async () => {
      const out = join(root, 'repo');

      await mkdir(out);
      await writeFile(join(out, 'keep.txt'), 'keep\n');
      const code = await runGenerateCli(['--preset', 'target-like', '--out', out]);
      const entries = await readdir(out);

      expect(code).toBe(2);
      expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining(`${out} is not empty`));
      expect(entries).toStrictEqual(['keep.txt']);
      expect(existsSync(`${out}.manifest.json`)).toBe(false);
    });
  });

  describe('GIVEN an out dir that exists and is empty', () => {
    it('WHEN run THEN it resolves to 0', async () => {
      const out = join(root, 'repo');

      await mkdir(out);
      const code = await runGenerateCli(['--preset', 'target-like', '--out', out]);

      expect(code).toBe(0);
    });
  });
});
