import type { Dirent } from 'node:fs';
import { chmod, mkdtemp, rm, symlink } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { walkSourceFiles } from './import-walk.ts';
import { IMPORT_SCAN_CAPS } from '../common/import-scan.const.ts';
import type { ImportScanCaps } from '../common/import-scan.type.ts';
import type { ImportScanRun, ImportWalk } from '../common/import-walk.type.ts';
import { writeImportTree } from '../test/utils/import-tree.spec.util.ts';

type ReaddirOptions = { readonly withFileTypes: true };

type ReaddirFailure = { readonly path: string; readonly error: Error };

type ListingState = {
  // eslint-disable-next-line local/readonly-type-properties -- cases set what the readdir mock does
  isReversed: boolean;
  failure: ReaddirFailure | null;
};

const listing = vi.hoisted((): ListingState => {
  const state: ListingState = { isReversed: false, failure: null };

  return state;
});

/** libuv sorts what `readdir` returns on most systems, so a case reverses it to show the walk sorts by itself. */
vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  const failureOf = (path: string): Error | null => (listing.failure?.path === path ? listing.failure.error : null);

  const readdir = async (path: string, options: ReaddirOptions): Promise<Dirent[]> => {
    const failure = failureOf(path);

    if (failure !== null) throw failure;

    const entries = await real.readdir(path, options);
    const copy = [...entries];
    const reversed = copy.reverse();

    return listing.isReversed ? reversed : entries;
  };

  const mocked = { ...real, readdir };

  return mocked;
});

/** chmod has no effect on Windows, and root reads any file. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

const CAN_SYMLINK = process.platform !== 'win32';

const SOURCE_TEXT = 'export {};\n';

const T3_TREE: Record<string, string> = {
  'a.ts': SOURCE_TEXT,
  'b.d.ts': SOURCE_TEXT,
  'c.json': '{}',
  '.eslintrc.cjs': SOURCE_TEXT,
  'node_modules/x/index.ts': SOURCE_TEXT,
  'src/node_modules/y/index.ts': SOURCE_TEXT,
  '.git/h.ts': SOURCE_TEXT,
  'src/.cache/c.ts': SOURCE_TEXT,
  'dist/d.js': SOURCE_TEXT,
  'build/b.js': SOURCE_TEXT,
  'out/o.js': SOURCE_TEXT,
  'coverage/c.js': SOURCE_TEXT,
  'storybook-static/s.js': SOURCE_TEXT,
  'src/build/k.ts': SOURCE_TEXT,
  'src/dist/m.ts': SOURCE_TEXT,
  'generated/g.ts': SOURCE_TEXT,
  'src/z.tsx': SOURCE_TEXT,
  'src/a.mts': SOURCE_TEXT
};

const T3_FILES = ['.eslintrc.cjs', 'a.ts', 'generated/g.ts', 'src/a.mts', 'src/build/k.ts', 'src/dist/m.ts', 'src/z.tsx'];

const namesOf = (walk: ImportWalk): string[] => walk.files.map((walked) => walked.file);

const treeOf = (names: string[], text: string = SOURCE_TEXT): Record<string, string> => {
  const entries = names.map((name): [string, string] => [name, text]);
  const tree = Object.fromEntries(entries);

  return tree;
};

const capsOf = (patch: Partial<ImportScanCaps>): ImportScanCaps => {
  const caps: ImportScanCaps = { ...IMPORT_SCAN_CAPS, ...patch };

  return caps;
};

describe('FEATURE: walking a package for source files', () => {
  let dir = '';

  const runOf = (patch: Partial<ImportScanRun> = {}): ImportScanRun => {
    const signal = new AbortController().signal;
    const run: ImportScanRun = { dir, skipDirs: new Set(), caps: IMPORT_SCAN_CAPS, signal, isOverTime: () => false, ...patch };

    return run;
  };

  beforeEach(async () => {
    listing.isReversed = false;
    listing.failure = null;
    dir = await mkdtemp(join(tmpdir(), 'import-scan-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a tree holding every T3 case', () => {
    beforeEach(async () => {
      await writeImportTree(dir, T3_TREE);
    });

    it('WHEN walked THEN the files are the sources outside skipped dirs and the limit is null', async () => {
      const walk = await walkSourceFiles(runOf());

      expect(namesOf(walk)).toStrictEqual(T3_FILES);
      expect(walk.limit).toBeNull();
    });

    it('WHEN a file is listed THEN its path is the absolute path with OS separators', async () => {
      const walk = await walkSourceFiles(runOf());

      expect(walk.files).toContainEqual({ file: 'src/a.mts', path: join(dir, 'src', 'a.mts') });
    });
  });

  describe('GIVEN 12 files listed in reverse, among them Z.ts and _x.ts, beside dir e/ holding x.ts', () => {
    it('WHEN walked THEN the names come back in code-unit order with a dir at its sorted position', async () => {
      const names = ['f.ts', 'b.ts', 'j.ts', 'd.ts', 'h.ts', 'a.ts', 'i.ts', 'c.ts', 'g.ts', 'e.ts', '_x.ts', 'Z.ts', 'e/x.ts'];
      const sorted = ['Z.ts', '_x.ts', 'a.ts', 'b.ts', 'c.ts', 'd.ts', 'e/x.ts', 'e.ts', 'f.ts', 'g.ts', 'h.ts', 'i.ts', 'j.ts'];

      listing.isReversed = true;

      await writeImportTree(dir, treeOf(names));

      const walk = await walkSourceFiles(runOf());

      expect(namesOf(walk)).toStrictEqual(sorted);
    });
  });

  describe('GIVEN nested packages', () => {
    beforeEach(async () => {
      const names = ['r.ts', 'packages/a/a.ts', 'packages/b/b.ts', 'packages/b/sub/x.ts', 'packages/c/c.ts', 'tools/t.ts'];

      await writeImportTree(dir, treeOf(names));
    });

    it('WHEN packages/b is in skipDirs THEN none of it is listed and packages/c is', async () => {
      const skipDirs = new Set([join(dir, 'packages', 'b')]);

      const walk = await walkSourceFiles(runOf({ skipDirs }));

      expect(namesOf(walk)).toStrictEqual(['packages/a/a.ts', 'packages/c/c.ts', 'r.ts', 'tools/t.ts']);
    });

    it('WHEN every package dir is in skipDirs THEN only root-level files and non-package dirs are listed', async () => {
      const packageNames = ['a', 'b', 'c'];
      const skipDirs = new Set(packageNames.map((name) => join(dir, 'packages', name)));

      const walk = await walkSourceFiles(runOf({ skipDirs }));

      expect(namesOf(walk)).toStrictEqual(['r.ts', 'tools/t.ts']);
    });
  });

  describe('GIVEN symlinks to a source file and to a dir of sources', () => {
    it.skipIf(!CAN_SYMLINK)('WHEN walked THEN neither link is followed', async () => {
      await writeImportTree(dir, treeOf(['src/real.ts', 'other/o.ts']));
      await symlink(join(dir, 'src', 'real.ts'), join(dir, 'src', 'link.ts'));
      await symlink(join(dir, 'other'), join(dir, 'lib'));

      const walk = await walkSourceFiles(runOf());

      expect(namesOf(walk)).toStrictEqual(['other/o.ts', 'src/real.ts']);
    });
  });

  describe('GIVEN a dir that cannot be read', () => {
    it('WHEN subdir sub/ fails to read with EMFILE THEN the walk rejects with that error', async () => {
      const error = Object.assign(new Error('too many open files'), { code: 'EMFILE' });

      await writeImportTree(dir, treeOf(['a.ts', 'sub/x.ts', 'z.ts']));

      listing.failure = { path: join(dir, 'sub'), error };

      const walking = walkSourceFiles(runOf());

      await expect(walking).rejects.toBe(error);
    });

    it('WHEN run.dir does not exist THEN it rejects with code ENOENT', async () => {
      const missing = join(dir, 'missing');

      const walking = walkSourceFiles(runOf({ dir: missing }));

      await expect(walking).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it.skipIf(!CAN_DENY_READ)('WHEN subdir locked/ is chmod 000 THEN its files are left out and the rest is listed', async () => {
      await writeImportTree(dir, treeOf(['a.ts', 'locked/x.ts', 'z.ts']));
      await chmod(join(dir, 'locked'), 0o000);

      try {
        const walk = await walkSourceFiles(runOf());

        expect(namesOf(walk)).toStrictEqual(['a.ts', 'z.ts']);
        expect(walk.limit).toBeNull();
      } finally {
        await chmod(join(dir, 'locked'), 0o755);
      }
    });
  });

  describe('GIVEN the D8 caps', () => {
    it('WHEN IMPORT_SCAN_CAPS is read THEN it equals the D8 values', () => {
      expect(IMPORT_SCAN_CAPS).toStrictEqual({ files: 5000, entries: 50_000, timeMs: 4000, fileBytes: 1024 * 1024, reads: 8 });
    });
  });

  describe('GIVEN 5 sources a.ts to e.ts', () => {
    beforeEach(async () => {
      await writeImportTree(dir, treeOf(['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts']));
    });

    it('WHEN caps.files is 3 THEN a.ts, b.ts, c.ts are listed and limit is files', async () => {
      const walk = await walkSourceFiles(runOf({ caps: capsOf({ files: 3 }) }));

      expect(namesOf(walk)).toStrictEqual(['a.ts', 'b.ts', 'c.ts']);
      expect(walk.limit).toBe('files');
    });

    it('WHEN caps.files is 5 THEN all 5 are listed and limit is null', async () => {
      const walk = await walkSourceFiles(runOf({ caps: capsOf({ files: 5 }) }));

      expect(namesOf(walk)).toHaveLength(5);
      expect(walk.limit).toBeNull();
    });
  });

  describe('GIVEN a.ts, b0.png to b9.png and c.ts', () => {
    beforeEach(async () => {
      const pngs = Array.from({ length: 10 }, (_, index) => `b${index}.png`);
      const names = ['a.ts', ...pngs, 'c.ts'];

      await writeImportTree(dir, treeOf(names, ''));
    });

    it('WHEN caps.entries is 5 THEN a.ts is listed and limit is entries', async () => {
      const walk = await walkSourceFiles(runOf({ caps: capsOf({ entries: 5 }) }));

      expect(namesOf(walk)).toStrictEqual(['a.ts']);
      expect(walk.limit).toBe('entries');
    });

    it('WHEN caps.entries is 12 THEN a.ts and c.ts are listed and limit is null', async () => {
      const walk = await walkSourceFiles(runOf({ caps: capsOf({ entries: 12 }) }));

      expect(namesOf(walk)).toStrictEqual(['a.ts', 'c.ts']);
      expect(walk.limit).toBeNull();
    });
  });

  describe('GIVEN a.ts, sub/p0.png to sub/p3.png and z.ts', () => {
    it('WHEN caps.entries is 5 THEN only a.ts is listed and limit is entries, as the count spans dirs', async () => {
      const pngs = Array.from({ length: 4 }, (_, index) => `sub/p${index}.png`);

      await writeImportTree(dir, treeOf(['a.ts', ...pngs, 'z.ts'], ''));

      const walk = await walkSourceFiles(runOf({ caps: capsOf({ entries: 5 }) }));

      expect(namesOf(walk)).toStrictEqual(['a.ts']);
      expect(walk.limit).toBe('entries');
    });
  });

  describe('GIVEN a.ts, sub/x.ts and z.ts', () => {
    beforeEach(async () => {
      await writeImportTree(dir, treeOf(['a.ts', 'sub/x.ts', 'z.ts']));
    });

    it('WHEN isOverTime turns true after its first call THEN only a.ts is listed and limit is time', async () => {
      let calls = 0;
      const isOverTime = (): boolean => (calls += 1) > 1;

      const walk = await walkSourceFiles(runOf({ isOverTime }));

      expect(namesOf(walk)).toStrictEqual(['a.ts']);
      expect(walk.limit).toBe('time');
    });

    it('WHEN isOverTime is true from the start THEN nothing is listed and limit is time', async () => {
      const walk = await walkSourceFiles(runOf({ isOverTime: () => true }));

      expect(namesOf(walk)).toStrictEqual([]);
      expect(walk.limit).toBe('time');
    });

    it('WHEN the signal is aborted while the walk runs THEN it rejects with signal.reason', async () => {
      const controller = new AbortController();
      const reason = new Error('stop');
      const isOverTime = (): boolean => {
        controller.abort(reason);

        return false;
      };

      const walking = walkSourceFiles(runOf({ signal: controller.signal, isOverTime }));

      await expect(walking).rejects.toBe(reason);
    });

    it('WHEN the signal is aborted before the walk THEN it rejects with signal.reason', async () => {
      const controller = new AbortController();

      controller.abort(new Error('stop'));

      const walking = walkSourceFiles(runOf({ signal: controller.signal }));

      await expect(walking).rejects.toBe(controller.signal.reason);
    });
  });
});
