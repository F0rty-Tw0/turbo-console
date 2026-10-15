import { execFile } from 'node:child_process';
import type { ExecFileOptionsWithStringEncoding } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import type { RssDeps } from '../common/turbo.type.ts';
import { parseProcStatus, parsePsRss, parseTasklistCsv } from '../utils/rss-parse.util.ts';
import { system32Path } from '../utils/system32-path.util.ts';

const PS_OPTIONS: ExecFileOptionsWithStringEncoding = { encoding: 'utf8', timeout: 2000, maxBuffer: 64 * 1024 };
const TASKLIST_OPTIONS: ExecFileOptionsWithStringEncoding = { ...PS_OPTIONS, windowsHide: true };

const DEFAULT_RSS_DEPS: RssDeps = { platform: process.platform, exec: execFile, readFile };

/** Stdout of `file`, or `null` when it failed or timed out (execFile's own `timeout` kills it). */
const stdoutOf = async (
  exec: RssDeps['exec'],
  file: string,
  args: string[],
  options: ExecFileOptionsWithStringEncoding
): Promise<string | null> => {
  const { promise, resolve } = Promise.withResolvers<string | null>();

  exec(file, args, options, (error, stdout) => resolve(error === null ? stdout : null));

  return promise;
};

const psRss = async (pid: number, exec: RssDeps['exec']): Promise<number | null> => {
  const stdout = await stdoutOf(exec, '/bin/ps', ['-o', 'rss=', '-p', String(pid)], PS_OPTIONS);

  if (stdout === null) return null;

  return parsePsRss(stdout);
};

const tasklistRss = async (pid: number, exec: RssDeps['exec']): Promise<number | null> => {
  const tasklist = system32Path('tasklist.exe', process.env['SystemRoot']);
  const stdout = await stdoutOf(exec, tasklist, ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], TASKLIST_OPTIONS);

  if (stdout === null) return null;

  return parseTasklistCsv(stdout, pid);
};

const procRss = async (pid: number, read: RssDeps['readFile']): Promise<number | null> => {
  try {
    const text = await read(`/proc/${pid}/status`, 'utf8');

    return parseProcStatus(text);
  } catch {
    return null;
  }
};

/**
 * Resident bytes of `pid`, or `null` when they cannot be read: the process is gone, the output does not parse, or the
 * probe failed or timed out. darwin: `ps`; win32: `tasklist`, both by absolute path and without a shell; any other
 * platform: procfs. Never rejects.
 */
export const rssOf = async (pid: number, deps: RssDeps = DEFAULT_RSS_DEPS): Promise<number | null> => {
  if (deps.platform === 'darwin') return psRss(pid, deps.exec);

  if (deps.platform === 'win32') return tasklistRss(pid, deps.exec);

  return procRss(pid, deps.readFile);
};
