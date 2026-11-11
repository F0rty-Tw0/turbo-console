import { chmod, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureSpec } from '@turbo-console/repo-gen';

import { featRepoOf } from './feat-repo.spec.util.ts';
import { copyFixture } from './fixture-copy.spec.util.ts';
import { initGit, writeEmptyWorkspace, writeSingleApp } from './single-package-fixture.spec.util.ts';
import { folderWorkspace, workspaceDirOf } from './workspace.spec.util.ts';
import { devTurboPath } from '../../src/shared/test/utils/dev-turbo.spec.util.ts';
import { ROOT_TASK_NAME } from '../common/graph.const.ts';
import { LATE_TURBO_COMMAND, LATE_TURBO_DIR } from '../common/launch.const.ts';
import type {
  LaunchName,
  LaunchTurboPath,
  LaunchWorkspace,
  PreparedWorkspace,
  RunScratch,
  WorkspacePrep
} from '../common/launch.type.ts';

const BAD_TURBO_JSON = '{ "tasks": { oops';

const NO_MATCH_WORKSPACE_YAML = 'packages:\n  - nothing/*\n';

const ERROR_ROOTS_WORKSPACE = '{ "folders": [{ "path": "bad" }, { "path": "empty" }] }\n';

const TWO_ROOTS_WORKSPACE = '{ "folders": [{ "path": "a" }, { "path": "b" }] }\n';

const STUB_TURBO_SCRIPT = '#!/bin/sh\necho 2.12.0\n';

const EXECUTABLE_MODE = 0o755;

const devTurbo = devTurboPath();

/** `empty-folder`: an empty dir. */
const emptyFolder = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);

  await mkdir(dir, { recursive: true });

  return folderWorkspace(dir);
};

/** A workspace prep that opens a fresh copy of `spec` in the launch's own dir. */
const fixtureCopyOf = (spec: FixtureSpec): WorkspacePrep => {
  const prepare = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
    const dir = workspaceDirOf(scratch, name);

    await copyFixture(dir, spec);

    return folderWorkspace(dir);
  };

  return prepare;
};

/** `fixture`: a `target-like` copy of the launch's own. */
const fixtureCopy = fixtureCopyOf(PRESETS['target-like']);

const ROOT_TASK = { name: ROOT_TASK_NAME, command: 'echo root' };

/** `fixture-root-task`: a `target-like` copy whose root has the real script `rootgen`, so turbo lists `//#rootgen` with a command. */
const rootTaskFixture = fixtureCopyOf({ ...PRESETS['target-like'], rootTask: ROOT_TASK });

/** `fixture-feat`: a `target-like` copy on branch `feat` with a README commit and an uncommitted leaf source edit. */
const featFixture = featRepoOf(PRESETS['target-like'], { uncommitted: true });

/** `fixture-feat-package`: `fixture-feat` with `futureFlags.affectedUsingTaskInputs` off, so turbo lists affected tasks per package. */
const featPackageFixture = featRepoOf({ ...PRESETS['target-like'], affectedUsingTaskInputs: false }, { uncommitted: true });

/** `fixture-feat-committed`: `fixture-feat` without the uncommitted edit, so every change is on the `feat` branch. */
const featCommittedFixture = featRepoOf(PRESETS['target-like'], { uncommitted: false });

/** `fixture-no-git`: a `target-like` copy without its `.git`; turbo lists and dry-runs it, but cannot compute the affected list. */
const noGitFixture = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);

  await copyFixture(dir);
  await rm(join(dir, '.git'), { recursive: true, force: true });

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

/** `two-roots`: a `.code-workspace` with two clean `target-like` copies, `a` and `b`. */
const twoRoots = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);
  const a = join(dir, 'a');
  const b = join(dir, 'b');
  const file = join(dir, 'two-roots.code-workspace');

  await copyFixture(a);
  await copyFixture(b);
  await writeFile(file, TWO_ROOTS_WORKSPACE);

  const prepared: PreparedWorkspace = { open: file, folders: [a, b] };

  return prepared;
};

/** `single-package`: `single-app`, a single-package repo, git-initialised without a commit. */
const singlePackage = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);

  await mkdir(dir, { recursive: true });
  await writeSingleApp(dir);
  await initGit(dir);

  return folderWorkspace(dir);
};

/** `empty-workspace`: `empty-ws`, whose `pnpm-workspace.yaml` declares `packages/*` and finds none, git-initialised without a commit. */
const emptyWorkspace = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
  const dir = workspaceDirOf(scratch, name);

  await mkdir(dir, { recursive: true });
  await writeEmptyWorkspace(dir);
  await initGit(dir);

  return folderWorkspace(dir);
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
export const WORKSPACES: Record<LaunchWorkspace, WorkspacePrep> = {
  'fixture-l1': async (scratch) => Promise.resolve(folderWorkspace(scratch.fixtureDir)),
  fixture: fixtureCopy,
  'fixture-root-task': rootTaskFixture,
  'fixture-feat': featFixture,
  'fixture-feat-package': featPackageFixture,
  'fixture-feat-committed': featCommittedFixture,
  'fixture-no-git': noGitFixture,
  'empty-folder': emptyFolder,
  'error-roots': errorRoots,
  'two-roots': twoRoots,
  'single-package': singlePackage,
  'empty-workspace': emptyWorkspace
};

/** Each `turboPath` kind's setting value (`null` = unset); a new `LaunchTurboPath` member fails to compile until it has one. */
export const TURBO_PATHS: Record<LaunchTurboPath, (scratch: RunScratch) => Promise<string | null>> = {
  dev: async () => Promise.resolve(devTurbo),
  stub: stubTurbo,
  late: lateTurbo,
  unset: async () => Promise.resolve(null)
};
