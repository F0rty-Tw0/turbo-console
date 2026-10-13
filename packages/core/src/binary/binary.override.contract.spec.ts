import type * as childProcess from 'node:child_process';
import { mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import { TurboException, resolveTurbo } from '../index.ts';
// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import '..' this rule asks for.
import type { TurboBinary } from '../index.ts';

const spawns = vi.hoisted(() => {
  const state = { files: [] as string[] };

  return state;
});

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof childProcess>();
  const { recordingExecFile } = await import('../shared/turbo/test/utils/spawn-recorder.spec.util.ts');
  const mocked = { ...real, execFile: recordingExecFile(real.execFile, spawns.files) };

  return mocked;
});

const turboSpawns = (path: string): number => spawns.files.filter((file) => file === path).length;

const rejectionOf = async (resolving: Promise<TurboBinary>): Promise<unknown> => resolving.catch((error: unknown) => error);

// A Windows `.cmd` stub needs `shell: true`, which core never uses.
describe.skipIf(process.platform === 'win32')('FEATURE: override turbo resolution with POSIX shell stubs', () => {
  let tempDir = '';

  const writeStub = async (name: string, body: string, mode = 0o755): Promise<string> => {
    const path = join(tempDir, name);

    await writeFile(path, `#!/bin/sh\n${body}\n`, { mode });

    return path;
  };

  const resolveStub = async (path: string): Promise<TurboBinary> => resolveTurbo(tempDir, { trusted: true, overridePath: path });

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'binary-override-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5 });
  });

  beforeEach(() => {
    spawns.files.length = 0;
  });

  describe('GIVEN a stub printing one version', () => {
    it('WHEN the version is past the range THEN it rejects version-unsupported naming the version and the range', async () => {
      const stub = await writeStub('too-new.sh', 'echo 2.12.0');

      const error = await rejectionOf(resolveStub(stub));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'version-unsupported' });
      expect(error).toHaveProperty('message', expect.stringContaining('2.12.0'));
      expect(error).toHaveProperty('message', expect.stringContaining('2.11.7'));
    });

    it('WHEN a supported version is resolved again THEN --version is spawned once', async () => {
      const stub = await writeStub('supported.sh', 'echo 2.11.7');

      const first = await resolveStub(stub);
      const second = await resolveStub(stub);

      expect(first).toMatchObject({ path: stub, version: '2.11.7', source: 'override' });
      expect(second.version).toBe('2.11.7');
      expect(turboSpawns(stub)).toBe(1);
    });

    it('WHEN five callers resolve it at once THEN they share one --version spawn', async () => {
      const stub = await writeStub('concurrent.sh', 'echo 2.11.7');
      const callers = Array.from({ length: 5 }, async () => resolveStub(stub));

      const resolved = await Promise.all(callers);
      const versions = resolved.map((binary) => binary.version);

      expect(versions).toStrictEqual(['2.11.7', '2.11.7', '2.11.7', '2.11.7', '2.11.7']);
      expect(turboSpawns(stub)).toBe(1);
    });

    it('WHEN its mtime changes between resolutions THEN --version is spawned again', async () => {
      const stub = await writeStub('touched.sh', 'echo 2.11.7');
      const later = new Date(Date.now() + 5000);

      await resolveStub(stub);
      await utimes(stub, later, later);
      await resolveStub(stub);

      expect(turboSpawns(stub)).toBe(2);
    });

    it('WHEN it is rewritten to the same size with its mtime restored THEN --version is spawned again', async () => {
      const stub = await writeStub('swapped.sh', 'echo 2.11.7');

      await resolveStub(stub);

      const before = await stat(stub);

      await writeFile(stub, '#!/bin/sh\necho 2.12.0\n');
      await utimes(stub, before.atimeMs / 1000, before.mtimeMs / 1000);

      const after = await stat(stub);
      const error = await rejectionOf(resolveStub(stub));

      expect(after).toMatchObject({ size: before.size, mtimeMs: before.mtimeMs });
      expect(error).toMatchObject({ kind: 'version-unsupported' });
      expect(turboSpawns(stub)).toBe(2);
    });

    it('WHEN the caller has aborted THEN it rejects failed reading was aborted', async () => {
      const stub = await writeStub('aborted.sh', 'echo 2.11.7');
      const options = { trusted: true, overridePath: stub, signal: AbortSignal.abort() } as const;

      const error = await rejectionOf(resolveTurbo(tempDir, options));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'failed', message: 'turbo --version was aborted' });
    });

    it('WHEN the root does not exist THEN it rejects io naming the root', async () => {
      const stub = await writeStub('elsewhere.sh', 'echo 2.11.7');
      const root = join(tempDir, 'missing');

      const error = await rejectionOf(resolveTurbo(root, { trusted: true, overridePath: stub }));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'io', message: `${root}: ENOENT` });
    });
  });

  describe('GIVEN a stub whose --version fails', () => {
    it('WHEN it exits non-zero THEN it rejects failed with the exit code and stderr tail', async () => {
      const stub = await writeStub('broken.sh', 'echo boom >&2\nexit 1');

      const error = await rejectionOf(resolveStub(stub));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'failed', message: 'turbo --version exited 1\nboom' });
    });

    it('WHEN it fails once and then succeeds THEN the failure was not cached and --version is spawned again', async () => {
      const stub = await writeStub('flaky.sh', '[ -f "$0.ok" ] && echo 2.11.7 && exit 0\nexit 3');

      const first = await rejectionOf(resolveStub(stub));

      await writeFile(`${stub}.ok`, '');

      const second = await resolveStub(stub);

      expect(first).toMatchObject({ kind: 'failed', message: 'turbo --version exited 3' });
      expect(second.version).toBe('2.11.7');
      expect(turboSpawns(stub)).toBe(2);
    });

    it('WHEN it is not executable THEN it rejects not-found', async () => {
      const stub = await writeStub('plain.sh', 'echo 2.11.7', 0o644);

      const error = await rejectionOf(resolveStub(stub));

      expect(error).toBeInstanceOf(TurboException);
      expect(error).toMatchObject({ kind: 'not-found' });
    });
  });
});
