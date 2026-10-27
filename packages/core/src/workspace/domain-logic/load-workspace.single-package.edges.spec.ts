import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { GraphTask, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import type { WorkspaceModel } from '../common/workspace-model.type.ts';
import { configOf } from '../test/utils/config-ok.spec.util.ts';
import { graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const turbo = vi.hoisted(() => {
  const queryArgs: unknown[][] = [];
  const stdouts: string[] = [];
  const exitCodes: number[] = [0];
  const noConfigs = async (): Promise<TurboConfigFile[]> => Promise.resolve([]);
  const state = { stdouts, exitCodes, queryArgs, read: noConfigs };

  return state;
});

const store = vi.hoisted(() => {
  const args: unknown[][] = [];
  const state = { args };

  return state;
});

const pnpm = vi.hoisted(() => {
  const answer = async (): Promise<boolean> => Promise.resolve(false);
  const state = { answer };

  return state;
});

vi.mock('../../shared/turbo/data-access/query-turbo.ts', () => {
  const queryTurbo = async (...args: unknown[]): Promise<TurboResult> => {
    const call = turbo.queryArgs.length;
    const stdout = turbo.stdouts[Math.min(call, turbo.stdouts.length - 1)] ?? '';
    const exitCode = turbo.exitCodes[Math.min(call, turbo.exitCodes.length - 1)] ?? 0;
    const result: TurboResult = { stdout, stderr: '', exitCode };

    turbo.queryArgs.push(args);

    return Promise.resolve(result);
  };

  const mocked = { queryTurbo };

  return mocked;
});

vi.mock('../data-access/turbo-config.ts', () => {
  const readTurboConfigs = async (): Promise<TurboConfigFile[]> => turbo.read();

  const mocked = { readTurboConfigs };

  return mocked;
});

vi.mock('../../cache/data-access/store-workspace.ts', () => {
  const storeWorkspace = async (...args: unknown[]): Promise<string | null> => {
    store.args.push(args);

    return Promise.resolve(null);
  };

  const mocked = { storeWorkspace };

  return mocked;
});

vi.mock('../data-access/pnpm-workspace.ts', () => {
  const hasPnpmWorkspacePackages = async (): Promise<boolean> => pnpm.answer();

  const mocked = { hasPnpmWorkspacePackages };

  return mocked;
});

const CACHE_DIR = resolve('/cache');

const task = (id: string, deps: string[]): GraphTask => graphTask(id, 'echo', [], deps);

/** What `--skip-infer` alone returns: every `//` task without its dependencies. */
const FIRST = packageGraph([], [], graphPackage('//', '', [], [task('//#build', []), task('//#format', []), task('//#lint', [])]));

/** What `--skip-infer --single-package` returns: the real edges. */
const SECOND = packageGraph(
  [],
  [],
  graphPackage('//', '', [], [task('//#build', ['//#lint', '//#format']), task('//#format', []), task('//#lint', [])])
);

const depsOf = (model: WorkspaceModel, id: string): string[] | undefined =>
  model.packages[0]?.tasks.find((t) => t.id === id)?.dependencies;

const queryTextOf = (call: unknown[] | undefined): unknown => call?.[1];

const optionsOf = (call: unknown[]): object => {
  const options = call[3];
  const none = {};

  if (typeof options === 'object' && options !== null) return options;

  return none;
};

describe('FEATURE: load a single-package workspace with its task edges', () => {
  let tempDir = '';
  let pnpmRoot: TurboBinary;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'load-edges-'));

    const root = await rootWithFiles(tempDir, { 'package.json': '{"name":"single-app","packageManager":"pnpm@10.0.0"}' });

    pnpmRoot = new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    turbo.stdouts.length = 0;
    turbo.exitCodes.length = 0;
    turbo.exitCodes.push(0);
    turbo.queryArgs.length = 0;
    turbo.read = async (): Promise<TurboConfigFile[]> => Promise.resolve([configOf({ build: 'defined' })]);
    pnpm.answer = async (): Promise<boolean> => Promise.resolve(false);
    store.args.length = 0;
  });

  describe('GIVEN an empty graph and a root package, no declared workspaces', () => {
    it('WHEN loaded THEN turbo is queried twice with the same query and only the second adds singlePackage', async () => {
      turbo.stdouts.push(JSON.stringify(FIRST), JSON.stringify(SECOND));

      await loadWorkspace(pnpmRoot, { signal: new AbortController().signal });

      const [first, second] = turbo.queryArgs.map(optionsOf);

      expect(turbo.queryArgs.map(queryTextOf)).toStrictEqual([PACKAGE_GRAPH_QUERY, PACKAGE_GRAPH_QUERY]);
      expect(first).not.toHaveProperty('singlePackage');
      expect(first).toHaveProperty('signal');
      expect(first).toHaveProperty('maxBuffer');
      expect(second).toStrictEqual({ ...first, singlePackage: true });
    });

    it('WHEN loaded THEN //#build depends on the second graph edges, the script //#format kept', async () => {
      turbo.stdouts.push(JSON.stringify(FIRST), JSON.stringify(SECOND));

      const model = await loadWorkspace(pnpmRoot);

      expect(depsOf(model, '//#build')).toStrictEqual(['//#format', '//#lint']);
    });

    it('WHEN loaded THEN the store gets the second graph packages', async () => {
      turbo.stdouts.push(JSON.stringify(FIRST), JSON.stringify(SECOND));

      await loadWorkspace(pnpmRoot, { cacheDir: CACHE_DIR });

      expect(store.args[0]?.[1]).toStrictEqual([SECOND.data.root]);
    });

    it('WHEN the second spawn exits non-zero THEN the load rejects failed and stores nothing', async () => {
      turbo.stdouts.push(JSON.stringify(FIRST));
      turbo.exitCodes.push(1);

      await expect(loadWorkspace(pnpmRoot, { cacheDir: CACHE_DIR })).rejects.toMatchObject({ kind: 'failed' });
      expect(store.args).toStrictEqual([]);
    });
  });

  describe('GIVEN a graph that is not single-package', () => {
    it('WHEN the graph has a package THEN one spawn', async () => {
      const web = graphPackage('web', 'packages/web', [], []);

      turbo.stdouts.push(JSON.stringify(packageGraph([web], [], FIRST.data.root)));

      await loadWorkspace(pnpmRoot);

      expect(turbo.queryArgs).toHaveLength(1);
    });

    it('WHEN the graph is empty but pnpm declares workspace packages THEN one spawn', async () => {
      pnpm.answer = async (): Promise<boolean> => Promise.resolve(true);
      turbo.stdouts.push(JSON.stringify(FIRST));

      await loadWorkspace(pnpmRoot);

      expect(turbo.queryArgs).toHaveLength(1);
    });
  });
});
