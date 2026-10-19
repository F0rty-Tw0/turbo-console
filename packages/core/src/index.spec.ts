import { PACKAGE_NAME as REPO_GEN } from '@turbo-console/repo-gen';
import { PACKAGE_NAME as TOOLS } from '@turbo-console/tools';
import { describe, expect, expectTypeOf, it } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
import { PACKAGE_NAME } from './index.ts';
import type {
  AffectedResult,
  AffectedTasks,
  CachedWorkspace,
  DryRun,
  DryRunRequest,
  DryRunState,
  LockfileName,
  PackageEdge,
  PackageGraph,
  PackageManager,
  PackageManagerName,
  PackageManagerSource,
  PackageNode,
  RunMatch,
  RunSummary,
  RunToMatch,
  TaskDefinition,
  TaskNode,
  TurboBinary,
  TurboErrorKind,
  TurboVersionRange,
  WorkspaceModel
  // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
} from './index.ts';

/**
 * Spec §4.8: M0's runtime exports plus M1's readers, `TurboException` and (M2) the text cleaners `plainLine` and
 * `plainLines`. The task-name check `assertTaskName` and the boundary check `isWithin` are public: the vscode run flow
 * uses them. Spawning, model building and the turbo-name check (`runTurbo`, `queryTurbo`, `buildWorkspaceModel`,
 * `assertTurboName`) stay internal; `TurboBinary` is a type-only export.
 */
const RUNTIME_EXPORTS = [
  'AFFECTED_TASKS_QUERY',
  'PACKAGE_GRAPH_QUERY',
  'PACKAGE_NAME',
  'SCHEMA_SDL_SHA256',
  'SUPPORTED_TURBO_RANGE',
  'TurboException',
  'affectedTasksSchema',
  'assertTaskName',
  'dryRunSchema',
  'isWithin',
  'loadWorkspace',
  'matchRunSummary',
  'packageGraphSchema',
  'plainLine',
  'plainLines',
  'readAffected',
  'readCachedWorkspace',
  'readDryRun',
  'readNewestRunSummary',
  'resolveTurbo',
  'runSummarySchema',
  'turboRunAllArgs',
  'turboRunArgs'
];

describe('FEATURE: core package entry', () => {
  describe('GIVEN the package entry point', () => {
    it('WHEN PACKAGE_NAME is read THEN it equals the package name', () => {
      expect(PACKAGE_NAME).toBe('@turbo-console/core');
    });

    it('WHEN its exports are listed THEN they are exactly the public API, and every public type is exported', async () => {
      // eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '.' this rule asks for.
      const entry = await import('./index.ts');

      const names = Object.keys(entry).toSorted();

      expect(names).toStrictEqual(RUNTIME_EXPORTS);
      expectTypeOf<TurboBinary>().toHaveProperty('path');
      expectTypeOf<WorkspaceModel>().toHaveProperty('affectedMode');
      expectTypeOf<WorkspaceModel>().toHaveProperty('packageManager');
      expectTypeOf<PackageManager>().toHaveProperty('source');
      expectTypeOf<PackageManagerSource['kind']>().toEqualTypeOf<'field' | 'devEngines' | 'lockfile' | 'default'>();
      expectTypeOf<PackageManagerName>().toEqualTypeOf<'npm' | 'pnpm' | 'yarn' | 'bun'>();
      expectTypeOf<LockfileName>().toEqualTypeOf<'pnpm-lock.yaml' | 'bun.lock' | 'bun.lockb' | 'yarn.lock' | 'package-lock.json'>();
      expectTypeOf<PackageNode>().toHaveProperty('tasks');
      expectTypeOf<PackageEdge>().toHaveProperty('target');
      expectTypeOf<TaskNode>().toHaveProperty('kind');
      expectTypeOf<AffectedResult['mode']>().toEqualTypeOf<'package' | 'task'>();
      expectTypeOf<DryRunState['cache']>().toEqualTypeOf<'HIT' | 'MISS' | 'deferred'>();
      expectTypeOf<DryRunState['definition']>().toEqualTypeOf<TaskDefinition>();
      expectTypeOf<DryRunRequest>().toHaveProperty('tasks');
      expectTypeOf<CachedWorkspace['isFresh']>().toEqualTypeOf<(binary: TurboBinary) => Promise<boolean>>();
      expectTypeOf<AffectedTasks>().toHaveProperty('data');
      expectTypeOf<DryRun>().toHaveProperty('tasks');
      expectTypeOf<PackageGraph>().toHaveProperty('data');
      expectTypeOf<RunSummary>().toHaveProperty('execution');
      expectTypeOf<RunToMatch>().toHaveProperty('launchedAt');
      expectTypeOf<RunMatch['cache']>().toEqualTypeOf<'HIT' | 'MISS' | null>();
      expectTypeOf<TurboVersionRange>().toHaveProperty('maxExclusive');
    });

    it('WHEN TurboErrorKind is imported THEN it is the exact kind union', () => {
      const kind: TurboErrorKind = 'invalid-output';
      // @ts-expect-error -- 'timeout' is not a kind; an `any` or missing export would compile here.
      const unknownKind: TurboErrorKind = 'timeout';

      expect(kind).toBe('invalid-output');
      expect(unknownKind).toBe('timeout');
    });
  });

  describe('GIVEN the built workspace dev dependencies', () => {
    it('WHEN repo-gen PACKAGE_NAME is imported THEN its declaration and value are the exact literal', () => {
      const repoGen: '@turbo-console/repo-gen' = REPO_GEN;
      // @ts-expect-error -- dist/index.d.ts declares the repo-gen literal; an `any` or missing declaration would compile here.
      const mislabelled: '@turbo-console/tools' = REPO_GEN;

      expect(repoGen).toBe('@turbo-console/repo-gen');
      expect(mislabelled).toBe('@turbo-console/repo-gen');
    });

    it('WHEN tools PACKAGE_NAME is imported THEN its declaration and value are the exact literal', () => {
      const tools: '@turbo-console/tools' = TOOLS;
      // @ts-expect-error -- dist/index.d.ts declares the tools literal; an `any` or missing declaration would compile here.
      const mislabelled: '@turbo-console/repo-gen' = TOOLS;

      expect(tools).toBe('@turbo-console/tools');
      expect(mislabelled).toBe('@turbo-console/tools');
    });
  });
});
