import type * as childProcess from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS } from '@turbo-console/repo-gen';
import type { FixtureHandle, FixtureSpec } from '@turbo-console/repo-gen';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { array, object, string } from 'zod/mini';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, readDryRun, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { DryRunState, TurboBinary } from '../index.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { manifestTaskNames, packageWithRole } from '../shared/turbo/test/utils/manifest.spec.util.ts';

const spawns = vi.hoisted(() => {
  const files: string[] = [];
  const state = { files };

  return state;
});

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();
  const { recordingExecFile } = await import('../shared/turbo/test/utils/spawn-recorder.spec.util.ts');
  const mocked = { ...real, execFile: recordingExecFile(real.execFile, spawns.files) };

  return mocked;
});

const targetLike = PRESETS['target-like'];

const NULL_HASH_LINT: FixtureSpec = { ...targetLike, nullHashTask: 'lint' };

/** An atom file task: its name holds a path; `@fx/e2e-1` inherits it from its definitions package through `extends`. */
const FILE_TASK = 'e2e-ci--tests/spec-001.spec.ts';

const FILE_TASK_PACKAGE = '@fx/e2e-1';

const FILE_TASK_ID = `${FILE_TASK_PACKAGE}#${FILE_TASK}`;

/** Defines the file tasks `@fx/e2e-1` inherits, so an unfiltered run of the bare name lists it too. */
const DEFINITIONS_PACKAGE = '@fx/e2e-1-atoms';

const TRUSTED = { trusted: true } as const;

const rootTurboJsonSchema = object({ tasks: object({ build: object({ dependsOn: array(string()) }) }) });

const statesOf = (states: DryRunState[], task: string): DryRunState[] => states.filter((state) => state.id.endsWith(`#${task}`));

const turboSpawns = (binary: TurboBinary): number => spawns.files.filter((file) => file === binary.path).length;

/** Resolves the dev turbo for `fixture`, then clears the spawn record its `--version` left. */
const binaryFor = async (fixture: FixtureHandle): Promise<TurboBinary> => {
  const binary = await resolveTurbo(fixture.dir, { ...TRUSTED, overridePath: devTurboPath() });

  spawns.files.length = 0;

  return binary;
};

describe('FEATURE: dry-run states from a real turbo', () => {
  describe('GIVEN a target-like copy whose lint task has a JIT input', () => {
    const fixture = fixtureHook(NULL_HASH_LINT);
    let binary: TurboBinary;
    let states: DryRunState[];

    beforeAll(async () => {
      binary = await binaryFor(fixture());
      states = await readDryRun(binary, { tasks: ['lint', 'build'] });
    });

    it('WHEN lint and build run dry THEN every lint state is deferred with a null hash', () => {
      const lint = statesOf(states, 'lint');
      const isDeferred = (state: DryRunState): boolean => state.hash === null && state.cache === 'deferred';

      expect(lint.length).toBeGreaterThan(0);
      expect(lint.filter(isDeferred)).toStrictEqual(lint);
    });

    it('WHEN lint and build run dry THEN every build state is HIT or MISS with a string hash', () => {
      const build = statesOf(states, 'build');
      const isHashed = (state: DryRunState): boolean => typeof state.hash === 'string' && state.cache !== 'deferred';

      expect(build.length).toBeGreaterThan(0);
      expect(build.filter(isHashed)).toStrictEqual(build);
    });

    it('WHEN lint and build run dry THEN no manifest phantom of lint or build is listed', () => {
      const isRequested = (name: string): boolean => name.endsWith('#lint') || name.endsWith('#build');
      const phantoms = manifestTaskNames(fixture().manifest, ['phantom']).filter(isRequested);
      const ids = states.map((state) => state.id);

      expect(phantoms.length).toBeGreaterThan(0);
      expect(ids.filter((id) => phantoms.includes(id))).toStrictEqual([]);
    });

    it('WHEN lint and build run dry THEN the states are sorted by id', () => {
      const ids = states.map((state) => state.id);

      expect(ids).toStrictEqual(ids.toSorted());
    });

    it('WHEN lint and build run dry THEN turbo was spawned exactly once', () => {
      expect(turboSpawns(binary)).toBe(1);
    });
  });

  describe('GIVEN a target-like copy', () => {
    const fixture = fixtureHook(targetLike);
    let binary: TurboBinary;

    beforeAll(async () => {
      binary = await binaryFor(fixture());
    });

    beforeEach(() => {
      spawns.files.length = 0;
    });

    /**
     * Review Focus 4: a task name holding a path goes through argv as it is. It runs as task + `--filter`, since turbo's
     * `pkg#task` argv lookup misses a task the package only inherits through `extends`, as atom file tasks are.
     */
    describe('WHEN the path-bearing atom file task name runs dry filtered to its package', () => {
      let ids: string[] = [];
      let spawnCount = 0;

      beforeAll(async () => {
        spawns.files.length = 0;
        const states = await readDryRun(binary, { tasks: [FILE_TASK], packages: [FILE_TASK_PACKAGE] });

        ids = states.map((state) => state.id);
        spawnCount = turboSpawns(binary);
      });

      it('THEN its pkg#task id is listed', () => {
        expect(ids).toContain(FILE_TASK_ID);
      });

      it('THEN turbo was spawned exactly once', () => {
        expect(spawnCount).toBe(1);
      });

      it('THEN the definitions package that also holds the task name is filtered out', () => {
        expect(ids.filter((id) => id.startsWith(`${DEFINITIONS_PACKAGE}#`))).toStrictEqual([]);
      });
    });

    describe('WHEN one regular package runs build dry filtered to it', () => {
      let states: DryRunState[] = [];
      let rootBuildDependsOn: string[] = [];

      beforeAll(async () => {
        const manifestPackage = packageWithRole(fixture().manifest, 'regular');
        const turboJson = await readFile(join(fixture().dir, 'turbo.json'), 'utf8');

        rootBuildDependsOn = rootTurboJsonSchema.parse(JSON.parse(turboJson)).tasks.build.dependsOn;
        states = await readDryRun(binary, { tasks: ['build'], packages: [manifestPackage.name] });
      });

      it('THEN each state definition dependsOn equals the root turbo.json build dependsOn', () => {
        const dependsOnOf = (state: DryRunState): string[] => state.definition.dependsOn;

        expect(states.length).toBeGreaterThan(0);
        expect(states.map(dependsOnOf)).toStrictEqual(states.map(() => rootBuildDependsOn));
      });

      it('THEN each state definition is cached and not persistent', () => {
        const isCachedAndFinite = (state: DryRunState): boolean => state.definition.cache && !state.definition.persistent;

        expect(states.filter(isCachedAndFinite)).toStrictEqual(states);
      });
    });

    it('WHEN the caller signal is already aborted THEN it rejects failed, aborted, without spawning turbo', async () => {
      const reading = readDryRun(binary, { tasks: ['build'] }, { signal: AbortSignal.abort() });

      await expect(reading).rejects.toBeInstanceOf(TurboException);
      await expect(reading).rejects.toMatchObject({ kind: 'failed' });
      await expect(reading).rejects.toThrow('aborted');
      expect(turboSpawns(binary)).toBe(0);
    });

    it('WHEN no task is asked for THEN it rejects invalid-argument without spawning turbo', async () => {
      const reading = readDryRun(binary, { tasks: [] });

      await expect(reading).rejects.toBeInstanceOf(TurboException);
      await expect(reading).rejects.toMatchObject({ kind: 'invalid-argument' });
      expect(turboSpawns(binary)).toBe(0);
    });
  });
});
