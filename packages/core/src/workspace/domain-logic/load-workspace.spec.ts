import { getEventListeners } from 'node:events';
import { resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { PackageGraph, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigError, TurboConfigFile } from '../common/turbo-config.type.ts';
import type { WorkspaceModel } from '../common/workspace-model.type.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';
import type * as workspaceModelUtil from '../utils/workspace-model.util.ts';

const turbo = vi.hoisted(() => {
  const queryArgs: unknown[][] = [];
  const readDirs: string[][] = [];
  const readSignals: (AbortSignal | undefined)[] = [];
  const noConfigs = async (): Promise<TurboConfigFile[]> => Promise.resolve([]);
  const proceed = (): void => undefined;
  const state = {
    stdout: '',
    queryArgs,
    readDirs,
    readSignals,
    onQuery: proceed,
    onBuild: proceed,
    proceed,
    read: noConfigs,
    noConfigs
  };

  return state;
});

const store = vi.hoisted(() => {
  const args: unknown[][] = [];
  const writeErrors: string[] = [];
  const state = { args, writeErrors };

  return state;
});

vi.mock('../../shared/turbo/data-access/query-turbo.ts', () => {
  const queryTurbo = async (...args: unknown[]): Promise<TurboResult> => {
    const result: TurboResult = { stdout: turbo.stdout, stderr: '', exitCode: 0 };

    turbo.queryArgs.push(args);
    turbo.onQuery();

    return Promise.resolve(result);
  };

  const mocked = { queryTurbo };

  return mocked;
});

vi.mock('../data-access/turbo-config.ts', () => {
  const readTurboConfigs = async (_root: string, dirs: string[], signal?: AbortSignal): Promise<TurboConfigFile[]> => {
    turbo.readDirs.push(dirs);
    turbo.readSignals.push(signal);

    return turbo.read();
  };

  const mocked = { readTurboConfigs };

  return mocked;
});

vi.mock('../utils/workspace-model.util.ts', async (importOriginal) => {
  const real = await importOriginal<typeof workspaceModelUtil>();

  const buildWorkspaceModel = (
    graph: PackageGraph,
    configs: TurboConfigFile[],
    turboVersion: string,
    root: string
  ): WorkspaceModel => {
    turbo.onBuild();

    return real.buildWorkspaceModel(graph, configs, turboVersion, root);
  };

  const mocked = { ...real, buildWorkspaceModel };

  return mocked;
});

vi.mock('../../cache/data-access/store-workspace.ts', () => {
  const storeWorkspace = async (...args: unknown[]): Promise<string | null> => {
    store.args.push(args);

    const writeError = store.writeErrors[0] ?? null;

    return Promise.resolve(writeError);
  };

  const mocked = { storeWorkspace };

  return mocked;
});

const BINARY = new TurboBinary('/workspace', '/workspace/turbo', '2.11.7', 'override');

const QUERY_MAX_BUFFER = 128 * 1024 * 1024;

const WINDOWS_PACKAGE = graphPackage('@fx/e2e-1', String.raw`apps\e2e-1`, [], []);

const GRAPH = packageGraph([WINDOWS_PACKAGE], []);

const ABORTED = 'turbo query packageGraph was aborted';

/** Absolute on every OS: a driveless `/cache` is `invalid-argument` on Windows. */
const CACHE_DIR = resolve('/cache');

const WRITE_ERROR = '/cache: workspace model too large to cache';

const PACKAGE_ERROR: TurboConfigError = { path: 'packages/a/turbo.json', error: 'x' };

const SPAWN_STARTED_AT = 1000;

const QUERIED_AT = 5000;

const timeoutReason = (): DOMException => new DOMException('timed out', 'TimeoutError');

const packageError = async (): Promise<TurboConfigFile[]> => Promise.resolve([PACKAGE_ERROR]);

const configError = (_: unknown, index: number): TurboConfigError => {
  const config: TurboConfigError = { path: `packages/p${String(index).padStart(3, '0')}/turbo.json`, error: 'x' };

  return config;
};

/** One more parse error than the builder's 100-warning cap. */
const overCapErrors = async (): Promise<TurboConfigFile[]> => Promise.resolve(Array.from({ length: 101 }, configError));

/** The model `loadWorkspace` passed to the store. */
const storedModel = (): unknown => store.args[0]?.[0];

const neverSettles = async (): Promise<TurboConfigFile[]> => new Promise(() => undefined);

/** Reads that abort `controller` with `reason` and then resolve, as if the abort landed just before they finished. */
const abortingRead = (controller: AbortController, reason: unknown): (() => Promise<TurboConfigFile[]>) => {
  return async (): Promise<TurboConfigFile[]> => {
    controller.abort(reason);

    return Promise.resolve([]);
  };
};

describe('FEATURE: workspace loading', () => {
  let controller: AbortController;

  beforeEach(() => {
    controller = new AbortController();
    turbo.stdout = JSON.stringify(GRAPH);
    turbo.queryArgs.length = 0;
    turbo.readDirs.length = 0;
    turbo.readSignals.length = 0;
    turbo.onQuery = turbo.proceed;
    turbo.onBuild = turbo.proceed;
    turbo.read = turbo.noConfigs;
    store.args.length = 0;
    store.writeErrors.length = 0;
  });

  describe('GIVEN a cache dir the store writes', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN loaded THEN the model, the graph packages, the time before the query and the cache dir are stored', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(SPAWN_STARTED_AT);
      turbo.onQuery = (): void => {
        vi.setSystemTime(QUERIED_AT);
      };

      const model = await loadWorkspace(BINARY, { cacheDir: CACHE_DIR });

      expect(store.args).toStrictEqual([
        [model, [WINDOWS_PACKAGE], expect.objectContaining({ startedAt: SPAWN_STARTED_AT }), CACHE_DIR]
      ]);
    });

    it('WHEN loaded THEN the model carries no cache warning', async () => {
      turbo.read = packageError;

      const model = await loadWorkspace(BINARY, { cacheDir: CACHE_DIR });

      expect(model.warnings).toStrictEqual(['packages/a/turbo.json: x']);
    });
  });

  describe('GIVEN a cache dir that is not absolute', () => {
    it.each(['', 'cache dir'])('WHEN loaded with %j THEN it rejects invalid-argument', async (cacheDir) => {
      const loading = loadWorkspace(BINARY, { cacheDir });

      await expect(loading).rejects.toMatchObject({ kind: 'invalid-argument', message: `cacheDir must be absolute: ${cacheDir}` });
    });

    it.each(['', 'cache dir'])('WHEN loaded with %j THEN turbo is not spawned', async (cacheDir) => {
      const loading = loadWorkspace(BINARY, { cacheDir });

      await expect(loading).rejects.toBeInstanceOf(TurboException);
      expect(turbo.queryArgs).toStrictEqual([]);
    });
  });

  describe('GIVEN a cache dir the store fails to write', () => {
    beforeEach(() => {
      store.writeErrors.push(WRITE_ERROR);
      turbo.read = packageError;
    });

    it('WHEN loaded THEN the returned model carries the cache warning among its sorted warnings', async () => {
      const model = await loadWorkspace(BINARY, { cacheDir: CACHE_DIR });

      expect(model.warnings).toStrictEqual([`cache: ${WRITE_ERROR}`, 'packages/a/turbo.json: x']);
    });

    it('WHEN loaded THEN the stored model carries no cache warning', async () => {
      await loadWorkspace(BINARY, { cacheDir: CACHE_DIR });

      expect(storedModel()).toMatchObject({ warnings: ['packages/a/turbo.json: x'] });
    });

    it('WHEN the config warnings pass the cap THEN 100 are shown, then the overflow line counting the rest', async () => {
      turbo.read = overCapErrors;

      const model = await loadWorkspace(BINARY, { cacheDir: CACHE_DIR });

      expect(model.warnings.slice(100)).toStrictEqual(['warnings: 2 more not shown']);
    });
  });

  describe('GIVEN turbo lists a package under a Windows path', () => {
    it('WHEN loaded THEN its config directory is read as a posix path', async () => {
      await loadWorkspace(BINARY);

      expect(turbo.readDirs).toStrictEqual([['apps/e2e-1']]);
    });
  });

  describe('GIVEN a caller signal that never aborts', () => {
    it('WHEN loaded THEN turbo is queried in the root with the query budget, the signal and the stdout cap', async () => {
      const { signal } = controller;
      const queryOptions = { timeoutMs: TURBO_BUDGET_MS.query, signal, maxBuffer: QUERY_MAX_BUFFER };

      await loadWorkspace(BINARY, { signal });

      expect(turbo.queryArgs).toStrictEqual([[BINARY.path, PACKAGE_GRAPH_QUERY, BINARY.root, queryOptions]]);
    });

    it('WHEN loaded THEN the configs are read with the signal', async () => {
      await loadWorkspace(BINARY, { signal: controller.signal });

      expect(turbo.readSignals).toStrictEqual([controller.signal]);
    });

    it('WHEN loaded THEN no abort listener is left on the signal', async () => {
      await loadWorkspace(BINARY, { signal: controller.signal });

      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    });
  });

  describe('GIVEN the caller aborts as the query finishes', () => {
    it('WHEN loaded THEN it rejects aborted without reading any config', async () => {
      turbo.onQuery = (): void => controller.abort();

      const loading = loadWorkspace(BINARY, { signal: controller.signal });

      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
      expect(turbo.readDirs).toStrictEqual([]);
    });
  });

  describe('GIVEN config reads that never settle', () => {
    it('WHEN the caller aborts during them THEN it rejects aborted at once', { timeout: 1000 }, async () => {
      turbo.read = neverSettles;

      const loading = loadWorkspace(BINARY, { signal: controller.signal });

      await vi.waitFor(() => {
        expect(turbo.readDirs).toHaveLength(1);
      });
      controller.abort();

      await expect(loading).rejects.toBeInstanceOf(TurboException);
      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
    });
  });

  describe('GIVEN the caller aborts while the configs are read, and the reads then finish', () => {
    it('WHEN the reason is a plain Error THEN it rejects failed, aborted', async () => {
      turbo.read = abortingRead(controller, new Error('x'));

      const loading = loadWorkspace(BINARY, { signal: controller.signal });

      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
    });

    it('WHEN the reason is a TimeoutError THEN it rejects failed, timed out', async () => {
      turbo.read = abortingRead(controller, timeoutReason());

      const loading = loadWorkspace(BINARY, { signal: controller.signal });

      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: 'turbo query packageGraph timed out' });
    });
  });

  describe('GIVEN the caller aborts after the configs are read, before the model is stored', () => {
    beforeEach(() => {
      turbo.onBuild = (): void => controller.abort();
    });

    it('WHEN loaded THEN it rejects failed, aborted', async () => {
      const loading = loadWorkspace(BINARY, { cacheDir: CACHE_DIR, signal: controller.signal });

      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
    });

    it('WHEN loaded THEN nothing is stored', async () => {
      const loading = loadWorkspace(BINARY, { cacheDir: CACHE_DIR, signal: controller.signal });

      await expect(loading).rejects.toBeInstanceOf(TurboException);
      expect(store.args).toStrictEqual([]);
    });
  });
});
