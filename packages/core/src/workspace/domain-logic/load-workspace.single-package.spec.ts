import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import type { TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import { configOf } from '../test/utils/config-ok.spec.util.ts';
import { graphPackage, graphTask, packageGraph } from '../test/utils/graph.spec.util.ts';
import { rootWithFiles } from '../test/utils/root-files.spec.util.ts';

const turbo = vi.hoisted(() => {
  const queryArgs: unknown[][] = [];
  const noConfigs = async (): Promise<TurboConfigFile[]> => Promise.resolve([]);
  const state = { stdout: '', queryArgs, read: noConfigs };

  return state;
});

const store = vi.hoisted(() => {
  const args: unknown[][] = [];
  const state = { args };

  return state;
});

const pnpm = vi.hoisted(() => {
  const calls: unknown[][] = [];
  const answer = async (): Promise<boolean> => Promise.resolve(false);
  const state = { calls, answer };

  return state;
});

vi.mock('../../shared/turbo/data-access/query-turbo.ts', () => {
  const queryTurbo = async (...args: unknown[]): Promise<TurboResult> => {
    const result: TurboResult = { stdout: turbo.stdout, stderr: '', exitCode: 0 };

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
  const hasPnpmWorkspacePackages = async (root: string, signal?: AbortSignal): Promise<boolean> => {
    pnpm.calls.push([root, signal]);

    return pnpm.answer();
  };

  const mocked = { hasPnpmWorkspacePackages };

  return mocked;
});

type RootCase = { readonly root: string; readonly binary: TurboBinary };

const CACHE_DIR = resolve('/cache');

const ABORTED = 'turbo query packageGraph was aborted';

const ROOT_TASKS = [
  graphTask('//#build', 'echo', [], []),
  graphTask('//#format', 'echo', [], []),
  graphTask('//#lint', 'echo', [], [])
];

const BUILD_CONFIG = configOf({ build: 'defined' });

const ROOT_PACKAGE = graphPackage('//', '', [], ROOT_TASKS);

const EMPTY = packageGraph([], [], ROOT_PACKAGE);

const NO_TASKS = packageGraph([], [], graphPackage('//', '', [], []));

const NO_ROOT = packageGraph([], [], null);

const WEB_PACKAGE = graphPackage('web', 'packages/web', [], []);

const WITH_PACKAGE = packageGraph([WEB_PACKAGE], [], ROOT_PACKAGE);

const PNPM_MANIFEST = '{"name":"single-app","packageManager":"pnpm@10.0.0"}';

const NPM_MANIFEST = '{"name":"single-app","packageManager":"npm@10.0.0"}';

const ROOT_ROW = { name: '//', path: '', label: 'single-app' };

const EMPTY_ROOT_ROW = { name: '//', tasks: [] };

const NPM_WORKSPACES_MANIFEST = '{"name":"single-app","packageManager":"npm@10.0.0","workspaces":["packages/*"]}';

describe('FEATURE: load a workspace in single-package mode', () => {
  let tempDir = '';
  let controller = new AbortController();
  let pnpmRoot: RootCase;
  let npmRoot: RootCase;
  let npmWorkspacesRoot: RootCase;
  let bareRoot: RootCase;

  const caseOf = async (manifest: string): Promise<RootCase> => {
    const root = await rootWithFiles(tempDir, { 'package.json': manifest });
    const binary = new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');
    const rootCase: RootCase = { root, binary };

    return rootCase;
  };

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'load-single-'));
    pnpmRoot = await caseOf(PNPM_MANIFEST);
    npmRoot = await caseOf(NPM_MANIFEST);
    npmWorkspacesRoot = await caseOf(NPM_WORKSPACES_MANIFEST);
    bareRoot = await caseOf('{}');
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    turbo.stdout = JSON.stringify(EMPTY);
    turbo.queryArgs.length = 0;
    turbo.read = async (): Promise<TurboConfigFile[]> => Promise.resolve([BUILD_CONFIG]);
    pnpm.answer = async (): Promise<boolean> => Promise.resolve(false);
    pnpm.calls.length = 0;
    store.args.length = 0;
    controller = new AbortController();
  });

  describe('GIVEN an empty graph and a root package', () => {
    it('WHEN pnpm declares no workspace packages THEN the model is single-package with one labelled // package', async () => {
      const model = await loadWorkspace(pnpmRoot.binary);

      expect(model.singlePackage).toBe(true);
      expect(model.packages).toMatchObject([ROOT_ROW]);
      expect(model.edges).toStrictEqual([]);
      expect(turbo.queryArgs).toHaveLength(1);
    });

    it('WHEN pnpm is read THEN it is read once, in the root, with the caller signal', async () => {
      await loadWorkspace(pnpmRoot.binary, { signal: controller.signal });

      expect(pnpm.calls).toStrictEqual([[pnpmRoot.root, controller.signal]]);
    });

    it('WHEN the root has no tasks THEN the model is still single-package with an empty // package', async () => {
      turbo.stdout = JSON.stringify(NO_TASKS);

      const model = await loadWorkspace(pnpmRoot.binary);

      expect(model).toMatchObject({ singlePackage: true, packages: [EMPTY_ROOT_ROW] });
    });

    it('WHEN single-package THEN the store gets the derived [root] graph packages', async () => {
      await loadWorkspace(pnpmRoot.binary, { cacheDir: CACHE_DIR });

      expect(store.args[0]?.[1]).toStrictEqual([ROOT_PACKAGE]);
    });

    it('WHEN pnpm declares workspace packages THEN no packages, singlePackage false, no warning, and it is stored', async () => {
      pnpm.answer = async (): Promise<boolean> => Promise.resolve(true);

      const model = await loadWorkspace(pnpmRoot.binary);

      expect(model).toMatchObject({ packages: [], singlePackage: false, warnings: [] });
      expect(store.args).toHaveLength(1);
      expect(turbo.queryArgs).toHaveLength(1);
    });

    it('WHEN npm declares workspaces THEN no packages and no workspace file is read', async () => {
      const model = await loadWorkspace(npmWorkspacesRoot.binary);

      expect(model).toMatchObject({ packages: [], singlePackage: false });
      expect(pnpm.calls).toStrictEqual([]);
    });

    it('WHEN npm declares none THEN single-package and no workspace file is read', async () => {
      const model = await loadWorkspace(npmRoot.binary);

      expect(model.singlePackage).toBe(true);
      expect(pnpm.calls).toStrictEqual([]);
    });

    it('WHEN the workspace file cannot be read THEN the load rejects io and stores nothing', async () => {
      pnpm.answer = async (): Promise<boolean> => Promise.reject(new TurboException('io', 'cannot read pnpm-workspace.yaml'));

      await expect(loadWorkspace(pnpmRoot.binary)).rejects.toMatchObject({ kind: 'io' });
      expect(store.args).toStrictEqual([]);
    });

    it('WHEN the caller aborts during the read THEN the load rejects aborted and stores nothing', async () => {
      pnpm.answer = async (): Promise<boolean> => {
        controller.abort();

        return Promise.resolve(false);
      };

      const load = loadWorkspace(pnpmRoot.binary, { signal: controller.signal });

      await expect(load).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
      expect(store.args).toStrictEqual([]);
    });

    it('WHEN the root has no package.json name THEN the label is the root folder name', async () => {
      const model = await loadWorkspace(bareRoot.binary);

      expect(model.packages[0]?.label).toBe(basename(bareRoot.root));
    });
  });

  describe('GIVEN a graph whose root is null', () => {
    it('WHEN loaded THEN no packages and no workspace file is read', async () => {
      turbo.stdout = JSON.stringify(NO_ROOT);

      const model = await loadWorkspace(pnpmRoot.binary);

      expect(model.packages).toStrictEqual([]);
      expect(pnpm.calls).toStrictEqual([]);
    });
  });

  describe('GIVEN a graph with a package and a root', () => {
    it('WHEN loaded THEN no workspace file is read and the spawn count is 1', async () => {
      turbo.stdout = JSON.stringify(WITH_PACKAGE);

      const model = await loadWorkspace(pnpmRoot.binary);

      expect(pnpm.calls).toStrictEqual([]);
      expect(model.packages.map((pkg) => pkg.label)).toStrictEqual([null]);
      expect(turbo.queryArgs).toHaveLength(1);
    });
  });
});
