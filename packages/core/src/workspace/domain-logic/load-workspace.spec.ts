import { getEventListeners } from 'node:events';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';

const turbo = vi.hoisted(() => {
  const queryArgs: unknown[][] = [];
  const readDirs: string[][] = [];
  const readSignals: (AbortSignal | undefined)[] = [];
  const noConfigs = async (): Promise<TurboConfigFile[]> => Promise.resolve([]);
  const proceed = (): void => undefined;
  const state = { stdout: '', queryArgs, readDirs, readSignals, onQuery: proceed, proceed, read: noConfigs, noConfigs };

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

const BINARY = new TurboBinary('/workspace', '/workspace/turbo', '2.11.7', 'override');

const QUERY_MAX_BUFFER = 128 * 1024 * 1024;

const WINDOWS_PACKAGE = graphPackage('@fx/e2e-1', String.raw`apps\e2e-1`, [], []);

const GRAPH = packageGraph([WINDOWS_PACKAGE], []);

const ABORTED = 'turbo query packageGraph was aborted';

const timeoutReason = (): DOMException => new DOMException('timed out', 'TimeoutError');

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
    turbo.read = turbo.noConfigs;
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
});
