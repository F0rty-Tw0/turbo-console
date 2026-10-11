import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Fixed identity and settings, so fresh CI runners, signing setups and Windows line-ending rewrites never change a commit. */
const GIT_CONFIG = [
  '-c',
  'user.name=fixture',
  '-c',
  'user.email=fixture@invalid',
  '-c',
  'commit.gpgsign=false',
  '-c',
  'core.autocrlf=false'
];

/** Runs `git <args>` in `dir` with no shell, so paths with spaces pass through untouched; resolves to stdout. */
export const git = async (dir: string, args: string[]): Promise<string> => {
  const options = { cwd: dir };
  const result = await execFileAsync('git', [...GIT_CONFIG, ...args], options);

  return result.stdout;
};
