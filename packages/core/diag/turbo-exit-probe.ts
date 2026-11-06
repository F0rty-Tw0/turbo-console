// F-U7-17 diagnostic probe: launches turbo on fresh target-like fixture copies, as the run-summary contract spec does,
// and records every launch that has not closed after STALL_MS (descendant processes, output so far). Diag branch only.
import { execFile, spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { fixtureFor, PRESETS, warmFixtureCache } from '@turbo-console/repo-gen';
import type { FixtureHandle } from '@turbo-console/repo-gen';

import { devTurboPath } from '../src/shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { turboEnv } from '../src/shared/turbo/utils/turbo-env.util.ts';

type ProcRow = { pid: number; ppid: number; name: string; commandLine: string; created: string };

type Snapshot = { atMs: number; descendants: ProcRow[]; gitOrTurboAnywhere: ProcRow[]; error?: string };

type Launch = {
  index: number;
  worker: number;
  exitCode: number | null;
  signal: string | null;
  exitMs: number | null;
  closeMs: number | null;
  stalled: boolean;
  killed: boolean;
  cacheEntries: number | null;
  tasksLine: string | null;
  spawnError?: string;
  disposeError?: string;
};

type Hang = {
  index: number;
  pid: number | undefined;
  exitMs: number | null;
  closeMs: number | null;
  stallSeconds: number;
  killed: boolean;
  snapshots: Snapshot[];
  lastStderr: string[];
  dir: string;
};

type GitSlow = { index: number; ms: number; error?: string };

const IS_WINDOWS = process.platform === 'win32';

const ARM = process.env['PROBE_ARM'] ?? 'A';

const SHARD = process.env['PROBE_SHARD'] ?? '0';

const OUT = process.env['PROBE_OUT'] ?? join(process.cwd(), 'probe-out');

const MAX_LAUNCHES = Number(process.env['PROBE_LAUNCHES'] ?? Number.POSITIVE_INFINITY);

const MINUTES = Number(process.env['PROBE_MINUTES'] ?? 25);

const CONCURRENCY = Number(process.env['PROBE_CONCURRENCY'] ?? 4);

const GIT_SPAWNS = Number(process.env['PROBE_GIT_SPAWNS'] ?? 0);

/** Override only to smoke the stall path locally. */
const STALL_MS = Number(process.env['PROBE_STALL_MS'] ?? 15_000);

/** A second snapshot, to see what is still alive deep into a stall. */
const LATE_SNAPSHOT_MS = Number(process.env['PROBE_LATE_SNAPSHOT_MS'] ?? 60_000);

const KILL_MS = Number(process.env['PROBE_KILL_MS'] ?? 120_000);

const GIT_SLOW_MS = 5000;

const TURBO = devTurboPath();

const BASE_ARGS = ['--skip-infer', 'run', 'build', '--summarize', '--log-order=stream', '-vvv'];

const ARGS = ARM === 'B' ? [...BASE_ARGS, '--cache=local:r'] : BASE_ARGS;

const ENV = turboEnv(process.env);

const PS_COMMAND =
  "$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine,@{n='Created';e={if ($_.CreationDate) { $_.CreationDate.ToString('o') }}} | ConvertTo-Json -Compress";

const execText = async (file: string, args: string[], options: { cwd?: string; timeoutMs: number }): Promise<string> => {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const execOptions = { cwd: options.cwd, env: ENV, timeout: options.timeoutMs, maxBuffer: 64 * 1024 * 1024, windowsHide: true };

  execFile(file, args, execOptions, (error, stdout) => (error === null ? resolve(stdout) : reject(error)));

  return promise;
};

const windowsRows = async (): Promise<ProcRow[]> => {
  const text = await execText('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', PS_COMMAND], { timeoutMs: 30_000 });
  const parsed: unknown = JSON.parse(text);
  const list: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];

  return list.map((row) => ({
    pid: Number(row['ProcessId']),
    ppid: Number(row['ParentProcessId']),
    name: String(row['Name'] ?? ''),
    commandLine: String(row['CommandLine'] ?? ''),
    created: String(row['Created'] ?? '')
  }));
};

const posixRows = async (): Promise<ProcRow[]> => {
  const text = await execText('ps', ['-eo', 'pid=,ppid=,lstart=,comm=,args='], { timeoutMs: 30_000 });
  const lines = text.split('\n').filter((line) => line.trim() !== '');

  return lines.map((line) => {
    const parts = line.trim().split(/\s+/);
    const created = parts.slice(2, 7).join(' ');

    return { pid: Number(parts[0]), ppid: Number(parts[1]), name: parts[7] ?? '', commandLine: parts.slice(8).join(' '), created };
  });
};

const descendantsOf = (rows: ProcRow[], rootPid: number): ProcRow[] => {
  const found: ProcRow[] = [];
  const queue = [rootPid];

  while (queue.length > 0) {
    const parent = queue.shift();
    const children = rows.filter((row) => row.ppid === parent && row.pid !== parent);

    for (const child of children) {
      found.push(child);
      queue.push(child.pid);
    }
  }

  return found;
};

const snapshot = async (pid: number | undefined, startedAt: number): Promise<Snapshot> => {
  const atMs = Math.round(performance.now() - startedAt);

  try {
    const rows = IS_WINDOWS ? await windowsRows() : await posixRows();
    const self = rows.filter((row) => row.pid === pid);
    const descendants = pid === undefined ? [] : [...self, ...descendantsOf(rows, pid)];
    const gitOrTurboAnywhere = rows.filter((row) => /^(git|turbo)/i.test(row.name));

    return { atMs, descendants, gitOrTurboAnywhere };
  } catch (error) {
    return { atMs, descendants: [], gitOrTurboAnywhere: [], error: String(error) };
  }
};

const killTree = async (child: ChildProcess): Promise<void> => {
  if (child.pid === undefined) return;

  if (!IS_WINDOWS) {
    child.kill('SIGKILL');

    return;
  }

  await execText('taskkill', ['/T', '/F', '/PID', String(child.pid)], { timeoutMs: 30_000 }).catch(() => '');
};

const countCacheEntries = async (dir: string): Promise<number | null> => {
  try {
    const entries = await readdir(join(dir, '.turbo', 'cache'));

    return entries.length;
  } catch {
    return null;
  }
};

const lastLines = (text: string, count: number): string[] => text.split(/\r?\n/).slice(-count - 1);

const launches: Launch[] = [];

const hangs: Hang[] = [];

let nextIndex = 0;

const runOne = async (index: number, worker: number, fixture: FixtureHandle): Promise<Launch> => {
  const startedAt = performance.now();
  const elapsed = (): number => Math.round(performance.now() - startedAt);
  const child = spawn(TURBO, ARGS, { cwd: fixture.dir, env: ENV, windowsHide: true });
  let stdout = '';
  let stderr = '';
  let exitMs: number | null = null;
  let exitCode: number | null = null;
  let signal: string | null = null;
  let spawnError: string | undefined;

  child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
  child.once('exit', (code, sig) => {
    exitMs = elapsed();
    exitCode = code;
    signal = sig;
  });

  const closed = new Promise<void>((resolve) => {
    child.once('close', () => resolve());
    child.once('error', (error) => {
      spawnError = String(error);
      resolve();
    });
  });

  const closedWithin = async (ms: number): Promise<boolean> => {
    const left = Math.max(0, ms - elapsed());
    const result = await Promise.race([closed.then(() => true), sleep(left).then(() => false)]);

    return result;
  };

  let stalled = false;
  let killed = false;
  const hasClosedInTime = await closedWithin(STALL_MS);

  if (!hasClosedInTime) {
    stalled = true;
    const hangDir = join(OUT, 'hangs', `launch-${index}`);
    const snapshots = [await snapshot(child.pid, startedAt)];

    await mkdir(hangDir, { recursive: true });
    await writeFile(join(hangDir, 'stdout-at-stall.txt'), stdout);
    await writeFile(join(hangDir, 'stderr-at-stall.txt'), stderr);

    const hasClosedBeforeLate = await closedWithin(LATE_SNAPSHOT_MS);

    if (!hasClosedBeforeLate) snapshots.push(await snapshot(child.pid, startedAt));

    const hasClosedBeforeKill = await closedWithin(KILL_MS);

    if (!hasClosedBeforeKill) {
      killed = true;
      snapshots.push(await snapshot(child.pid, startedAt));
      await killTree(child);
      await closedWithin(KILL_MS + 30_000);
    }

    const closeMs = hasClosedBeforeKill ? elapsed() : null;
    const hang: Hang = {
      index,
      pid: child.pid,
      exitMs,
      closeMs,
      stallSeconds: (elapsed() - STALL_MS) / 1000,
      killed,
      snapshots,
      lastStderr: lastLines(stderr, 40),
      dir: fixture.dir
    };

    hangs.push(hang);
    await writeFile(join(hangDir, 'stdout.txt'), stdout);
    await writeFile(join(hangDir, 'stderr.txt'), stderr);
    await writeFile(join(hangDir, 'hang.json'), JSON.stringify(hang, null, 2));
    console.log(`HANG launch ${index}: exitMs=${exitMs} closeMs=${closeMs} killed=${killed}`);
  }

  const closeMs = killed ? null : elapsed();
  const cacheEntries = await countCacheEntries(fixture.dir);
  const tasksLine = /Tasks:.*/.exec(stdout)?.[0] ?? null;
  const launch: Launch = { index, worker, exitCode, signal, exitMs, closeMs, stalled, killed, cacheEntries, tasksLine, spawnError };

  return launch;
};

const workerLoop = async (worker: number, deadline: number): Promise<void> => {
  while (performance.now() < deadline && nextIndex < MAX_LAUNCHES) {
    const index = nextIndex++;
    const fixture = await fixtureFor(PRESETS['target-like']);
    const launch = await runOne(index, worker, fixture);

    try {
      await fixture.dispose();
    } catch (error) {
      launch.disposeError = String(error);
    }

    launches.push(launch);

    if (index % 100 === 0) console.log(`launch ${index}: exit=${launch.exitCode} closeMs=${launch.closeMs} cache=${launch.cacheEntries}`);
  }
};

const gitLoop = async (): Promise<{ spawns: number; slow: GitSlow[]; p50: number; p99: number; max: number }> => {
  const fixture = await fixtureFor(PRESETS['target-like']);
  const slow: GitSlow[] = [];
  const durations: number[] = [];

  for (let index = 0; index < GIT_SPAWNS; index++) {
    const startedAt = performance.now();
    let error: string | undefined;

    try {
      await execText('git', ['rev-parse', 'HEAD'], { cwd: fixture.dir, timeoutMs: KILL_MS });
    } catch (caught) {
      error = String(caught);
    }

    const ms = Math.round(performance.now() - startedAt);

    durations.push(ms);

    if (ms > GIT_SLOW_MS || error !== undefined) slow.push({ index, ms, error });
  }

  await fixture.dispose().catch(() => undefined);
  const sorted = durations.toSorted((a, b) => a - b);

  return { spawns: durations.length, slow, p50: percentile(sorted, 0.5), p99: percentile(sorted, 0.99), max: sorted.at(-1) ?? 0 };
};

const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;

const main = async (): Promise<void> => {
  await mkdir(OUT, { recursive: true });
  console.log(`probe arm=${ARM} shard=${SHARD} turbo=${TURBO} args=${ARGS.join(' ')} concurrency=${CONCURRENCY}`);
  await warmFixtureCache(PRESETS['target-like']);

  const startedAt = performance.now();
  const deadline = startedAt + MINUTES * 60_000;
  const workers = Array.from({ length: CONCURRENCY }, (_, worker) => workerLoop(worker, deadline));
  const git = GIT_SPAWNS > 0 ? gitLoop() : Promise.resolve(null);
  const settled = await Promise.allSettled([Promise.all(workers), git]);
  const errors = settled.filter((result) => result.status === 'rejected').map((result) => String(result.reason));
  const gitResult = settled[1].status === 'fulfilled' ? settled[1].value : null;
  const closeTimes = launches.flatMap((launch) => (launch.closeMs === null ? [] : [launch.closeMs])).toSorted((a, b) => a - b);
  const nonZero = launches.filter((launch) => launch.exitCode !== 0).map((launch) => ({ index: launch.index, exitCode: launch.exitCode, signal: launch.signal, spawnError: launch.spawnError }));
  const cacheEntryCounts = [...new Set(launches.map((launch) => launch.cacheEntries))];
  const tasksLines = [...new Set(launches.map((launch) => launch.tasksLine))];
  const summary = {
    arm: ARM,
    shard: SHARD,
    platform: process.platform,
    args: ARGS,
    concurrency: CONCURRENCY,
    stallMs: STALL_MS,
    wallSeconds: Math.round((performance.now() - startedAt) / 1000),
    launches: launches.length,
    hangCount: hangs.length,
    nonZeroCount: nonZero.length,
    nonZero: nonZero.slice(0, 50),
    cacheEntryCounts,
    tasksLines,
    closeMs: {
      p50: percentile(closeTimes, 0.5),
      p90: percentile(closeTimes, 0.9),
      p99: percentile(closeTimes, 0.99),
      p999: percentile(closeTimes, 0.999),
      max: closeTimes.at(-1) ?? 0
    },
    hangs,
    git: gitResult,
    errors
  };

  await writeFile(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(join(OUT, 'launches.ndjson'), launches.map((launch) => JSON.stringify(launch)).join('\n'));
  console.log('PROBE SUMMARY');
  console.log(JSON.stringify(summary, null, 2));
};

try {
  await main();
} catch (error) {
  console.log(`probe failed: ${String(error)}`);
}

process.exit(0);
