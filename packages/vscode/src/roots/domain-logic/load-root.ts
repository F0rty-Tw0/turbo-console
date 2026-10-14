import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { LoadDeps, LoadFailure, LoadMode, LoadResult, LoadedModel } from '../common/root.type.ts';
import { LOAD_DEADLINE_MS } from '../common/roots.const.ts';
import { raceSignal } from '../utils/race-signal.util.ts';

/** Rebuilt rather than passed on, so the `cause` (which can hold turbo's raw stderr) never leaves this module. */
const exceptionOf = (error: unknown): TurboException => {
  if (error instanceof TurboException) return new TurboException(error.kind, error.message);

  return new TurboException('failed', logTextOf(error));
};

/** A superseded load (the caller aborted it) is not an error worth logging: the coordinator drops its result. */
const failureOf = (stage: LoadFailure['stage'], error: unknown, deps: LoadDeps, signal: AbortSignal): LoadFailure => {
  if (!signal.aborted) deps.log(logTextOf(error));

  const failure: LoadFailure = { kind: 'error', stage, error: exceptionOf(error) };

  return failure;
};

const loadedModel = (binary: TurboBinary, cached: CachedWorkspace): LoadedModel => {
  const loaded: LoadedModel = { kind: 'model', binary, model: cached.model, fromCache: true, isFresh: cached.isFresh };

  return loaded;
};

const readCachedOrNull = async (binary: TurboBinary, deps: LoadDeps, signal: AbortSignal): Promise<CachedWorkspace | null> => {
  const read = async (): Promise<CachedWorkspace | null> => deps.readCached(binary);

  try {
    return await raceSignal(read, signal);
  } catch (error) {
    if (!signal.aborted) deps.log(logTextOf(error));

    return null;
  }
};

const cachedModelOf = async (
  mode: LoadMode,
  binary: TurboBinary,
  deps: LoadDeps,
  signal: AbortSignal
): Promise<LoadedModel | null> => {
  if (mode === 'full') return null;

  const cached = await readCachedOrNull(binary, deps, signal);

  if (cached === null) return null;

  return loadedModel(binary, cached);
};

const loadUnderDeadline = async (binary: TurboBinary, deps: LoadDeps, signal: AbortSignal): Promise<LoadResult> => {
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(LOAD_DEADLINE_MS)]);
  const work = async (): Promise<WorkspaceModel> => deps.load(binary, deadline);
  const withProgress = async (): Promise<WorkspaceModel> => deps.progress(work);
  const model = await raceSignal(withProgress, signal);
  const loaded: LoadedModel = { kind: 'model', binary, model, fromCache: false, isFresh: true };

  return loaded;
};

/**
 * The deadline starts after the slot is won: time queued behind other roots does not count against it. The race is on
 * the caller's signal only: `load` honors the deadline itself, so an expiry arrives as core's own `timed out` error with
 * turbo's stderr tail, not as a bare `TimeoutError`.
 */
const fullLoad = async (binary: TurboBinary, deps: LoadDeps, signal: AbortSignal): Promise<LoadResult> => {
  let release: () => void;

  try {
    release = await deps.acquire(signal);
  } catch (error) {
    return failureOf('load', error, deps, signal);
  }

  try {
    return await loadUnderDeadline(binary, deps, signal);
  } catch (error) {
    return failureOf('load', error, deps, signal);
  } finally {
    release();
  }
};

/**
 * Spec §4.3: one load of one root. `cache-first` publishes the cached model at once and returns it when fresh, else
 * (and always in `full` mode) takes a load slot (`deps.acquire`) and loads under `LOAD_DEADLINE_MS`, counted from when
 * the slot is won, and the caller's `signal`. The cache read, the slot wait and the load all settle when the caller
 * aborts, even if a port hangs (a port that hands out the slot must reject on abort, or the slot is lost); nothing is
 * published or loaded after the caller aborted. Never throws: a failure is the result, with `cause` stripped, and is
 * logged as one clean line through `deps.log` unless the caller aborted; a deadline expiry is logged.
 */
export const loadRoot = async (
  mode: LoadMode,
  deps: LoadDeps,
  signal: AbortSignal,
  publish: (result: LoadedModel) => void
): Promise<LoadResult> => {
  let binary: TurboBinary;

  try {
    binary = await deps.resolve(signal);
  } catch (error) {
    return failureOf('binary', error, deps, signal);
  }

  const cached = await cachedModelOf(mode, binary, deps, signal);

  if (signal.aborted) return failureOf('load', signal.reason, deps, signal);

  if (cached === null) return fullLoad(binary, deps, signal);

  publish(cached);

  if (cached.isFresh) return cached;

  return fullLoad(binary, deps, signal);
};
