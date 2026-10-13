import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  cacheFileName,
  cacheKeyOf,
  hasChangedRootFile,
  hasVanishedManifest,
  hostileRootFile,
  isEditedSince,
  isKeyedPath,
  keyedPathsOf
} from './cache-key.util.ts';
import { graphPackage } from '../../workspace/test/utils/graph.spec.util.ts';
import { MISSING_DIGEST, NOT_REGULAR_DIGEST, OVER_CAP_READ_DIGEST, ROOT_KEYED_FILES, UNREADABLE_DIGEST } from '../common/cache.const.ts';
import type { KeyedFile } from '../common/cache.type.ts';

const VERSION = '2.11.7';

const STARTED_AT = 1_000_000;

const SORTED_ROOT_FILES = ROOT_KEYED_FILES.toSorted();

const ESCAPING_PATHS = ['../x', '/abs', 'C:/x'];

const STORED_KEYED_PATHS = ['package.json', '.npmrc', 'yarn.lock', 'apps/web/turbo.jsonc', 'tools/e2e-1-atoms/turbo.json'];

/** Outside the root, holding a `\` (on POSIX `a\b` is one name, so this one opens the root's parent), or named like no keyed file. */
const STORED_OTHER_PATHS = [
  '../package.json',
  '/etc/package.json',
  'C:/turbo.json',
  'a\\b/../../package.json',
  'COM1',
  'fifo',
  'a/secret.txt'
];

const keyedFile = (path: string, digest: string, mtimeMs: number | null): KeyedFile => {
  const file: KeyedFile = { path, digest, mtimeMs };

  return file;
};

const FILES = [keyedFile('package.json', 'aaa', null), keyedFile('turbo.json', 'bbb', null), keyedFile('apps/web/package.json', 'ccc', null)];

const FILE_INDEXES = [0, 1, 2];

const toMissingTurboJson = (file: KeyedFile): KeyedFile => {
  if (file.path !== 'turbo.json') return file;

  return keyedFile(file.path, MISSING_DIGEST, null);
};

/** `FILES` with the digest at `index` replaced. */
const withDigestChanged = (index: number): KeyedFile[] => {
  const changed = (file: KeyedFile, at: number): KeyedFile => {
    if (at !== index) return file;

    return keyedFile(file.path, 'zzz', null);
  };

  return FILES.map(changed);
};

const keyedPathsOfDirs = (dirs: string[]): string[] => {
  const toPackage = (dir: string, index: number): ReturnType<typeof graphPackage> => graphPackage(`pkg-${index}`, dir, [], []);
  const packages = dirs.map(toPackage);

  return keyedPathsOf(packages);
};

const filesIn = (dir: string): string[] => [`${dir}/package.json`, `${dir}/turbo.json`, `${dir}/turbo.jsonc`];

const sortedWith = (dirs: string[]): string[] => {
  const packageFiles = dirs.flatMap(filesIn);
  const all = [...ROOT_KEYED_FILES, ...packageFiles];

  return all.toSorted();
};

const sha256Of = (text: string): string => {
  const hash = createHash('sha256');

  hash.update(text);

  return hash.digest('hex');
};

describe('FEATURE: workspace cache key', () => {
  describe('GIVEN the same keyed files and turbo version', () => {
    it('WHEN the key is computed THEN it is the sha256 of the sorted path-digest lines and the version', () => {
      const expected = sha256Of(`apps/web/package.json\0ccc\npackage.json\0aaa\nturbo.json\0bbb\n${VERSION}`);

      const key = cacheKeyOf(FILES, VERSION);

      expect(key).toBe(expected);
    });

    it('WHEN the files are listed in another order THEN the key is the same', () => {
      const reversed = FILES.toReversed();

      const key = cacheKeyOf(reversed, VERSION);

      expect(key).toBe(cacheKeyOf(FILES, VERSION));
    });
  });

  describe('GIVEN one keyed file whose digest changed', () => {
    it.each(FILE_INDEXES)('WHEN file %i changed THEN the key differs', (index) => {
      const changed = withDigestChanged(index);

      const key = cacheKeyOf(changed, VERSION);

      expect(key).not.toBe(cacheKeyOf(FILES, VERSION));
    });
  });

  describe('GIVEN a keyed file that is missing or empty', () => {
    it('WHEN the keys are computed THEN missing and the digest of an empty file differ', () => {
      const missing = [keyedFile('turbo.json', MISSING_DIGEST, null)];
      const empty = [keyedFile('turbo.json', sha256Of(''), null)];

      const missingKey = cacheKeyOf(missing, VERSION);

      expect(missingKey).not.toBe(cacheKeyOf(empty, VERSION));
    });
  });

  describe('GIVEN another turbo version', () => {
    it('WHEN the key is computed THEN it differs', () => {
      const key = cacheKeyOf(FILES, '2.11.8');

      expect(key).not.toBe(cacheKeyOf(FILES, VERSION));
    });
  });

  describe('GIVEN graph packages', () => {
    it('WHEN no package is listed THEN the keyed paths are the root files, sorted', () => {
      const paths = keyedPathsOf([]);

      expect(paths).toStrictEqual(SORTED_ROOT_FILES);
    });

    it('WHEN no package is listed THEN the root .npmrc is keyed, since its link-workspace-packages changes turbo edges', () => {
      const paths = keyedPathsOf([]);

      expect(paths).toContain('.npmrc');
    });

    it('WHEN a visible and a definitions package are listed THEN both packages key their three files', () => {
      const web = graphPackage('web', 'apps/web', [], []);
      const definitions = graphPackage('e2e-1-atoms', 'tools/e2e-1-atoms', ['atomizer:definitions'], []);

      const paths = keyedPathsOf([web, definitions]);

      expect(paths).toStrictEqual(sortedWith(['apps/web', 'tools/e2e-1-atoms']));
    });

    it('WHEN a package path uses backslashes THEN its files are keyed with forward slashes', () => {
      const paths = keyedPathsOfDirs(['apps\\web']);

      expect(paths).toStrictEqual(sortedWith(['apps/web']));
    });

    it.each(ESCAPING_PATHS)('WHEN a package path is %j THEN it contributes nothing', (dir) => {
      const paths = keyedPathsOfDirs([dir]);

      expect(paths).toStrictEqual(SORTED_ROOT_FILES);
    });

    it('WHEN ./a/ and a are listed THEN a keys its files once, as a/…', () => {
      const paths = keyedPathsOfDirs(['./a/', 'a']);

      expect(paths).toStrictEqual(sortedWith(['a']));
    });
  });

  describe('GIVEN a keyed path read back from a cache file', () => {
    it.each(STORED_KEYED_PATHS)('WHEN it is %j THEN it is a keyed path', (path) => {
      const isKeyed = isKeyedPath(path);

      expect(isKeyed).toBe(true);
    });

    it.each(STORED_OTHER_PATHS)('WHEN it is %j THEN it is not a keyed path', (path) => {
      const isKeyed = isKeyedPath(path);

      expect(isKeyed).toBe(false);
    });
  });

  describe('GIVEN keyed files read around a spawn start', () => {
    it('WHEN a file was modified exactly 2 s before the start THEN it counts as edited', () => {
      const files = [keyedFile('a', 'x', null), keyedFile('b', 'x', STARTED_AT - 2000)];

      const isEdited = isEditedSince(files, STARTED_AT);

      expect(isEdited).toBe(true);
    });

    it('WHEN every file was modified earlier than that THEN none counts as edited', () => {
      const files = [keyedFile('a', 'x', STARTED_AT - 2001), keyedFile('b', 'x', 0)];

      const isEdited = isEditedSince(files, STARTED_AT);

      expect(isEdited).toBe(false);
    });

    it('WHEN no file has a modification time THEN none counts as edited', () => {
      const files = [keyedFile('a', MISSING_DIGEST, null)];

      const isEdited = isEditedSince(files, STARTED_AT);

      expect(isEdited).toBe(false);
    });
  });

  describe('GIVEN keyed files hashed after a spawn', () => {
    it('WHEN the root package.json is missing THEN a manifest vanished', () => {
      const files = [keyedFile('package.json', MISSING_DIGEST, null), keyedFile('apps/web/package.json', 'ccc', null)];

      const hasVanished = hasVanishedManifest(files);

      expect(hasVanished).toBe(true);
    });

    it('WHEN a graph package package.json is missing THEN a manifest vanished', () => {
      const files = [keyedFile('package.json', 'aaa', null), keyedFile('apps/web/package.json', MISSING_DIGEST, null)];

      const hasVanished = hasVanishedManifest(files);

      expect(hasVanished).toBe(true);
    });

    it('WHEN only a turbo.jsonc and a lockfile are missing THEN no manifest vanished', () => {
      const files = [...FILES, keyedFile('apps/web/turbo.jsonc', MISSING_DIGEST, null), keyedFile('yarn.lock', MISSING_DIGEST, null)];

      const hasVanished = hasVanishedManifest(files);

      expect(hasVanished).toBe(false);
    });
  });

  describe('GIVEN root keyed files hashed before and after a spawn', () => {
    it('WHEN no digest differs THEN no root file changed', () => {
      const hasChanged = hasChangedRootFile(FILES, FILES);

      expect(hasChanged).toBe(false);
    });

    it('WHEN a digest changed THEN a root file changed', () => {
      const after = withDigestChanged(0);

      const hasChanged = hasChangedRootFile(FILES, after);

      expect(hasChanged).toBe(true);
    });

    it('WHEN turbo.json went missing THEN a root file changed', () => {
      const after = FILES.map(toMissingTurboJson);

      const hasChanged = hasChangedRootFile(FILES, after);

      expect(hasChanged).toBe(true);
    });

    it('WHEN a path is absent from the after files THEN a root file changed', () => {
      const hasChanged = hasChangedRootFile(FILES, []);

      expect(hasChanged).toBe(true);
    });

    it('WHEN a missing turbo.json became present THEN a root file changed', () => {
      const before = FILES.map(toMissingTurboJson);

      const hasChanged = hasChangedRootFile(before, FILES);

      expect(hasChanged).toBe(true);
    });
  });

  describe('GIVEN root keyed files before a spawn', () => {
    it('WHEN each is hashed, missing or unreadable THEN none is hostile', () => {
      const files = [...FILES, keyedFile('.npmrc', UNREADABLE_DIGEST, null), keyedFile('yarn.lock', MISSING_DIGEST, null)];

      const hostile = hostileRootFile(files);

      expect(hostile).toBeUndefined();
    });

    it('WHEN one is not a regular file THEN it is the hostile one', () => {
      const fifo = keyedFile('turbo.json', NOT_REGULAR_DIGEST, null);

      const hostile = hostileRootFile([...FILES, fifo]);

      expect(hostile).toBe(fifo);
    });

    it('WHEN one is a regular file over the cap THEN it is the hostile one', () => {
      const large = keyedFile('pnpm-lock.yaml', 'over-cap:268435457:1000', 1000);

      const hostile = hostileRootFile([...FILES, large]);

      expect(hostile).toBe(large);
    });

    it('WHEN one read past the cap after a smaller stat size THEN it is the hostile one', () => {
      const procfs = keyedFile('pnpm-lock.yaml', OVER_CAP_READ_DIGEST, null);

      const hostile = hostileRootFile([...FILES, procfs]);

      expect(hostile).toBe(procfs);
    });

    it('WHEN two are hostile THEN the first is returned', () => {
      const first = keyedFile('.npmrc', NOT_REGULAR_DIGEST, null);
      const second = keyedFile('turbo.json', OVER_CAP_READ_DIGEST, null);

      const hostile = hostileRootFile([first, ...FILES, second]);

      expect(hostile).toBe(first);
    });
  });

  describe('GIVEN a workspace root', () => {
    it('WHEN its cache file is named THEN the name holds the first 16 hex of the root sha256', () => {
      const rootHash = sha256Of('/repo').slice(0, 16);

      const name = cacheFileName('/repo');

      expect(name).toBe(`workspace-${rootHash}.json`);
    });

    it('WHEN another root is named THEN its name differs', () => {
      const name = cacheFileName('/other');

      expect(name).not.toBe(cacheFileName('/repo'));
    });
  });
});
