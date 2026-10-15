import { execFile, spawn } from 'node:child_process';
import { existsSync, writeSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { turboEnv } from '../../utils/turbo-env.util.ts';

type SpawnReport = {
  readonly code: number | null;
  readonly stderr: string;
};

type PeakRunner = (binary: string, args: string[], cwd: string, dir: string) => Promise<number>;

const TIME = '/usr/bin/time';

const STRACE = '/usr/bin/strace';

const KIB = 1024;

const QUIET_STDIO: ['ignore', 'ignore', 'pipe'] = ['ignore', 'ignore', 'pipe'];

/** GNU `time -v` (Linux), in KiB. */
const MAX_RSS_KIB = /Maximum resident set size \(kbytes\): (\d+)/;

/** BSD `time -l` (macOS), already in bytes. */
const MAX_RSS_BYTES = /^\s*(\d+)\s+maximum resident set size/m;

const PEAK_BYTES = /peak-bytes (\d+)/;

const WINDOWS_DAEMON_PROBE = 'Get-Process turbo -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }';

const SUCCESSFUL_EXECVE = /execve\(.*\) = 0$/;

const execFileAsync = promisify(execFile);

/** Peak working set of a finished child, read from its still-open handle; the exit code passes through. */
const PEAK_SCRIPT = `param([string]$ArgsFile)
$all = Get-Content -Raw $ArgsFile | ConvertFrom-Json
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $all[0]
foreach ($arg in $all[1..($all.Count - 1)]) { $psi.ArgumentList.Add($arg) }
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $false
$p = [System.Diagnostics.Process]::Start($psi)
$p.WaitForExit()
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Psapi {
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_MEMORY_COUNTERS {
    public uint cb; public uint PageFaultCount;
    public UIntPtr PeakWorkingSetSize; public UIntPtr WorkingSetSize;
    public UIntPtr QuotaPeakPagedPoolUsage; public UIntPtr QuotaPagedPoolUsage;
    public UIntPtr QuotaPeakNonPagedPoolUsage; public UIntPtr QuotaNonPagedPoolUsage;
    public UIntPtr PagefileUsage; public UIntPtr PeakPagefileUsage;
  }
  [DllImport("psapi.dll", SetLastError = true)]
  public static extern bool GetProcessMemoryInfo(IntPtr process, out PROCESS_MEMORY_COUNTERS counters, uint size);
}
"@
$counters = New-Object Psapi+PROCESS_MEMORY_COUNTERS
$counters.cb = [System.Runtime.InteropServices.Marshal]::SizeOf($counters)
if (-not [Psapi]::GetProcessMemoryInfo($p.Handle, [ref]$counters, $counters.cb)) { throw 'GetProcessMemoryInfo failed' }
[Console]::Error.WriteLine("peak-bytes $($counters.PeakWorkingSetSize.ToUInt64())")
exit $p.ExitCode
`;

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

const isExitCodeOne = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 1;

/** Ids of turbo daemon processes still alive, or `none`; `pgrep` exits 1 when it matches nothing. */
export const daemonReport = async (): Promise<string> => {
  const isWindows = process.platform === 'win32';
  const file = isWindows ? 'pwsh' : 'pgrep';
  const windowsArgs = ['-NoProfile', '-Command', WINDOWS_DAEMON_PROBE];
  const posixArgs = ['-f', 'turbo.*daemon'];
  const args = isWindows ? windowsArgs : posixArgs;

  try {
    const { stdout } = await execFileAsync(file, args);

    return stdout.trim().replaceAll('\n', ',') || 'none';
  } catch (error) {
    const matchedNothing = isExitCodeOne(error);

    if (matchedNothing) return 'none';

    throw error;
  }
};

/** Writes straight to fd 2: vitest's default `silent: 'passed-only'` swallows `console` output of a passing case. */
export const logMeasurement = (line: string): void => {
  writeSync(process.stderr.fd, `${line}\n`);
};
