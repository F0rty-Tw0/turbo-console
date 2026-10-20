import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { detectPackageManager, readManifestFields } from './root-manifest.ts';
import { MAX_KEYED_FILE_BYTES, MISSING_DIGEST } from '../../cache/common/cache.const.ts';
import type { KeyedFile } from '../../cache/common/cache.type.ts';
import type { ManifestFields } from '../common/manifest-fields.type.ts';
import { NO_MANIFEST_FIELDS } from '../common/package-manager.const.ts';
import { NPM_BY_DEFAULT_STUB, PNPM_BY_DEV_ENGINES_STUB, YARN_BY_LOCKFILE_STUB } from '../test/stubs/package-manager.stub.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const keyed = (path: string, digest: string): KeyedFile => {
  const file: KeyedFile = { path, digest, mtimeMs: null };

  return file;
};

const PRESENT = keyed('yarn.lock', 'abc');

const ABSENT = keyed('pnpm-lock.yaml', MISSING_DIGEST);

const NESTED = keyed('packages/a/pnpm-lock.yaml', 'abc');

const OVER_CAP_MANIFEST = JSON.stringify({ packageManager: 'pnpm@9', padding: 'x'.repeat(MAX_KEYED_FILE_BYTES) });

const fieldsOf = (packageManager: unknown, devEnginesManager: unknown, name?: unknown, workspaces?: unknown): ManifestFields => {
  const fields: ManifestFields = { packageManager, devEnginesManager, name, workspaces };

  return fields;
};

const DEV_ENGINES_PNPM = '{"devEngines":{"packageManager":{"name":"pnpm"}}}';

const NAMED_MANIFEST = '{"name":"single-app","workspaces":["packages/*"]}';

const BOTH_MANIFEST = '{"packageManager":"yarn@4","devEngines":{"packageManager":[{"name":"pnpm"}]},"name":"x"}';

/** Each manifest text a root can hold, and the two values read from it in one parse. */
const FIELD_READS: [string, string, ManifestFields][] = [
  ['a manager string', '{"packageManager":"yarn@4"}', fieldsOf('yarn@4', undefined)],
  ['a number', '{"packageManager":42}', fieldsOf(42, undefined)],
  ['devEngines.packageManager as an object', DEV_ENGINES_PNPM, fieldsOf(undefined, { name: 'pnpm' })],
  ['both fields and a name', BOTH_MANIFEST, fieldsOf('yarn@4', [{ name: 'pnpm' }], 'x')],
  ['a name', '{"name":"single-app"}', fieldsOf(undefined, undefined, 'single-app')],
  ['a name that is no string, unchecked', '{"name":42}', fieldsOf(undefined, undefined, 42)],
  ['workspaces as an array', '{"workspaces":["a"]}', fieldsOf(undefined, undefined, undefined, ['a'])],
  ['workspaces as an object', '{"workspaces":{"packages":["a"]}}', fieldsOf(undefined, undefined, undefined, { packages: ['a'] })],
  ['devEngines that is no object', '{"devEngines":"pnpm"}', fieldsOf(undefined, undefined)],
  ['devEngines without a packageManager', '{"devEngines":{"runtime":{}}}', fieldsOf(undefined, undefined)],
  ['no field', '{}', NO_MANIFEST_FIELDS],
  ['text that is not JSON', '{not json', NO_MANIFEST_FIELDS],
  ['a JSON null', 'null', NO_MANIFEST_FIELDS],
  ['a manifest over the keyed file cap', OVER_CAP_MANIFEST, NO_MANIFEST_FIELDS]
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
    it.each(FIELD_READS)('WHEN it holds %s THEN the read is the expected fields', async (_, text, expected) => {
      const root = await rootWithFiles(tempDir, { 'package.json': text });

      const fields = await readManifestFields(root);

      expect(fields).toStrictEqual(expected);
    });
  });

  describe('GIVEN a root with no readable package.json', () => {
    it('WHEN the root has none THEN the read is empty', async () => {
      const root = await rootWithFiles(tempDir, {});

      const fields = await readManifestFields(root);

      expect(fields).toStrictEqual(NO_MANIFEST_FIELDS);
    });

    it('WHEN package.json is a directory THEN the read is empty', async () => {
      const root = await rootWithFiles(tempDir, {});

      await mkdir(join(root, 'package.json'));

      const fields = await readManifestFields(root);

      expect(fields).toStrictEqual(NO_MANIFEST_FIELDS);
    });
  });

  describe('GIVEN the hashed root keyed files', () => {
    it('WHEN a lockfile has the missing digest THEN it is not present', async () => {
      const root = await rootWithFiles(tempDir, {});

      const { packageManager } = await detectPackageManager(root, [ABSENT]);

      expect(packageManager).toStrictEqual(NPM_BY_DEFAULT_STUB);
    });

    it('WHEN a lockfile has a real digest THEN it names the manager', async () => {
      const root = await rootWithFiles(tempDir, {});

      const { packageManager } = await detectPackageManager(root, [ABSENT, PRESENT]);

      expect(packageManager).toStrictEqual(YARN_BY_LOCKFILE_STUB);
    });

    it('WHEN a lockfile path is nested THEN it is not a root lockfile', async () => {
      const root = await rootWithFiles(tempDir, {});

      const { packageManager } = await detectPackageManager(root, [NESTED]);

      expect(packageManager).toStrictEqual(NPM_BY_DEFAULT_STUB);
    });

    it('WHEN the manifest names devEngines and a lockfile is present THEN devEngines wins', async () => {
      const root = await rootWithFiles(tempDir, { 'package.json': DEV_ENGINES_PNPM });

      const { packageManager } = await detectPackageManager(root, [PRESENT]);

      expect(packageManager).toStrictEqual(PNPM_BY_DEV_ENGINES_STUB);
    });

    it('WHEN the manifest holds a name and workspaces THEN they come back beside the manager', async () => {
      const root = await rootWithFiles(tempDir, { 'package.json': NAMED_MANIFEST });

      const detected = await detectPackageManager(root, [PRESENT]);

      expect(detected).toStrictEqual({ packageManager: YARN_BY_LOCKFILE_STUB, name: 'single-app', workspaces: ['packages/*'] });
    });

    it('WHEN the manifest is over the cap THEN its field is ignored and the lockfile decides', async () => {
      const root = await rootWithFiles(tempDir, { 'package.json': OVER_CAP_MANIFEST });

      const { packageManager } = await detectPackageManager(root, [PRESENT]);

      expect(packageManager).toStrictEqual(YARN_BY_LOCKFILE_STUB);
    });
  });
});
