import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { detectPackageManager, readPackageManagerField } from './root-manifest.ts';
import { MAX_KEYED_FILE_BYTES, MISSING_DIGEST } from '../../cache/common/cache.const.ts';
import type { KeyedFile } from '../../cache/common/cache.type.ts';
import { NPM_BY_DEFAULT_STUB, YARN_BY_LOCKFILE_STUB } from '../test/stubs/package-manager.stub.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const keyed = (path: string, digest: string): KeyedFile => {
  const file: KeyedFile = { path, digest, mtimeMs: null };

  return file;
};

const PRESENT = keyed('yarn.lock', 'abc');

const ABSENT = keyed('pnpm-lock.yaml', MISSING_DIGEST);

const NESTED = keyed('packages/a/pnpm-lock.yaml', 'abc');

const OVER_CAP_MANIFEST = JSON.stringify({ packageManager: 'pnpm@9', padding: 'x'.repeat(MAX_KEYED_FILE_BYTES) });

/** Each manifest text a root can hold, and the `packageManager` value read from it. */
const FIELD_READS: [string, string, unknown][] = [
  ['a manager string', '{"packageManager":"yarn@4"}', 'yarn@4'],
  ['a number', '{"packageManager":42}', 42],
  ['no field', '{}', undefined],
  ['text that is not JSON', '{not json', undefined],
  ['a JSON null', 'null', undefined],
  ['a manifest over the keyed file cap', OVER_CAP_MANIFEST, undefined]
];

let tempDir = '';

describe('FEATURE: root manifest package manager', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'root-manifest-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  describe('GIVEN a root package.json', () => {
    it.each(FIELD_READS)('WHEN it holds %s THEN the field read is the expected value', async (_, text, expected) => {
      const root = await rootWithFiles(tempDir, { 'package.json': text });

      const field = await readPackageManagerField(root);

      expect(field).toStrictEqual(expected);
    });
  });

  describe('GIVEN a root with no readable package.json', () => {
    it('WHEN the root has none THEN the field read is undefined', async () => {
      const root = await rootWithFiles(tempDir, {});

      const field = await readPackageManagerField(root);

      expect(field).toBeUndefined();
    });

    it('WHEN package.json is a directory THEN the field read is undefined', async () => {
      const root = await rootWithFiles(tempDir, {});

      await mkdir(join(root, 'package.json'));

      const field = await readPackageManagerField(root);

      expect(field).toBeUndefined();
    });
  });

  describe('GIVEN the hashed root keyed files', () => {
    it('WHEN a lockfile has the missing digest THEN it is not present', async () => {
      const root = await rootWithFiles(tempDir, {});

      const packageManager = await detectPackageManager(root, [ABSENT]);

      expect(packageManager).toStrictEqual(NPM_BY_DEFAULT_STUB);
    });

    it('WHEN a lockfile has a real digest THEN it names the manager', async () => {
      const root = await rootWithFiles(tempDir, {});

      const packageManager = await detectPackageManager(root, [ABSENT, PRESENT]);

      expect(packageManager).toStrictEqual(YARN_BY_LOCKFILE_STUB);
    });

    it('WHEN a lockfile path is nested THEN it is not a root lockfile', async () => {
      const root = await rootWithFiles(tempDir, {});

      const packageManager = await detectPackageManager(root, [NESTED]);

      expect(packageManager).toStrictEqual(NPM_BY_DEFAULT_STUB);
    });

    it('WHEN the manifest is over the cap THEN its field is ignored and the lockfile decides', async () => {
      const root = await rootWithFiles(tempDir, { 'package.json': OVER_CAP_MANIFEST });

      const packageManager = await detectPackageManager(root, [PRESENT]);

      expect(packageManager).toStrictEqual(YARN_BY_LOCKFILE_STUB);
    });
  });
});
