import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace, TurboBinary } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { LoadDeps, LoadFailure, LoadMode, LoadResult, LoadedModel } from '../common/root.type.ts';
import { LOAD_DEADLINE_MS } from '../common/roots.const.ts';

const asTurboException = (error: unknown): TurboException => {
  if (error instanceof TurboException) return error;

  const message = logTextOf(error);

  return new TurboException('failed', message);
};

/** A superseded load (the caller aborted it) is not an error worth logging: the coordinator drops its result. */
const failureOf = (stage: LoadFailure['stage'], error: unknown, deps: LoadDeps, signal: AbortSignal): LoadFailure => {
  const exception = asTurboException(error);

  if (!signal.aborted) deps.log(exception);

  const failure: LoadFailure = { kind: 'error', stage, error: exception };

  return failure;
};

const loadedModel = (binary: TurboBinary, cached: CachedWorkspace): LoadedModel => {
  const loaded: LoadedModel = { kind: 'model', binary, model: cached.model, fromCache: true, isFresh: cached.isFresh };

  return loaded;
};

const readCachedOrNull = async (binary: TurboBinary, deps: LoadDeps): Promise<CachedWorkspace | null> => {
  try {
    return await deps.readCached(binary);
  } catch (error) {
    deps.log(error);

    return null;
  }
};

const cachedModelOf = async (binary: TurboBinary, mode: LoadMode, deps: LoadDeps): Promise<LoadedModel | null> => {
  if (mode === 'full') return null;

  const cached = await readCachedOrNull(binary, deps);

  if (cached === null) return null;

  return loadedModel(binary, cached);
};

const fullLoad = async (binary: TurboBinary, deps: LoadDeps, signal: AbortSignal): Promise<LoadResult> => {
  const timeout = AbortSignal.timeout(LOAD_DEADLINE_MS);
  const deadline = AbortSignal.any([signal, timeout]);

  try {
    const model = await deps.progress(async () => deps.load(binary, deadline));
    const loaded: LoadedModel = { kind: 'model', binary, model, fromCache: false, isFresh: true };

    return loaded;
  } catch (error) {
    return failureOf('load', error, deps, signal);
  }
};

/**
 * Spec §4.3: one load of one root. `cache-first` publishes the cached model at once and returns it when fresh, else
 * (and always in `full` mode) loads under `LOAD_DEADLINE_MS` and the caller's `signal`. Never throws: a failure is the
 * result, logged unless the caller aborted.
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

  const cached = await cachedModelOf(binary, mode, deps);

  if (cached === null) return fullLoad(binary, deps, signal);

  publish(cached);

  if (cached.isFresh) return cached;

  return fullLoad(binary, deps, signal);
};
