import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runTests, runVSCodeCommand } from '@vscode/test-electron';

import { BACKDATE_MS, LAUNCHES, SUITE_ENV_KEY } from './common/launch.const.ts';
import type { Launch, LaunchTurboPath, LaunchWorkspace, RunScratch, SuiteEnv } from './common/launch.type.ts';
import { VSCODE_TEST_VERSION } from './integration.const.ts';
import { backdateTree } from './utils/backdate.spec.util.ts';
import { createRunScratch, runEach, userDataDirFor } from './utils/workspace.spec.util.ts';
import { devTurboPath } from '../src/shared/test/utils/dev-turbo.spec.util.ts';

const CI_BUDGET_FACTOR = 3;

const X11_ARGS = ['--ozone-platform=x11'];

const NO_ARGS: string[] = [];

const packageRoot = resolve(import.meta.dirname, '..');
const vsixPath = resolve(packageRoot, '.vsix/turbo-console.vsix');
const extensionDevelopmentPath = resolve(import.meta.dirname, 'harness');
const cachePath = resolve(packageRoot, '.vscode-test');
const installOptions = { cachePath, version: VSCODE_TEST_VERSION };
const isLinux = process.platform === 'linux';
const ci = process.env['CI'];
const isCi = ci !== undefined && ci !== '' && ci !== 'false';
const budgetFactor = isCi ? CI_BUDGET_FACTOR : 1;

/** Each workspace kind's folder; a new `LaunchWorkspace` member fails to compile until it has one. */
const WORKSPACE_DIRS: Record<LaunchWorkspace, (scratch: RunScratch) => string> = {
  'fixture-l1': (scratch) => scratch.fixtureDir
};

/** Each `turboPath` kind's setting value (`null` = unset); a new `LaunchTurboPath` member fails to compile until it has one. */
const TURBO_PATHS: Record<LaunchTurboPath, (devTurbo: string) => string | null> = {
  dev: (devTurbo) => devTurbo
};

/** The launches this OS runs: POSIX-only ones are skipped on Windows. */
const launchesFor = (platform: NodeJS.Platform): Launch[] => {
  const isWindows = platform === 'win32';

  return LAUNCHES.filter((launch) => !launch.posixOnly || !isWindows);
};

/**
 * One VS Code window: backdates the workspace's keyed files, writes the user settings, then runs the launch's bundled
 * suite and checks it wrote its done-marker, so a launch that exits 0 without running its suite fails. On Linux
 * `--ozone-platform=x11` keeps Electron on the Xvfb display.
 */
const runLaunch = async (launch: Launch, scratch: RunScratch, devTurbo: string): Promise<void> => {
  const workspace = WORKSPACE_DIRS[launch.workspace](scratch);
  const turboPath = TURBO_PATHS[launch.turboPath](devTurbo);
  const userDataDir = await userDataDirFor(scratch, launch.userData, turboPath);
  const doneFile = join(scratch.dir, `${launch.name}.done`);
  const suiteEnv: SuiteEnv = { manifestFile: scratch.manifestFile, turboPath, budgetFactor, doneFile };
  const suiteEnvText = JSON.stringify(suiteEnv);
  const extensionTestsEnv = { ...launch.env, [SUITE_ENV_KEY]: suiteEnvText };
  const extensionTestsPath = resolve(packageRoot, `dist-test/${launch.suite}.cjs`);
  const platformArgs = isLinux ? X11_ARGS : NO_ARGS;
  const launchArgs = [workspace, `--user-data-dir=${userDataDir}`, ...platformArgs];
  const testOptions = {
    cachePath,
    version: VSCODE_TEST_VERSION,
    extensionDevelopmentPath,
    extensionTestsPath,
    extensionTestsEnv,
    launchArgs
  };

  await backdateTree(workspace, BACKDATE_MS);
  process.stdout.write(`launch ${launch.name} (${launch.suite})\n`);
  await runTests(testOptions);

  const isDone = existsSync(doneFile);

  if (!isDone) throw new Error(`launch ${launch.name} exited 0 but its suite never wrote ${doneFile}`);
};

// With WAYLAND_DISPLAY set, Electron ignores Xvfb and opens a real window on the user's desktop.
delete process.env['WAYLAND_DISPLAY'];

await runVSCodeCommand(['--install-extension', vsixPath], installOptions);

const devTurbo = devTurboPath();
const scratch = await createRunScratch();

const runLaunches = async (): Promise<void> => {
  for (const launch of launchesFor(process.platform)) await runLaunch(launch, scratch, devTurbo);
};

await runEach([runLaunches, scratch.dispose]);
