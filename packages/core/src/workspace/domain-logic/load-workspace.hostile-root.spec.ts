import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import type * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
import { growOnce } from '../../cache/test/utils/file-growth.spec.util.ts';
import { newRoot } from '../../cache/test/utils/root-fixture.spec.util.ts';
import type { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import type { TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { graphPackage, packageGraph } from '../test/utils/graph.spec.util.ts';

/** The spawn is always mocked here: a real turbo reads a hostile root file to its end and can exhaust the machine's memory. */
const turbo = vi.hoisted(() => {
  const state = { stdout: '', calls: 0 };

  return state;
});

vi.mock('../../shared/turbo/data-access/query-turbo.ts', () => {
  const queryTurbo = async (): Promise<TurboResult> => {
    const result: TurboResult = { stdout: turbo.stdout, stderr: '', exitCode: 0 };

    turbo.calls += 1;

    return Promise.resolve(result);
  };

  const mocked = { queryTurbo };

  return mocked;
});

const reads = vi.hoisted(() => {
  const proceed = async (): Promise<void> => Promise.resolve();
  const beforeRead: (path: string) => Promise<void> = proceed;
  const release = (): void => undefined;
  const state = { beforeRead, proceed, release };

  return state;
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof fsPromises>();

  /** Each handle runs `reads.beforeRead` with its path before every read, so a case can grow or hold a root file mid-hash. */
  const open = async (...args: Parameters<typeof real.open>): Promise<fsPromises.FileHandle> => {
    const handle = await real.open(...args);
    const read = handle.read.bind(handle);
    const hookedRead = async (...readArgs: unknown[]): Promise<unknown> => {
      await reads.beforeRead(String(args[0]));

      return Reflect.apply(read, handle, readArgs);
    };

    Object.defineProperty(handle, 'read', { value: hookedRead });

    return handle;
  };

  const mocked = { ...real, open };

  return mocked;
});

const GRAPH = packageGraph([graphPackage('a', 'a', [], [])], []);

/** mkfifo is POSIX only. */
const IS_POSIX = process.platform !== 'win32';

/** `/proc/self/pagemap` is Linux only. */
const IS_LINUX = process.platform === 'linux';

/** chmod has no effect on Windows, and root reads any file. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

/** Stats as a regular file of size 0, yet reads on for hundreds of GiB. */
const PAGEMAP = '/proc/self/pagemap';

const ABORTED = 'turbo query packageGraph was aborted';

/** Over the 1 MiB a read may run past the stat size, yet far under the 64 MiB lockfile cap: only the slack stops the read. */
const LARGE_GROWTH_BYTES = 2 * 1024 * 1024;

let tempDir = '';

/** Holds every read of the file named `name` until `released` settles, resolving `held` first, as a hung filesystem would. */
const holdReads = (
  name: string,
  held: PromiseWithResolvers<undefined>,
  released: Promise<undefined>
): ((path: string) => Promise<void>) => {
  return async (path: string): Promise<void> => {
    const fileName = basename(path);
    const isTarget = fileName === name;

    if (!isTarget) return;

    held.resolve(undefined);
    await released;
  };
};

const binaryAt = (root: string): TurboBinary => new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');

/** The refusal naming `path` and its own byte cap: 64 MiB for a lockfile, 4 MiB for any other keyed file. */
const refusal = (path: string, capMib: number): Pick<TurboException, 'kind' | 'message'> => {
  const message = `root keyed file ${path} is not a regular file of at most ${capMib} MiB; turbo is not run`;
  const expected: Pick<TurboException, 'kind' | 'message'> = { kind: 'io', message };

  return expected;
};

describe('FEATURE: workspace loading refuses hostile root files', () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'load-hostile-root-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    turbo.stdout = JSON.stringify(GRAPH);
    turbo.calls = 0;
  });

  afterEach(() => {
    reads.release();
    reads.beforeRead = reads.proceed;
  });

  describe('GIVEN a root keyed file that is no regular file or never ends', () => {
    it.skipIf(!IS_POSIX)('WHEN turbo.json is a FIFO THEN the load rejects io naming it and turbo is not run', async () => {
      const root = await newRoot(tempDir);

      await rm(join(root, 'turbo.json'));
      execFileSync('mkfifo', [join(root, 'turbo.json')]);

      const loading = loadWorkspace(binaryAt(root));

      await expect(loading).rejects.toMatchObject(refusal('turbo.json', 4));
      expect(turbo.calls).toBe(0);
    });

    it.skipIf(!IS_LINUX)('WHEN pnpm-lock.yaml links to procfs THEN the load rejects io naming it and turbo is not run', async () => {
      const root = await newRoot(tempDir);

      await symlink(PAGEMAP, join(root, 'pnpm-lock.yaml'));

      const loading = loadWorkspace(binaryAt(root));

      await expect(loading).rejects.toMatchObject(refusal('pnpm-lock.yaml', 64));
      expect(turbo.calls).toBe(0);
    });
  });

  describe('GIVEN a FIFO root turbo.json and a caller signal that already aborted', () => {
    it.skipIf(!IS_POSIX)('WHEN loaded THEN the abort wins: it rejects failed and turbo is not run', async () => {
      const root = await newRoot(tempDir);
      const controller = new AbortController();

      await rm(join(root, 'turbo.json'));
      execFileSync('mkfifo', [join(root, 'turbo.json')]);
      controller.abort();

      const loading = loadWorkspace(binaryAt(root), { signal: controller.signal });

      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
      expect(turbo.calls).toBe(0);
    });
  });

  describe('GIVEN a root keyed file read that hangs, and a caller that aborts during it', () => {
    it('WHEN loaded THEN it rejects failed at once and turbo is not run', { timeout: 1000 }, async () => {
      const root = await newRoot(tempDir);
      const controller = new AbortController();
      const held = Promise.withResolvers<undefined>();
      const released = Promise.withResolvers<undefined>();

      reads.release = (): void => released.resolve(undefined);
      reads.beforeRead = holdReads('turbo.json', held, released.promise);

      const loading = loadWorkspace(binaryAt(root), { signal: controller.signal });

      await held.promise;
      controller.abort();

      await expect(loading).rejects.toMatchObject({ kind: 'failed', message: ABORTED });
      expect(turbo.calls).toBe(0);
    });
  });

  describe('GIVEN a root lockfile that grows by more than 1 MiB while it is hashed', () => {
    it('WHEN loaded THEN it is not refused and turbo runs once', async () => {
      const root = await newRoot(tempDir);

      await writeFile(join(root, 'pnpm-lock.yaml'), 'x');
      reads.beforeRead = growOnce('pnpm-lock.yaml', LARGE_GROWTH_BYTES);

      const model = await loadWorkspace(binaryAt(root));

      expect(model.root).toBe(root);
      expect(turbo.calls).toBe(1);
    });
  });

  describe('GIVEN a root keyed file that only denies reading', () => {
    it.skipIf(!CAN_DENY_READ)('WHEN .npmrc cannot be read THEN the load still runs turbo once', async () => {
      const root = await newRoot(tempDir);

      await writeFile(join(root, '.npmrc'), '');
      await chmod(join(root, '.npmrc'), 0o000);

      const model = await loadWorkspace(binaryAt(root));

      expect(model.root).toBe(root);
      expect(turbo.calls).toBe(1);
    });
  });
});
