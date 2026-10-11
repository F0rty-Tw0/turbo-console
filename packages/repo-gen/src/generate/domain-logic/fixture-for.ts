import { randomUUID } from 'node:crypto';

import { commitBaseRepo } from './fixture-generation.ts';
import type { FixtureFile, FixtureHandle, FixtureSpec } from '../common/fixture.type.ts';
import { copyFixture, createTempDir, pathExists, removeDir, renameDir, tempPath } from '../data-access/fixture-files.ts';
import { buildManifest } from '../utils/build-manifest.util.ts';
import { fixtureKey } from '../utils/fixture-key.util.ts';
import { planFixture, renderFixtureFiles } from '../utils/render-fixture.util.ts';

const CACHE_ROOT = 'turbo-console-fixtures';

const generateInto = async (scratchDir: string, files: FixtureFile[]): Promise<void> => {
  try {
    await commitBaseRepo(scratchDir, files);
  } catch (error) {
    await removeDir(scratchDir);

    throw error;
  }
};

/**
 * Generates beside the cache dir and renames into place, so a cache dir is either absent or complete; a failed generation removes its dir.
 * Losing the rename to another worker surfaces as any error (`ENOTEMPTY`/`EEXIST`, `EPERM` on Windows); the winner's copy is kept.
 */
const fillCache = async (files: FixtureFile[], cacheDir: string): Promise<void> => {
  const scratchDir = `${cacheDir}.tmp-${process.pid}-${randomUUID()}`;

  await generateInto(scratchDir, files);

  try {
    await renameDir(scratchDir, cacheDir);
  } catch (error) {
    const hasWinner = await pathExists(cacheDir);

    if (!hasWinner) throw error;

    await removeDir(scratchDir);
  }
};

/**
 * A private copy of the fixture for `spec`. The repo is generated once per rendered output into
 * `<os temp>/turbo-console-fixtures/<fixtureKey of the rendered files>`, so a generator change never serves a stale cache.
 * The manifest comes from the same plan, so the cache holds only the repo.
 */
export const fixtureFor = async (spec: FixtureSpec): Promise<FixtureHandle> => {
  const plan = planFixture(spec);
  const files = renderFixtureFiles(plan);
  const cacheDir = tempPath(CACHE_ROOT, fixtureKey(files));
  const isCached = await pathExists(cacheDir);

  if (!isCached) await fillCache(files, cacheDir);

  const dir = await createTempDir('turbo-console-fixture-');

  await copyFixture(cacheDir, dir);

  const manifest = buildManifest(plan, plan.atomGroups);
  const dispose = async (): Promise<void> => removeDir(dir);
  const handle: FixtureHandle = { dir, manifest, dispose };

  return handle;
};
