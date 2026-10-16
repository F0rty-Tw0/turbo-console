import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { readTurboConfigs } from './turbo-config.ts';
import type * as smallFile from '../../shared/fs/data-access/small-file.ts';
import type { TaskPresence, TurboConfigOk } from '../common/turbo-config.type.ts';

const reads = vi.hoisted(() => {
  const paths: string[] = [];
  const proceed = async (): Promise<void> => Promise.resolve();
  const before: (path: string) => Promise<void> = proceed;
  const state = { inFlight: 0, peak: 0, paths, before, proceed };

  return state;
});

vi.mock('../../shared/fs/data-access/small-file.ts', async (importOriginal) => {
  const real = await importOriginal<typeof smallFile>();

  /** Counts every call as it starts; `reads.before` runs first, so a case can fail or abort a read. */
  const readSmallFile = async (path: string): Promise<string | null> => {
    reads.paths.push(path);
    reads.inFlight += 1;
    reads.peak = Math.max(reads.peak, reads.inFlight);

    try {
      await reads.before(path);

      return await real.readSmallFile(path);
    } finally {
      reads.inFlight -= 1;
    }
  };

  const mocked = { ...real, readSmallFile };

  return mocked;
});

/** `MAX_CONCURRENT_READS` in `turbo-config.ts`. */
const MAX_CONCURRENT_READS = 16;

const PACKAGE_COUNT = 40;

const DESCRIBED = '{"tasks":{"build":{"description":"x"}}}';

const BUILD_DESCRIPTIONS = { build: 'x' };

const BUILD_TASKS: Record<string, TaskPresence> = { build: 'defined' };

const CALLER_REASON = new Error('caller stopped');

const packageDir = (index: number): string => `packages/p${String(index).padStart(2, '0')}`;

const PACKAGE_DIRS = Array.from({ length: PACKAGE_COUNT }, (_, index) => packageDir(index));

const okConfig = (path: string): TurboConfigOk => {
  const config: TurboConfigOk = {
    path,
    descriptions: BUILD_DESCRIPTIONS,
    tasks: BUILD_TASKS,
    extends: [],
    affectedUsingTaskInputs: false
  };

  return config;
};

const deniedError = (): Error => Object.assign(new Error('denied'), { code: 'EACCES' });

/** Resolves once every started read has finished, so no read can still start a new one. */
const readsSettled = async (): Promise<void> => {
  await vi.waitFor(() => {
    expect(reads.inFlight).toBe(0);
  });
};

describe('FEATURE: turbo.json(c) reads across many packages', () => {
  let root = '';

  const isRootFile = (path: string): boolean => path === join(root, 'turbo.json');

  const failRoot = async (path: string): Promise<void> => {
    const isRoot = isRootFile(path);

    if (isRoot) return Promise.reject(deniedError());

    return Promise.resolve();
  };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'turbo-config-reads-'));
    await writeFile(join(root, 'turbo.json'), DESCRIBED);

    for (const dir of PACKAGE_DIRS) {
      await mkdir(join(root, dir), { recursive: true });
      await writeFile(join(root, dir, 'turbo.json'), DESCRIBED);
    }
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    reads.inFlight = 0;
    reads.peak = 0;
    reads.paths.length = 0;
    reads.before = reads.proceed;
  });

  describe('GIVEN more package directories than the read cap, listed in reverse', () => {
    it('WHEN the configs are read THEN every config is listed, sorted by path', async () => {
      const reversed = PACKAGE_DIRS.toReversed();
      const packageConfigs = PACKAGE_DIRS.map((dir) => okConfig(`${dir}/turbo.json`));
      const expected = [...packageConfigs, okConfig('turbo.json')];

      const configs = await readTurboConfigs(root, reversed);

      expect(configs).toStrictEqual(expected);
    });

    it('WHEN the configs are read THEN at most the cap of files is read at once, and the cap is reached', async () => {
      await readTurboConfigs(root, PACKAGE_DIRS);

      expect(reads.peak).toBe(MAX_CONCURRENT_READS);
    });

    it('WHEN the configs are read THEN each file is read exactly once', async () => {
      const packageFiles = PACKAGE_DIRS.map((dir) => join(root, dir, 'turbo.json'));
      const allFiles = [...packageFiles, join(root, 'turbo.json')];
      const expected = allFiles.toSorted();

      await readTurboConfigs(root, PACKAGE_DIRS);

      expect(reads.paths.toSorted()).toStrictEqual(expected);
    });
  });

  describe('GIVEN the root read fails', () => {
    it('WHEN the configs are read THEN it rejects io and no read starts after the failure', async () => {
      reads.before = failRoot;

      const reading = readTurboConfigs(root, PACKAGE_DIRS);

      await expect(reading).rejects.toMatchObject({ kind: 'io', message: `${join(root, 'turbo.json')}: EACCES` });
      await readsSettled();
      expect(reads.paths).toHaveLength(MAX_CONCURRENT_READS);
    });

    it('WHEN the caller aborts later THEN the read failure is still the rejection', async () => {
      const controller = new AbortController();

      reads.before = async (path: string): Promise<void> => {
        await failRoot(path);
        await setTimeout(10);
        controller.abort(CALLER_REASON);
      };

      const reading = readTurboConfigs(root, PACKAGE_DIRS, controller.signal);

      await expect(reading).rejects.toMatchObject({ kind: 'io' });
    });
  });

  describe('GIVEN the caller aborts before a read fails', () => {
    it('WHEN the configs are read THEN the caller reason is the rejection and no other read starts', async () => {
      const controller = new AbortController();

      reads.before = async (): Promise<void> => {
        controller.abort(CALLER_REASON);

        return Promise.reject(deniedError());
      };

      const reading = readTurboConfigs(root, PACKAGE_DIRS, controller.signal);

      await expect(reading).rejects.toBe(CALLER_REASON);
      expect(reads.paths).toHaveLength(1);
    });

    it('WHEN no read starts between the abort and the failure THEN the caller reason is still the rejection', async () => {
      const controller = new AbortController();

      reads.before = async (path: string): Promise<void> => {
        const isRoot = isRootFile(path);

        if (!isRoot) return setTimeout(20);

        await setTimeout(5);
        controller.abort(CALLER_REASON);

        return Promise.reject(deniedError());
      };

      const reading = readTurboConfigs(root, PACKAGE_DIRS, controller.signal);

      await expect(reading).rejects.toBe(CALLER_REASON);
    });
  });
});
