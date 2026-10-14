import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';

import type { RunScratch } from '../common/launch.type.ts';

const reportLater = (error: unknown): void => {
  process.stderr.write(`also failed: ${String(error)}\n`);
};

/** Runs every step in turn even when one throws, then rethrows the first error; later ones go to stderr. */
export const runEach = async (steps: (() => Promise<void>)[]): Promise<void> => {
  const errors: unknown[] = [];

  for (const run of steps) {
    try {
      await run();
    } catch (error) {
      errors.push(error);
    }
  }

  const [first, ...later] = errors;

  for (const error of later) reportLater(error);

  if (errors.length > 0) throw first;
};

/**
 * The integration run's scratch dir and its `target-like` fixture copy, kept for the whole run; the manifest goes to
 * `<scratch>/manifest.json`. `dispose` deletes both, retrying a removal that fails while VS Code's child processes
 * still hold files (EBUSY on Windows).
 */
export const createRunScratch = async (): Promise<RunScratch> => {
  const dir = await mkdtemp(join(tmpdir(), 'tc-it-'));
  const removeDir = async (): Promise<void> => rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  let dispose = removeDir;

  try {
    const fixture = await fixtureFor(PRESETS['target-like']);
    const manifestFile = join(dir, 'manifest.json');
    const manifestText = JSON.stringify(fixture.manifest);

    dispose = async (): Promise<void> => runEach([fixture.dispose, removeDir]);

    const scratch: RunScratch = { dir, fixtureDir: fixture.dir, manifestFile, dispose };

    await writeFile(manifestFile, manifestText);

    return scratch;
  } catch (error) {
    // The setup error stays the one thrown; a failed cleanup only goes to stderr.
    const disposing = dispose();

    await disposing.catch(reportLater);

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
