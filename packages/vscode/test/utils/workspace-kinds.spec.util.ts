import { chmod, cp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS, fixtureFor } from '@turbo-console/repo-gen';

import { runEach } from './workspace.spec.util.ts';
import { devTurboPath } from '../../src/shared/test/utils/dev-turbo.spec.util.ts';
import { LATE_TURBO_COMMAND, LATE_TURBO_DIR } from '../common/launch.const.ts';
import type { LaunchName, LaunchTurboPath, LaunchWorkspace, PreparedWorkspace, RunScratch } from '../common/launch.type.ts';

const BAD_TURBO_JSON = '{ "tasks": { oops';

const NO_MATCH_WORKSPACE_YAML = 'packages:\n  - nothing/*\n';

const ERROR_ROOTS_WORKSPACE = '{ "folders": [{ "path": "bad" }, { "path": "empty" }] }\n';

const STUB_TURBO_SCRIPT = '#!/bin/sh\necho 2.12.0\n';

const EXECUTABLE_MODE = 0o755;

const devTurbo = devTurboPath();

const workspaceDirOf = (scratch: RunScratch, name: LaunchName): string => join(scratch.dir, `${name}-workspace`);

/** A single-folder window on `dir`. */
const folderWorkspace = (dir: string): PreparedWorkspace => {
  const prepared: PreparedWorkspace = { open: dir, folders: [dir] };

  return prepared;
};

/** A fresh `target-like` copy at `dir`, from repo-gen's cache, so no earlier launch's edits or turbo files reach it. */
const copyFixture = async (dir: string): Promise<void> => {
  const fixture = await fixtureFor(PRESETS['target-like']);
  const copy = async (): Promise<void> => cp(fixture.dir, dir, { recursive: true });

  await runEach([copy, fixture.dispose]);
};

/** `empty-folder`: an empty dir. */
const emptyFolder = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);

  await mkdir(dir, { recursive: true });

  return folderWorkspace(dir);
};

/** `fixture`: a `target-like` copy of the launch's own. */
const fixtureCopy = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);

  await copyFixture(dir);

  return folderWorkspace(dir);
};

/**
 * `error-roots`: a `.code-workspace` with two `target-like` copies, `bad` whose `turbo.json` is invalid JSON and `empty`
 * whose `pnpm-workspace.yaml` globs match no package (turbo 2.11.7 lists no packages and exits 0).
 */
const errorRoots = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);
  const bad = join(dir, 'bad');
  const empty = join(dir, 'empty');
  const file = join(dir, 'error-roots.code-workspace');

  await copyFixture(bad);
  await copyFixture(empty);
  await writeFile(join(bad, 'turbo.json'), BAD_TURBO_JSON);
  await writeFile(join(empty, 'pnpm-workspace.yaml'), NO_MATCH_WORKSPACE_YAML);
  await writeFile(file, ERROR_ROOTS_WORKSPACE);

  const prepared: PreparedWorkspace = { open: file, folders: [bad, empty] };

  return prepared;
};

/** A POSIX `turboPath` stub that prints `2.12.0` for any arguments, just outside the supported range. */
const stubTurbo = async (scratch: RunScratch): Promise<string> => {
  const path = join(scratch.dir, 'stub-turbo');

  await writeFile(path, STUB_TURBO_SCRIPT);
  await chmod(path, EXECUTABLE_MODE);

  return path;
};

/**
 * A POSIX `turboPath` whose folder is the literal `${command:…}` segment, so the extension finds the dev turbo binary
 * there, while VS Code runs the one in `LATE_TURBO_DIR` once the command answers.
 */
const lateTurbo = async (scratch: RunScratch): Promise<string> => {
  const dir = join(scratch.dir, 'late-turbo');
  const segment = join(dir, `\${command:${LATE_TURBO_COMMAND}}`);
  const resolved = join(dir, LATE_TURBO_DIR);

  await mkdir(segment, { recursive: true });
  await mkdir(resolved, { recursive: true });
  await symlink(devTurbo, join(segment, 'turbo'));
  await symlink(devTurbo, join(resolved, 'turbo'));

  return join(segment, 'turbo');
};

/** Each workspace kind's prep; a new `LaunchWorkspace` member fails to compile until it has one. */
export const WORKSPACES: Record<LaunchWorkspace, (scratch: RunScratch, name: LaunchName) => Promise<PreparedWorkspace>> = {
  'fixture-l1': async (scratch) => Promise.resolve(folderWorkspace(scratch.fixtureDir)),
  fixture: fixtureCopy,
  'empty-folder': emptyFolder,
  'error-roots': errorRoots
};

/** Each `turboPath` kind's setting value (`null` = unset); a new `LaunchTurboPath` member fails to compile until it has one. */
export const TURBO_PATHS: Record<LaunchTurboPath, (scratch: RunScratch) => Promise<string | null>> = {
  dev: async () => Promise.resolve(devTurbo),
  stub: stubTurbo,
  late: lateTurbo,
  unset: async () => Promise.resolve(null)
};
