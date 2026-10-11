import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** A hooks dir inside `.git` that git never creates, so no hook (repo, global or system) is found. */
const NO_HOOKS_DIR = join('.git', 'repo-gen-no-hooks');

/**
 * Fixed identity and settings, so fresh CI runners, signing setups, Windows line-ending rewrites, fsmonitor daemons
 * and the caller's hooks never change or slow a commit. Auto gc and maintenance are off: git 2.55 detaches them after
 * a large commit, and they repacked a fresh fixture while `fixtureFor` was copying it (ENOENT on `.git/objects/xx`).
 */
const GIT_CONFIG = [
  '-c',
  'gc.auto=0',
  '-c',
  'maintenance.auto=false',
  '-c',
  'user.name=fixture',
  '-c',
  'user.email=fixture@invalid',
  '-c',
  'commit.gpgsign=false',
  '-c',
  'core.autocrlf=false',
  '-c',
  'core.fsmonitor=false'
];

/** Windows env names are case-insensitive, so `Git_Dir` counts too. */
const isGitVariable = ([name]: [string, string | undefined]): boolean => name.toUpperCase().startsWith('GIT_');

/**
 * The caller's env minus every `GIT_*` variable: a test run from a git hook inherits `GIT_DIR`/`GIT_INDEX_FILE`,
 * which would point every command at the caller's repo instead of the fixture.
 */
const gitEnv = (): NodeJS.ProcessEnv => {
  const entries = Object.entries(process.env).filter((entry) => !isGitVariable(entry));

  return Object.fromEntries(entries);
};

/** Runs `git <args>` in `dir` with no shell, so paths with spaces pass through untouched; resolves to stdout. */
export const git = async (dir: string, args: string[]): Promise<string> => {
  const hooksPath = `core.hooksPath=${join(dir, NO_HOOKS_DIR)}`;
  const options = { cwd: dir, env: gitEnv() };
  const result = await execFileAsync('git', [...GIT_CONFIG, '-c', hooksPath, ...args], options);

  return result.stdout;
};
