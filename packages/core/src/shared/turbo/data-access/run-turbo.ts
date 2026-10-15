import { execFile } from 'node:child_process';
import type { ChildProcess, ExecFileException } from 'node:child_process';
import { once } from 'node:events';

import { checkCwd } from './check-cwd.ts';
import { collectStderr } from './collect-stderr.ts';
import { killTree } from './kill-tree.ts';
import { watchMemory } from './watch-memory.ts';
import { MemoryLimitError } from '../common/memory-limit.exception.ts';
import { SKIP_INFER } from '../common/turbo-args.const.ts';
import { MAX_RSS_BYTES, RSS_POLL_MS } from '../common/turbo-memory.const.ts';
import type { RunTurboOptions, TurboResult } from '../common/turbo.type.ts';
import { abortGraceMs } from '../utils/abort-grace.util.ts';
import { turboEnv } from '../utils/turbo-env.util.ts';

/** `stretch-300` `packageGraph` stdout alone is ~10 MB, far past execFile's 1 MB default. */
const MAX_BUFFER = 256 * 1024 * 1024;

/**
 * A hung turbo would otherwise block its caller forever. Applied as an abort signal, not execFile's `timeout`: turbo
 * exits 0 on the SIGTERM that `timeout` sends, so a timed-out run would resolve as a success.
 */
const TIMEOUT_MS = 60_000;

/** How long turbo gets to exit after the abort kill before it is killed outright. */
const GRACE_MS = 5000;

/** For a platform `RSS_POLL_MS` has no entry for. */
const DEFAULT_RSS_POLL_MS = 500;

const noop = (): void => undefined;

const abortSignalOf = (options: RunTurboOptions, memory: AbortSignal): AbortSignal => {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS);
  const signals = [timeout, memory];

  if (options.signal !== undefined) signals.push(options.signal);

  return AbortSignal.any(signals);
};

/** M0's `AbortError` (`cause` tells a `TimeoutError` from the caller's reason), plus the stderr execFile drops once aborting. */
export const abortError = (signal: AbortSignal, stderr: string): Error => {
  const cause: unknown = signal.reason;

  return Object.assign(new Error('turbo aborted'), { name: 'AbortError', cause, stderr });
};

/** True when `exited` settles first, false when `ms` pass first; the timer is cleared either way. */
const settlesWithin = async (exited: Promise<unknown>, ms: number): Promise<boolean> => {
  const { promise, resolve } = Promise.withResolvers<boolean>();

  const onTimeout = (): void => resolve(false);
  const timer = setTimeout(onTimeout, ms);

  const onSettled = (): void => {
    clearTimeout(timer);
    resolve(true);
  };

  void exited.then(onSettled, onSettled);

  return promise;
};

/**
 * `killTree`, then a hard kill of `child` alone when it has not exited, or the tree kill not finished, after `graceMs`;
 * settles once `child` has exited. One `exit` listener serves both waits, so none is left behind at the grace timeout.
 * Waiting for the tree kill too keeps a Windows rejection from landing before taskkill has killed turbo's tree.
 */
const stopChild = async (child: ChildProcess, graceMs: number): Promise<void> => {
  const exited = once(child, 'exit');
  const treeKilled = killTree(child);
  const stopped = Promise.all([exited, treeKilled]);
  const hasStopped = await settlesWithin(stopped, graceMs);

  if (hasStopped) return;

  const hardSignal = process.platform === 'win32' ? undefined : 'SIGKILL';

  child.kill(hardSignal);
  await exited;
};

/**
 * Watches `child`'s resident memory and aborts `memory` with a `MemoryLimitError` once it passes the bound; returns the
 * watch's `stop`. A failed spawn has no pid and gets no watch.
 */
const watchChild = (child: ChildProcess, options: RunTurboOptions, memory: AbortController): (() => void) => {
  if (child.pid === undefined) return noop;

  const maxRssBytes = options.maxRssBytes ?? MAX_RSS_BYTES;
  const intervalMs = options.rssPollMs ?? RSS_POLL_MS[process.platform] ?? DEFAULT_RSS_POLL_MS;

  const onExceeded = (rss: number): void => memory.abort(new MemoryLimitError(maxRssBytes, rss));

  return watchMemory(child.pid, { maxRssBytes, intervalMs, onExceeded });
};

/** M0's mapping: an exit code, non-zero included, resolves; none (spawn failure, a signal, maxBuffer) rejects, with `stderr`. */
const settle = (
  resolvers: PromiseWithResolvers<TurboResult>,
  error: ExecFileException | null,
  stdout: string,
  stderr: string
): void => {
  if (error !== null) Object.assign(error, { stderr });
  const exitCode = error === null ? 0 : error.code;

  if (typeof exitCode !== 'number') {
    resolvers.reject(error);

    return;
  }

  const result: TurboResult = { stdout, stderr, exitCode };

  resolvers.resolve(result);
};

/**
 * Runs the native turbo binary at `binaryPath` (`<binaryPath> --skip-infer ...args`) in `cwd`, with no shell, under the hardened env
 * from `turboEnv`: no inherited `GIT_*` or turbo credential variables, local cache only, no remote cache, git fsmonitor off. The
 * target repo's `.git/config` is otherwise trusted. Resolves with turbo's exit code, non-zero included. Rejects before spawning with
 * `checkCwd`'s errno error (`path`: `cwd`) when `cwd` is missing, not a directory or not searchable (ENOENT/ENOTDIR/EACCES), unless
 * `signal` already aborted; with execFile's error plus `stderr` (all turbo wrote) when no exit code exists (spawn failure, kill
 * signal, output past `maxBuffer`, 256 MiB by default); and with an `AbortError` (`cause`: the first abort's reason; `stderr`: turbo's
 * last 64 Ki characters) when `timeoutMs` (60 s by default), `signal`, or the memory watch aborts first. The watch polls turbo's
 * resident memory from spawn to exit and aborts with a `MemoryLimitError` once it passes `maxRssBytes` (4 GiB by default); any abort
 * stops it. Abort: SIGTERM to turbo on POSIX (turbo stops its tasks), `taskkill /T /F` on Windows; the rejection waits for turbo's exit
 * and taskkill. After `graceMs` turbo is killed outright, at once on POSIX for a memory abort; on POSIX that reaches turbo's pid
 * only, so a task ignoring SIGTERM can outlive it (follow-up). Known limit: after turbo exits, a leftover
 * process holding its stdout delays the result past any timeout: the abort is detached at turbo's exit and turbo's pid is gone.
 */
export const runTurbo = async (
  binaryPath: string,
  args: string[],
  cwd: string,
  options: RunTurboOptions = {}
): Promise<TurboResult> => {
  const memory = new AbortController();
  const signal = abortSignalOf(options, memory.signal);

  await checkCwd(cwd, signal);

  if (signal.aborted) throw abortError(signal, '');

  const resolvers = Promise.withResolvers<TurboResult>();
  const env = turboEnv(process.env);
  const execOptions = { cwd, env, maxBuffer: options.maxBuffer ?? MAX_BUFFER, windowsHide: true };
  let isAborting = false;

  const onDone = (error: ExecFileException | null, stdout: string, stderr: string): void => {
    if (!isAborting) settle(resolvers, error, stdout, stderr);
  };

  const child = execFile(binaryPath, [SKIP_INFER, ...args], execOptions, onDone);
  const readStderr = collectStderr(child);
  const stopWatch = watchChild(child, options, memory);

  const rejectAborted = (): void => resolvers.reject(abortError(signal, readStderr()));

  const onAbort = (): void => {
    isAborting = true;
    stopWatch();

    // Required, not defensive: a failed spawn has no pid until its `error` tick, and on macOS (posix_spawn) libuv's
    // pid is 0 then, so any `child.kill` here would be `kill(0)` and signal our own process group.
    if (child.pid === undefined) {
      rejectAborted();

      return;
    }

    const graceMs = abortGraceMs(signal.reason, process.platform, options.graceMs ?? GRACE_MS);
    const stopped = stopChild(child, graceMs);

    void stopped.then(rejectAborted, rejectAborted);
  };

  const detach = (): void => {
    stopWatch();
    signal.removeEventListener('abort', onAbort);
  };

  signal.addEventListener('abort', onAbort, { once: true });
  child.once('exit', detach);
  child.once('error', detach);

  return resolvers.promise;
};
