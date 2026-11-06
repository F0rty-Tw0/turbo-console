// F-U7-17 round 3: names the call a stalled turbo.exe blocks in. Before the kill: thread tables of turbo.exe and its
// conhost.exe plus a full minidump; after the kill: cdb stacks of every thread and the handle table. Windows only.
// Diag branch only.
import { execFile, spawn } from 'node:child_process';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type ThreadTable = { pid: number; text: string; error: string | null };

type Dump = { path: string; method: string | null; bytes: number; attempts: string[] };

export type LiveCapture = { threads: ThreadTable[]; dump: Dump };

export type DeepCapture = LiveCapture & { stack: string; dumpKept: boolean };

type ExecOutput = { stdout: string; error: string | null };

const CDB = process.env['PROBE_CDB'] ?? '';

const PROCDUMP = process.env['PROBE_PROCDUMP'] ?? '';

const SYMBOL_CACHE = process.env['PROBE_SYMBOL_CACHE'] ?? join(process.cwd(), 'symcache');

const SYMBOL_PATH = `srv*${SYMBOL_CACHE}*https://msdl.microsoft.com/download/symbols`;

/** `!handle 0 f` prints every handle's type and name (a superset of `!handle 0 0`), to name the object turbo waits on. */
const CDB_COMMANDS = '.symfix; .reload; ~*kn 40; !handle 0 f; q';

/** Dumps kept for upload per shard; 3 shards stay under ~500 MB of artifacts. */
const KEEP_DUMPS = 3;

const KEEP_DUMP_BYTES = 160 * 1024 * 1024;

let keptDumps = 0;

let keptDumpBytes = 0;

/** One cdb at a time, so parallel workers do not race on the symbol cache. */
let cdbQueue: Promise<unknown> = Promise.resolve();

const execOutput = async (file: string, args: string[], timeoutMs: number): Promise<ExecOutput> => {
  const { promise, resolve } = Promise.withResolvers<ExecOutput>();
  const env = { ...process.env, _NT_SYMBOL_PATH: SYMBOL_PATH };
  const options = { env, timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024, windowsHide: true };

  execFile(file, args, options, (error, stdout, stderr) => {
    const output = { stdout: `${stdout}${stderr}`, error: error === null ? null : String(error) };

    resolve(output);
  });

  return promise;
};

/** Single quotes only: Windows PowerShell 5.1 mangles escaped double quotes inside -Command. */
const threadCommand = (pid: number): string =>
  `$ErrorActionPreference='SilentlyContinue'; (Get-Process -Id ${pid}).Threads | Select-Object Id,@{n='ThreadState';e={[string]$_.ThreadState}},@{n='WaitReason';e={if ([string]$_.ThreadState -eq 'Wait') { [string]$_.WaitReason }}},@{n='StartAddress';e={'0x{0:X}' -f [int64]$_.StartAddress}},@{n='CpuMs';e={$_.TotalProcessorTime.TotalMilliseconds}} | ConvertTo-Json -Compress`;

const threadTable = async (pid: number): Promise<ThreadTable> => {
  const result = await execOutput('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', threadCommand(pid)], 30_000);
  const table = { pid, text: result.stdout.trim(), error: result.error };

  return table;
};

const fileBytes = async (path: string): Promise<number> => {
  try {
    const info = await stat(path);

    return info.size;
  } catch {
    return 0;
  }
};

const writeDump = async (pid: number, path: string): Promise<Dump> => {
  const attempts: string[] = [];
  // rundll32 parses its raw command line, so no argument may hold a space (runner.temp has none).
  const comsvcsArgs = ['C:\\Windows\\System32\\comsvcs.dll,', 'MiniDump', String(pid), path, 'full'];
  const comsvcs = await execOutput('rundll32.exe', comsvcsArgs, 60_000);
  const comsvcsBytes = await fileBytes(path);

  attempts.push(`comsvcs: ${comsvcs.error ?? 'exit 0'} bytes=${comsvcsBytes} ${comsvcs.stdout.trim()}`);

  if (comsvcsBytes > 0) return { path, method: 'comsvcs', bytes: comsvcsBytes, attempts };

  if (PROCDUMP === '') return { path, method: null, bytes: 0, attempts: [...attempts, 'procdump: PROBE_PROCDUMP unset'] };

  const procdump = await execOutput(PROCDUMP, ['-accepteula', '-ma', String(pid), path], 120_000);
  const procdumpBytes = await fileBytes(path);
  const method = procdumpBytes > 0 ? 'procdump' : null;

  attempts.push(`procdump: ${procdump.error ?? 'exit 0'} bytes=${procdumpBytes} ${procdump.stdout.trim()}`);

  return { path, method, bytes: procdumpBytes, attempts };
};

export const captureLive = async (pid: number, conhostPids: number[], dir: string): Promise<LiveCapture> => {
  await mkdir(dir, { recursive: true });
  const threads = await Promise.all([pid, ...conhostPids].map(threadTable));
  const dump = await writeDump(pid, join(dir, 'turbo.dmp'));
  const live = { threads, dump };

  await writeFile(join(dir, 'threads.json'), JSON.stringify(threads, null, 2));

  return live;
};

const runCdb = async (dump: Dump, dir: string): Promise<string> => {
  if (CDB === '') return 'cdb missing (PROBE_CDB unset)';

  if (dump.method === null) return 'no dump';

  const result = await execOutput(CDB, ['-z', dump.path, '-c', CDB_COMMANDS], 900_000);

  await writeFile(join(dir, 'stack.txt'), `${result.stdout}\n${result.error ?? ''}`);

  return result.error === null ? 'stack.txt' : `stack.txt (cdb error: ${result.error})`;
};

const hasDumpBudget = (dump: Dump): boolean =>
  dump.method !== null && keptDumps < KEEP_DUMPS && keptDumpBytes + dump.bytes <= KEEP_DUMP_BYTES;

/** Runs cdb on the dump, then keeps it for upload only while the shard's dump budget lasts. */
export const analyzeDump = async (live: LiveCapture, dir: string, isKeepable: boolean): Promise<DeepCapture> => {
  const queued = cdbQueue.then(async () => runCdb(live.dump, dir));

  cdbQueue = queued.catch(() => undefined);
  const stack = await queued.catch((error: unknown) => `cdb failed: ${String(error)}`);
  const dumpKept = isKeepable && hasDumpBudget(live.dump);

  if (dumpKept) {
    keptDumps++;
    keptDumpBytes += live.dump.bytes;
  } else {
    await rm(live.dump.path, { force: true });
  }

  const deep = { ...live, stack, dumpKept };

  return deep;
};

/** Runs the whole capture on a sleeping node.exe, so a broken step shows before any hang, and warms the symbol cache. */
export const selfTestCapture = async (dir: string): Promise<DeepCapture | string> => {
  const sleeper = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 600000)'], { windowsHide: true });
  const pid = sleeper.pid;

  if (pid === undefined) return 'self-test sleeper did not spawn';

  try {
    const live = await captureLive(pid, [], dir);
    const deep = await analyzeDump(live, dir, false);

    return deep;
  } finally {
    sleeper.kill();
  }
};
