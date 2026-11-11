import type * as childProcess from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS, applyEdit } from '@turbo-console/repo-gen';
import type { FixtureHandle, FixtureSpec, Manifest, ManifestPackage } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, readAffected, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { AffectedResult, TurboBinary } from '../index.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { leafPackage, packageTaskNames } from '../shared/turbo/test/utils/manifest.spec.util.ts';

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

const FLAG_OFF: FixtureSpec = { ...targetLike, affectedUsingTaskInputs: false };

const AFFECTED_RANGE = { base: 'HEAD~1', head: 'HEAD' };

const TRUSTED = { trusted: true } as const;

const taskIds = (result: AffectedResult): string[] => result.tasks.map((task) => task.id);

/** The leaf package's `#test` id. */
const leafTestId = (fixture: FixtureHandle): string => `${leafPackage(fixture.manifest).name}#test`;

const turboSpawns = (binary: TurboBinary): number => spawns.files.filter((file) => file === binary.path).length;

/** Resolves the dev turbo for `fixture`, then clears the spawn record its `--version` left. */
const binaryFor = async (fixture: FixtureHandle): Promise<TurboBinary> => {
  const binary = await resolveTurbo(fixture.dir, { ...TRUSTED, overridePath: devTurboPath() });

  spawns.files.length = 0;

  return binary;
};

/** Appends a line to the leaf package's README.md and commits it as HEAD. */
const editLeafReadme = async (fixture: FixtureHandle): Promise<void> => {
  const leaf = leafPackage(fixture.manifest);

  await applyEdit(fixture.dir, [`${leaf.path}/README.md`]);
};

/** A `regular` package that has a dependency, and that dependency; read from the manifest, so a generator change fails loudly. */
type DependencyPair = { readonly dependent: ManifestPackage; readonly dependency: ManifestPackage };

const dependencyPairOf = (manifest: Manifest): DependencyPair => {
  const dependent = manifest.packages.find((pkg) => pkg.role === 'regular' && pkg.dependencies.length > 0);
  const dependency = manifest.packages.find((pkg) => pkg.name === dependent?.dependencies[0]);

  if (dependent === undefined || dependency === undefined) throw new Error('no regular package with a dependency');

  const pair: DependencyPair = { dependent, dependency };

  return pair;
};

describe('FEATURE: affected tasks from a real turbo', () => {
  describe('GIVEN a target-like copy with a leaf README edit committed as HEAD', () => {
    const fixture = fixtureHook(targetLike);
    let binary: TurboBinary;
    let result: AffectedResult;

    beforeAll(async () => {
      await editLeafReadme(fixture());
      binary = await binaryFor(fixture());
      result = await readAffected(binary, AFFECTED_RANGE);
    });

    it('WHEN read THEN the mode is task', () => {
      expect(result.mode).toBe('task');
    });

    it('WHEN read THEN the leaf build is affected', () => {
      const leaf = leafPackage(fixture().manifest);

      expect(taskIds(result)).toContain(`${leaf.name}#build`);
    });

    it('WHEN read THEN the leaf build is a file change and its detail is the edited README path', () => {
      const leaf = leafPackage(fixture().manifest);
      const build = result.tasks.find((task) => task.id === `${leaf.name}#build`);

      expect(build).toStrictEqual({ id: `${leaf.name}#build`, reason: 'TaskFileChanged', detail: `${leaf.path}/README.md` });
    });

    it('WHEN read THEN the leaf test, whose inputs are src/** only, is not affected', () => {
      const leaf = leafPackage(fixture().manifest);
      const leafTest = leafTestId(fixture());

      expect(packageTaskNames(fixture().manifest, leaf.name)).toContain(leafTest);
      expect(taskIds(result)).not.toContain(leafTest);
    });

    it('WHEN read THEN the tasks are sorted by id', () => {
      const ids = taskIds(result);

      expect(ids).toStrictEqual(ids.toSorted());
    });

    it('WHEN read THEN turbo was spawned exactly once', () => {
      expect(turboSpawns(binary)).toBe(1);
    });

    it('WHEN the caller signal is already aborted THEN it rejects failed, aborted, without spawning turbo', async () => {
      spawns.files.length = 0;

      const reading = readAffected(binary, { ...AFFECTED_RANGE, signal: AbortSignal.abort() });

      await expect(reading).rejects.toBeInstanceOf(TurboException);
      await expect(reading).rejects.toMatchObject({ kind: 'failed' });
      await expect(reading).rejects.toThrow('aborted');
      expect(turboSpawns(binary)).toBe(0);
    });
  });

  describe('GIVEN a target-like copy with a README edit of a package another package depends on', () => {
    const fixture = fixtureHook(targetLike);
    let pair: DependencyPair;
    let result: AffectedResult;

    beforeAll(async () => {
      pair = dependencyPairOf(fixture().manifest);
      await applyEdit(fixture().dir, [`${pair.dependency.path}/README.md`]);

      const binary = await binaryFor(fixture());

      result = await readAffected(binary, AFFECTED_RANGE);
    });

    it('WHEN read THEN the edited package build is TaskFileChanged with the README path as detail', () => {
      const build = result.tasks.find((task) => task.id === `${pair.dependency.name}#build`);

      expect(build).toStrictEqual({
        id: `${pair.dependency.name}#build`,
        reason: 'TaskFileChanged',
        detail: `${pair.dependency.path}/README.md`
      });
    });

    it('WHEN read THEN the dependent build is a dependency reason whose detail names the edited package', () => {
      const build = result.tasks.find((task) => task.id === `${pair.dependent.name}#build`);

      expect(['TaskDependencyTaskChanged', 'TaskPackageDependencyChanged']).toContain(build?.reason);
      expect(build?.detail).toContain(pair.dependency.name);
    });
  });

  describe('GIVEN a target-like copy with affectedUsingTaskInputs off and a leaf README edit', () => {
    const fixture = fixtureHook(FLAG_OFF);
    let result: AffectedResult;

    beforeAll(async () => {
      await editLeafReadme(fixture());

      const binary = await binaryFor(fixture());

      result = await readAffected(binary, AFFECTED_RANGE);
    });

    it('WHEN read THEN the mode is package, and the leaf test is affected too', () => {
      expect(result.mode).toBe('package');
      expect(taskIds(result)).toContain(leafTestId(fixture()));
    });

    it('WHEN read THEN the leaf test reads TaskAllChanged with a string detail', () => {
      const leafTest = result.tasks.find((task) => task.id === leafTestId(fixture()));

      expect(leafTest?.reason).toBe('TaskAllChanged');
      expect(typeof leafTest?.detail).toBe('string');
    });
  });

  describe('GIVEN a target-like copy whose root turbo.json is not JSON', () => {
    const fixture = fixtureHook(targetLike);

    it('WHEN read THEN turbo rejects the config and it fails', async () => {
      const binary = await binaryFor(fixture());

      await writeFile(join(fixture().dir, 'turbo.json'), '{');

      const reading = readAffected(binary, AFFECTED_RANGE);

      await expect(reading).rejects.toBeInstanceOf(TurboException);
      await expect(reading).rejects.toMatchObject({ kind: 'failed' });
    });
  });
});
