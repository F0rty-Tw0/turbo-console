import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { commitBaseRepo } from './fixture-generation.ts';
import { FIXTURE_CACHE_VERSION } from '../common/fixture.const.ts';
import type { FixtureFile, FixtureHandle, FixtureSpec } from '../common/fixture.type.ts';
import { copyFixture, createTempDir, pathExists, privateTempDir, removeDir, renameDir } from '../data-access/fixture-files.ts';
import { buildManifest } from '../utils/build-manifest.util.ts';
import { fixtureKey } from '../utils/fixture-key.util.ts';
import { planFixture, renderFixtureFiles } from '../utils/render-fixture.util.ts';

const CACHE_ROOT_NAME = 'turbo-console-fixtures';

const generateInto = async (scratchDir: string, files: FixtureFile[]): Promise<void> => {
  try {
    await commitBaseRepo(scratchDir, files);
  } catch (error) {
    await removeDir(scratchDir);

    throw error;
  }
};

/**
 * Generates beside the cache dir and renames into place, so a cache dir is either absent or complete; the scratch dir
 * is removed on every failure. Losing the rename to another worker surfaces as any error (`ENOTEMPTY`/`EEXIST`,
 * `EPERM` on Windows); the winner's copy is kept.
 */
const fillCache = async (files: FixtureFile[], cacheDir: string): Promise<void> => {
  const scratchDir = `${cacheDir}.tmp-${process.pid}-${randomUUID()}`;

  await generateInto(scratchDir, files);

  try {
    await renameDir(scratchDir, cacheDir);
  } catch (error) {
    const hasWinner = await pathExists(cacheDir);

    await removeDir(scratchDir);

    if (!hasWinner) throw error;
  }
};

/**
 * A private copy of the fixture for `spec`. The repo is generated once per rendered output and git step into
 * `<private temp root>/<fixtureKey(FIXTURE_CACHE_VERSION, rendered files)>`, so a generator change never serves a stale cache.
 * The root is `privateTempDir('turbo-console-fixtures')`. The manifest comes from the same plan, so the cache holds only the repo.
 */
export const fixtureFor = async (spec: FixtureSpec): Promise<FixtureHandle> => {
  const plan = planFixture(spec);
  const files = renderFixtureFiles(plan);
  const cacheRoot = await privateTempDir(CACHE_ROOT_NAME);
  const cacheDir = join(cacheRoot, fixtureKey(FIXTURE_CACHE_VERSION, files));
  const isCached = await pathExists(cacheDir);

  if (!isCached) await fillCache(files, cacheDir);

  const dir = await createTempDir('turbo-console-fixture-');

  await copyFixture(cacheDir, dir);

  const manifest = buildManifest(plan, plan.atomGroups);
  const dispose = async (): Promise<void> => removeDir(dir);
  const handle: FixtureHandle = { dir, manifest, dispose };

  return handle;
};
