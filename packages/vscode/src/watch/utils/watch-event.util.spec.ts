import { describe, expect, it } from 'vitest';

import { isIgnoredPath, isPackageDelete, toRelative } from './watch-event.util.ts';

const PACKAGE_PATHS = ['apps/web', 'packages/a', 'packages/ab'];

describe('FEATURE: watcher event filters', () => {
  describe('GIVEN a POSIX root', () => {
    it('WHEN a path sits inside it THEN it is relative and posix', () => {
      const relative = toRelative('/ws', '/ws/packages/a/package.json');

      expect(relative).toBe('packages/a/package.json');
    });

    it('WHEN the path is the root THEN it is the root itself', () => {
      const relative = toRelative('/ws', '/ws');

      expect(relative).toBe('.');
    });

    it('WHEN a path sits in a sibling sharing its prefix THEN it is outside', () => {
      const relative = toRelative('/ws', '/ws-other/package.json');

      expect(relative).toBeNull();
    });

    it('WHEN a path sits above it THEN it is outside', () => {
      const relative = toRelative('/ws', '/package.json');

      expect(relative).toBeNull();
    });
  });

  describe('GIVEN a Windows root', () => {
    it('WHEN a path sits inside it THEN it is relative with posix separators', () => {
      const relative = toRelative('c:\\ws', 'c:\\ws\\packages\\a\\package.json');

      expect(relative).toBe('packages/a/package.json');
    });

    it('WHEN a path sits on another drive THEN it is outside', () => {
      const relative = toRelative('c:\\ws', 'd:\\ws\\package.json');

      expect(relative).toBeNull();
    });
  });

  describe('GIVEN a keyed file event', () => {
    it('WHEN its path runs through node_modules THEN it is ignored', () => {
      const isIgnored = isIgnoredPath('packages/a/node_modules/b/package.json');

      expect(isIgnored).toBe(true);
    });

    it('WHEN its Windows path runs through node_modules THEN it is ignored', () => {
      const isIgnored = isIgnoredPath('node_modules\\b\\package.json');

      expect(isIgnored).toBe(true);
    });

    it('WHEN a segment only starts with node_modules THEN it is kept', () => {
      const isIgnored = isIgnoredPath('packages/node_modules_a/package.json');

      expect(isIgnored).toBe(false);
    });

    it('WHEN its path is a package manifest THEN it is kept', () => {
      const isIgnored = isIgnoredPath('packages/a/package.json');

      expect(isIgnored).toBe(false);
    });
  });

  describe('GIVEN the package paths of the shown model', () => {
    it('WHEN a package dir is deleted THEN it is a package delete', () => {
      const isDelete = isPackageDelete('packages/a', PACKAGE_PATHS);

      expect(isDelete).toBe(true);
    });

    it('WHEN an ancestor of a package dir is deleted THEN it is a package delete', () => {
      const isDelete = isPackageDelete('packages', PACKAGE_PATHS);

      expect(isDelete).toBe(true);
    });

    it('WHEN a package dir is deleted with Windows separators THEN it is a package delete', () => {
      const isDelete = isPackageDelete('packages\\a', PACKAGE_PATHS);

      expect(isDelete).toBe(true);
    });

    it('WHEN a path that only shares a package prefix is deleted THEN it is not', () => {
      const isDelete = isPackageDelete('packages/a', ['packages/ab']);

      expect(isDelete).toBe(false);
    });

    it('WHEN a file inside a package is deleted THEN it is not', () => {
      const isDelete = isPackageDelete('packages/a/src/index.ts', PACKAGE_PATHS);

      expect(isDelete).toBe(false);
    });

    it('WHEN an unrelated path is deleted THEN it is not', () => {
      const isDelete = isPackageDelete('docs', PACKAGE_PATHS);

      expect(isDelete).toBe(false);
    });

    it('WHEN a node_modules path is deleted THEN it is not', () => {
      const isDelete = isPackageDelete('node_modules', ['node_modules/x']);

      expect(isDelete).toBe(false);
    });

    it('WHEN the root itself is the deleted path THEN it is not, even with a package at the root', () => {
      const isDelete = isPackageDelete('.', ['.']);

      expect(isDelete).toBe(false);
    });
  });
});
