import { execFileSync } from 'node:child_process';
import { chmod, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkspace } from './load-workspace.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import { TurboBinary } from '../../binary/common/index.ts';
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

const GRAPH = packageGraph([graphPackage('a', 'a', [], [])], []);

/** mkfifo is POSIX only. */
const IS_POSIX = process.platform !== 'win32';

/** `/proc/self/pagemap` is Linux only. */
const IS_LINUX = process.platform === 'linux';

/** chmod has no effect on Windows, and root reads any file. */
const CAN_DENY_READ = process.platform !== 'win32' && process.getuid?.() !== 0;

/** Stats as a regular file of size 0, yet reads on for hundreds of GiB. */
const PAGEMAP = '/proc/self/pagemap';

let tempDir = '';

const binaryAt = (root: string): TurboBinary => new TurboBinary(root, join(root, 'turbo'), '2.11.7', 'override');

const refusal = (path: string): Pick<TurboException, 'kind' | 'message'> => {
  const message = `root keyed file ${path} is not a regular file of at most 256 MiB; turbo is not run`;
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

  describe('GIVEN a root keyed file that is no regular file or never ends', () => {
    it.skipIf(!IS_POSIX)('WHEN turbo.json is a FIFO THEN the load rejects io naming it and turbo is not run', async () => {
      const root = await newRoot(tempDir);

      await rm(join(root, 'turbo.json'));
      execFileSync('mkfifo', [join(root, 'turbo.json')]);

      const loading = loadWorkspace(binaryAt(root));

      await expect(loading).rejects.toMatchObject(refusal('turbo.json'));
      expect(turbo.calls).toBe(0);
    });

    it.skipIf(!IS_LINUX)('WHEN pnpm-lock.yaml links to procfs THEN the load rejects io naming it and turbo is not run', async () => {
      const root = await newRoot(tempDir);

      await symlink(PAGEMAP, join(root, 'pnpm-lock.yaml'));

      const loading = loadWorkspace(binaryAt(root));

      await expect(loading).rejects.toMatchObject(refusal('pnpm-lock.yaml'));
      expect(turbo.calls).toBe(0);
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
