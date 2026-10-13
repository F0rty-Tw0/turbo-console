import type * as childProcess from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PRESETS, applyEdit } from '@turbo-console/repo-gen';
import type { FixtureHandle, FixtureSpec } from '@turbo-console/repo-gen';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, readAffected, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { AffectedResult, TurboBinary } from '../index.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { fixtureHook } from '../shared/turbo/test/utils/fixture-hook.spec.util.ts';
import { leafPackage } from '../shared/turbo/test/utils/manifest.spec.util.ts';

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

    it('WHEN read THEN the leaf test, whose inputs are src/** only, is not affected', () => {
      const leaf = leafPackage(fixture().manifest);

      expect(taskIds(result)).not.toContain(`${leaf.name}#test`);
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

  describe('GIVEN a target-like copy with affectedUsingTaskInputs off and a leaf README edit', () => {
    const fixture = fixtureHook(FLAG_OFF);

    it('WHEN read THEN the mode is package', async () => {
      await editLeafReadme(fixture());
      const binary = await binaryFor(fixture());

      const result = await readAffected(binary, AFFECTED_RANGE);

      expect(result.mode).toBe('package');
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
