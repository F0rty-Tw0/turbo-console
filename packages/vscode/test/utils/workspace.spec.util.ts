import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';

import type { RunScratch } from '../common/launch.type.ts';

/**
 * The integration run's scratch dir and its `target-like` fixture copy, kept for the whole run; the manifest goes to
 * `<scratch>/manifest.json`. `dispose` deletes both.
 */
export const createRunScratch = async (): Promise<RunScratch> => {
  const dir = await mkdtemp(join(tmpdir(), 'tc-it-'));
  const removeDir = async (): Promise<void> => rm(dir, { recursive: true, force: true });
  let dispose = removeDir;

  try {
    const fixture = await fixtureFor(PRESETS['target-like']);
    const manifestFile = join(dir, 'manifest.json');
    const manifestText = JSON.stringify(fixture.manifest);

    dispose = async (): Promise<void> => {
      await fixture.dispose();
      await removeDir();
    };

    const scratch: RunScratch = { dir, fixtureDir: fixture.dir, manifestFile, dispose };

    await writeFile(manifestFile, manifestText);

    return scratch;
  } catch (error) {
    await dispose();

    throw error;
  }
};

/**
 * A user-data dir under the scratch dir whose user settings set `turboConsole.turboPath` unless it is `null`; it is a
 * `machine`-scoped setting that a workspace's settings cannot set. Writing it again for a launch that reuses the dir
 * keeps its other state.
 */
export const userDataDirFor = async (scratch: RunScratch, name: string, turboPath: string | null): Promise<string> => {
  const userDataDir = join(scratch.dir, name);
  const userDir = join(userDataDir, 'User');
  const settings: Record<string, string> = {};

  if (turboPath !== null) settings['turboConsole.turboPath'] = turboPath;

  const settingsText = JSON.stringify(settings, null, 2);

  await mkdir(userDir, { recursive: true });
  await writeFile(join(userDir, 'settings.json'), settingsText);

  return userDataDir;
};
