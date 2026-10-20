import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { FIXTURE_PACKAGE_MANAGER, renderLockfile } from '@turbo-console/repo-gen';

import { SINGLE_APP_NAME } from '../common/single-package.const.ts';

const run = promisify(execFile);

const NOOP_SCRIPT = 'node -e 0';

const GITIGNORE = '.turbo/\n';

const EMPTY_WORKSPACE_YAML = 'packages:\n  - "packages/*"\n';

const SINGLE_APP_SCRIPTS: Record<string, string> = {
  build: NOOP_SCRIPT,
  lint: NOOP_SCRIPT,
  dev: NOOP_SCRIPT,
  'test:unit': NOOP_SCRIPT,
  format: NOOP_SCRIPT
};

const SINGLE_APP_MANIFEST: Record<string, unknown> = {
  name: SINGLE_APP_NAME,
  private: true,
  version: '1.0.0',
  packageManager: FIXTURE_PACKAGE_MANAGER,
  scripts: SINGLE_APP_SCRIPTS
};

const BUILD_TASK = { outputs: ['dist/**'] };

const DEV_TASK = { persistent: true, cache: false };

const TEST_UNIT_TASK = { dependsOn: ['build'] };

const SINGLE_APP_TASKS = { build: BUILD_TASK, lint: {}, dev: DEV_TASK, 'test:unit': TEST_UNIT_TASK };

const SINGLE_APP_TURBO = { tasks: SINGLE_APP_TASKS };

const EMPTY_WORKSPACE_SCRIPTS: Record<string, string> = { build: NOOP_SCRIPT, lint: NOOP_SCRIPT };

const EMPTY_WORKSPACE_MANIFEST: Record<string, unknown> = {
  name: 'empty-ws',
  private: true,
  version: '1.0.0',
  packageManager: FIXTURE_PACKAGE_MANAGER,
  scripts: EMPTY_WORKSPACE_SCRIPTS
};

const EMPTY_WORKSPACE_TASKS = { build: {} };

const EMPTY_WORKSPACE_TURBO = { tasks: EMPTY_WORKSPACE_TASKS };

const jsonText = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The files every fixture root holds: its manifest, `turbo.json`, pnpm's env lockfile rendered up front (so the first
 * run neither rewrites it nor downloads pnpm) and a `.gitignore` for `.turbo/`.
 */
const writeRootFiles = async (dir: string, manifest: Record<string, unknown>, turbo: unknown): Promise<void> => {
  const lockfile = renderLockfile([]);

  await writeFile(join(dir, 'package.json'), jsonText(manifest));
  await writeFile(join(dir, 'turbo.json'), jsonText(turbo));
  await writeFile(join(dir, lockfile.path), lockfile.content);
  await writeFile(join(dir, '.gitignore'), GITIGNORE);
};

/** Spec §2: a single-package repo, `single-app`, whose root `turbo.json` and scripts are all there is; no workspace file. */
export const writeSingleApp = async (dir: string): Promise<void> => {
  await writeRootFiles(dir, SINGLE_APP_MANIFEST, SINGLE_APP_TURBO);
};

/** Spec §6: workspaces declared (`packages/*`) and none present, with scripts and a bare `build` key at the root. */
export const writeEmptyWorkspace = async (dir: string): Promise<void> => {
  await writeRootFiles(dir, EMPTY_WORKSPACE_MANIFEST, EMPTY_WORKSPACE_TURBO);
  await writeFile(join(dir, 'pnpm-workspace.yaml'), EMPTY_WORKSPACE_YAML);
  await mkdir(join(dir, 'packages'), { recursive: true });
};

/** `git init` in `dir`, with no commit and no identity: the turbo probes showed none is needed. */
export const initGit = async (dir: string): Promise<void> => {
  await run('git', ['init', '--quiet'], { cwd: dir });
};
