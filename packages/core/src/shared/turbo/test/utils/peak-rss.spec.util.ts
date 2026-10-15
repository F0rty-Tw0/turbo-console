import { spawn } from 'node:child_process';
import { existsSync, writeSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { turboEnv } from '../../utils/turbo-env.util.ts';
import {
  KIB,
  MAX_RSS_BYTES,
  MAX_RSS_KIB,
  PEAK_BYTES,
  PEAK_SCRIPT,
  QUIET_STDIO,
  STRACE,
  SUCCESSFUL_EXECVE,
  TIME
} from '../common/peak-rss.const.ts';

type SpawnReport = {
  readonly code: number | null;
  readonly stderr: string;
};

type PeakRunner = (binary: string, args: string[], cwd: string, dir: string) => Promise<number>;

/** Spawns with the hardened turbo env; stdout (~10 MB for the package graph) is discarded, never buffered. */
const spawnQuietly = async (file: string, args: string[], cwd: string): Promise<SpawnReport> => {
  const options = { cwd, env: turboEnv(process.env), stdio: QUIET_STDIO, windowsHide: true };
  const child = spawn(file, args, options);
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });

  const [chunks, code] = await Promise.all([child.stderr.toArray(), exited]);
  const stderr = Buffer.concat(chunks).toString('utf8');

  const report: SpawnReport = { code, stderr };

  return report;
};

const assertExitZero = (run: SpawnReport): void => {
  if (run.code === 0) return;

  throw new Error(`exit code ${run.code}: ${run.stderr.slice(-500)}`);
};

const numberFrom = (pattern: RegExp, report: string): number => {
  const captured = pattern.exec(report)?.[1];

  if (captured === undefined) throw new Error(`no peak in the report: ${report.slice(-500)}`);

  return Number(captured);
};

const linuxPeak: PeakRunner = async (binary, args, cwd, dir) => {
  const reportFile = join(dir, 'time.txt');
  const run = await spawnQuietly(TIME, ['-v', '-o', reportFile, binary, ...args], cwd);

  assertExitZero(run);

  const report = await readFile(reportFile, 'utf8');

  return numberFrom(MAX_RSS_KIB, report) * KIB;
};

const macPeak: PeakRunner = async (binary, args, cwd) => {
  const run = await spawnQuietly(TIME, ['-l', binary, ...args], cwd);

  assertExitZero(run);

  return numberFrom(MAX_RSS_BYTES, run.stderr);
};

const windowsPeak: PeakRunner = async (binary, args, cwd, dir) => {
  const scriptFile = join(dir, 'peak.ps1');
  const argsFile = join(dir, 'args.json');

  await writeFile(scriptFile, PEAK_SCRIPT);
  await writeFile(argsFile, JSON.stringify([binary, ...args]));

  const pwshArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptFile, argsFile];
  const run = await spawnQuietly('pwsh', pwshArgs, cwd);

  assertExitZero(run);

  return numberFrom(PEAK_BYTES, run.stderr);
};

const PEAK_RUNNERS: Partial<Record<NodeJS.Platform, PeakRunner>> = { win32: windowsPeak, darwin: macPeak };

const inTempDir = async <T>(use: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(join(tmpdir(), 'turbo-console-rss-'));

  try {
    return await use(dir);
  } finally {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  }
};

/** Peak resident bytes of one `binary ...args` run in `cwd` (Windows: peak working set). Throws on a non-zero exit. */
export const peakRssBytes = async (binary: string, args: string[], cwd: string): Promise<number> => {
  const runner = PEAK_RUNNERS[process.platform] ?? linuxPeak;

  return inTempDir(async (dir) => runner(binary, args, cwd, dir));
};

/**
 * Processes turbo's run executed below itself, from a second run under `strace -f`: successful `execve` calls minus
 * turbo's own. `null` when this is not Linux or `strace` is missing.
 */
export const execveChildCount = async (binary: string, args: string[], cwd: string): Promise<number | null> => {
  const hasStrace = existsSync(STRACE);

  if (process.platform !== 'linux' || !hasStrace) return null;

  return inTempDir(async (dir) => {
    const logFile = join(dir, 'strace.log');
    const run = await spawnQuietly(STRACE, ['-f', '-e', 'trace=execve', '-o', logFile, binary, ...args], cwd);

    assertExitZero(run);

    const log = await readFile(logFile, 'utf8');
    const lines = log.split('\n');
    const executed = lines.filter((line) => SUCCESSFUL_EXECVE.test(line));

    return executed.length - 1;
  });
};

/** Writes straight to fd 2: vitest's default `silent: 'passed-only'` swallows `console` output of a passing case. */
export const logMeasurement = (line: string): void => {
  writeSync(process.stderr.fd, `${line}\n`);
};
