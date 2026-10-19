import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { LoadDeps, LoadFailure, LoadMode, LoadResult, LoadedModel } from '../common/root.type.ts';
import { LOAD_DEADLINE_MS, LOAD_GRACE_MS } from '../common/roots.const.ts';
import { raceSignal } from '../utils/race-signal.util.ts';

/** Rebuilt rather than passed on, so the `cause` (which can hold turbo's raw stderr) never leaves this module. */
const exceptionOf = (error: unknown): TurboException => {
  if (error instanceof TurboException) return new TurboException(error.kind, error.message);

  return new TurboException('failed', logTextOf(error));
};

/** Not logged here: the session logs a root's failure once per error key and text (`newFailureLineOf`). */
const failureOf = (stage: LoadFailure['stage'], error: unknown): LoadFailure => {
  const failure: LoadFailure = { kind: 'error', stage, error: exceptionOf(error), logText: logTextOf(error) };

  return failure;
};

type CachedLoad = {
  readonly published: LoadedModel;
  readonly isFresh: (version: string) => Promise<boolean>;
};

type ResolvedBinary = {
  readonly kind: 'binary';
  readonly binary: TurboBinary;
};

type Resolved = ResolvedBinary | LoadFailure;

/** Never rejects, so it can run unawaited while the cache is read: a resolve that throws becomes the `binary` failure. */
const resolvedOf = async (deps: LoadDeps, signal: AbortSignal): Promise<Resolved> => {
  try {
    const binary = await deps.resolve(signal);
    const resolved: Resolved = { kind: 'binary', binary };

    return resolved;
  } catch (error) {
    return failureOf('binary', error);
  }
};

/** Settles when the caller aborts; a `work` that throws is logged unless the caller aborted, and gives `fallback`. */
const raceLogged = async <TValue>(
  work: () => Promise<TValue>,
  fallback: TValue,
  deps: LoadDeps,
  signal: AbortSignal
): Promise<TValue> => {
  try {
    return await raceSignal(work, signal);
  } catch (error) {
    if (!signal.aborted) deps.log(logTextOf(error));

    return fallback;
  }
};

/**
 * Read before the binary resolves, so `published.binary` is `null`; its freshness is not known yet either, so
 * `published.isFresh` is `false` until `isFresh` resolves.
 */
const cachedLoadOf = async (mode: LoadMode, deps: LoadDeps, signal: AbortSignal): Promise<CachedLoad | null> => {
  if (mode === 'full') return null;

  const read = async (): Promise<CachedWorkspace | null> => deps.readCached();
  const cached = await raceLogged(read, null, deps, signal);

  if (cached === null) return null;

  const published: LoadedModel = { kind: 'model', binary: null, model: cached.model, fromCache: true, isFresh: false };
  const load: CachedLoad = { published, isFresh: cached.isFresh };

  return load;
};

const freshModelOf = (published: LoadedModel): LoadedModel => {
  const fresh: LoadedModel = { ...published, isFresh: true };

  return fresh;
};

/** A port that throws must not make `loadRoot` throw: its error is logged and the load goes on. */
const runPort = (port: () => void, deps: LoadDeps): void => {
  try {
    port();
  } catch (error) {
    deps.log(logTextOf(error));
  }
};

const ABANDONED_MESSAGE = `load still running ${LOAD_GRACE_MS / 1000} s past its ${LOAD_DEADLINE_MS / 1000} s deadline; abandoned`;

/** Races on the caller's signal plus the backstop; a backstop expiry becomes an error that says the load was abandoned. */
const raceBackstop = async (work: () => Promise<WorkspaceModel>, signal: AbortSignal): Promise<WorkspaceModel> => {
  const backstop = AbortSignal.any([signal, AbortSignal.timeout(LOAD_DEADLINE_MS + LOAD_GRACE_MS)]);

  try {
    return await raceSignal(work, backstop);
  } catch (error) {
    if (signal.aborted || error !== backstop.reason) throw error;

    throw new TurboException('failed', ABANDONED_MESSAGE);
  }
};

const loadUnderDeadline = async (binary: TurboBinary, deps: LoadDeps, signal: AbortSignal): Promise<LoadResult> => {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(LOAD_DEADLINE_MS)]);
  const work = async (): Promise<WorkspaceModel> => deps.load(binary, deadline);
  const withProgress = async (): Promise<WorkspaceModel> => deps.progress(work);
  const model = await raceBackstop(withProgress, signal);
  const loaded: LoadedModel = { kind: 'model', binary, model, fromCache: false, isFresh: true };

  return loaded;
};

/**
 * The deadline starts after the slot is won: time queued behind other roots does not count against it. `load` honors
 * the deadline itself, so an expiry arrives as core's own `timed out` error with turbo's stderr tail; the race is on the
 * caller's signal plus a backstop `LOAD_GRACE_MS` later, which frees the slot only when a step core does not bound hangs.
 */
const fullLoad = async (binary: TurboBinary, deps: LoadDeps, signal: AbortSignal): Promise<LoadResult> => {
  if (signal.aborted) return failureOf('load', signal.reason);

  let release: () => void;

  try {
    release = await deps.acquire(signal);
  } catch (error) {
    return failureOf('load', error);
  }

  try {
    return await loadUnderDeadline(binary, deps, signal);
  } catch (error) {
    return failureOf('load', error);
  } finally {
    runPort(release, deps);
  }
};

/** The cached load with its binary, once resolved: published again so its tasks can run while the check runs. */
const boundLoadOf = (cached: CachedLoad, binary: TurboBinary): CachedLoad => {
  const published: LoadedModel = { ...cached.published, binary };
  const bound: CachedLoad = { ...cached, published };

  return bound;
};

/** Nothing is published after the caller aborted. */
const publishLive = (result: LoadedModel, deps: LoadDeps, signal: AbortSignal, publish: (result: LoadedModel) => void): void => {
  if (signal.aborted) return;

  runPort(() => {
    publish(result);
  }, deps);
};

/** After the publishes and the resolve: the cached model when its freshness check passes, else a full load. */
const checkedLoad = async (binary: TurboBinary, cached: CachedLoad, deps: LoadDeps, signal: AbortSignal): Promise<LoadResult> => {
  const check = async (): Promise<boolean> => cached.isFresh(binary.version);
  const isFresh = await raceLogged(check, false, deps, signal);

  if (signal.aborted) return failureOf('load', signal.reason);

  if (isFresh) return freshModelOf(cached.published);

  return fullLoad(binary, deps, signal);
};

/**
 * Spec §4.3: one load of one root. `resolve` starts first and runs while `cache-first` reads the cache by the root path
 * alone, so the cached model is published as soon as it is read, with `binary` `null`. Once `resolve` settles, a
 * failure is the `binary` failure (published model or not); else the cached model is published again with the binary,
 * and its freshness check runs with the binary's version and returns it with `isFresh` set when fresh. Else (and always in `full` mode, which
 * reads no cache) it takes a load slot (`deps.acquire`) and loads under `LOAD_DEADLINE_MS`, counted from when the slot is
 * won, and the caller's `signal`. The cache read, the freshness check, the slot wait and the load all settle when the
 * caller aborts, even if a port hangs (a port that hands out the slot must reject on abort, or the slot is lost);
 * nothing is published or loaded after the caller aborted. Never throws: a failure is the result, with `cause`
 * stripped, and is not logged here (the session logs it). A `publish` or slot `release` that throws is logged through
 * `deps.log`, and so is a cache read or freshness check that throws unless the caller aborted; a freshness check that
 * throws counts as stale.
 */
export const loadRoot = async (
  mode: LoadMode,
  deps: LoadDeps,
  signal: AbortSignal,
  publish: (result: LoadedModel) => void
): Promise<LoadResult> => {
  const resolving = resolvedOf(deps, signal);
  const cached = await cachedLoadOf(mode, deps, signal);

  if (signal.aborted) return failureOf('load', signal.reason);

  if (cached !== null) {
    runPort(() => {
      publish(cached.published);
    }, deps);
  }

  const resolved = await resolving;

  if (resolved.kind === 'error') return resolved;

  if (cached === null) return fullLoad(resolved.binary, deps, signal);

  const bound = boundLoadOf(cached, resolved.binary);

  publishLive(bound.published, deps, signal, publish);

  return checkedLoad(resolved.binary, bound, deps, signal);
};
