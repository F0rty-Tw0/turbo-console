import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createElkClient } from './elk-worker-client.ts';
import type { ScriptUrlPolicy } from '../common/script-url-policy.type.ts';
import type { WorkerDouble } from '../test/common/elk-mock.type.ts';
import { workerConstructorMock, workerMock } from '../test/mocks/elk.mock.ts';

const POLICY: ScriptUrlPolicy = { urlFor: (url: string): string => url };

const errorEventOf = (message: string): Event => Object.assign(new Event('error'), { message });

const textOf = async (source: unknown): Promise<string> => {
  if (!(source instanceof Blob)) throw new Error('createObjectURL got no Blob');

  return source.text();
};

describe('FEATURE: createElkClient', () => {
  let worker: WorkerDouble;
  let workerConstructor: Mock<(url: string) => WorkerDouble>;
  let sources: unknown[];

  beforeEach((): void => {
    const keepSource = (source: unknown): string => {
      sources.push(source);

      return 'blob:test';
    };

    sources = [];
    worker = workerMock();
    workerConstructor = workerConstructorMock(worker);
    vi.stubGlobal('Worker', workerConstructor);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(keepSource);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((): void => undefined);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a worker that can be built', () => {
    it('WHEN the client is created THEN exactly one worker is built from the blob URL', () => {
      createElkClient('WORKER_TEXT', POLICY);

      expect(workerConstructor).toHaveBeenCalledExactlyOnceWith('blob:test');
    });

    it('WHEN the client is created THEN the blob holds the worker text after a strict-mode prefix', async () => {
      createElkClient('WORKER_TEXT', POLICY);

      const text = await textOf(sources[0]);

      expect(sources).toHaveLength(1);
      expect(text).toBe("'use strict';\nWORKER_TEXT");
    });

    it('WHEN the client is created THEN the real elk-api registers its algorithms with the worker', () => {
      createElkClient('WORKER_TEXT', POLICY);

      expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'register' }));
    });

    it('WHEN the worker fires an error event THEN the onError listener gets its message', () => {
      const listener = vi.fn<(message: string) => void>();
      const client = createElkClient('WORKER_TEXT', POLICY);

      client.onError(listener);

      worker.dispatchEvent(errorEventOf('bad'));

      expect(listener).toHaveBeenCalledWith('bad');
    });

    it('WHEN a second listener is set THEN only it hears the error', () => {
      const replaced = vi.fn<(message: string) => void>();
      const listener = vi.fn<(message: string) => void>();
      const client = createElkClient('WORKER_TEXT', POLICY);

      client.onError(replaced);
      client.onError(listener);

      worker.dispatchEvent(errorEventOf('bad'));

      expect(replaced).not.toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith('bad');
    });

    it('WHEN the worker fires an error event with no listener set THEN nothing throws', () => {
      createElkClient('WORKER_TEXT', POLICY);

      const dispatch = (): boolean => worker.dispatchEvent(errorEventOf('bad'));

      expect(dispatch).not.toThrow();
    });

    it('WHEN the client is terminated THEN the worker is terminated once', () => {
      const client = createElkClient('WORKER_TEXT', POLICY);

      client.terminate();

      expect(worker.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN the client is terminated THEN the blob URL is revoked once', () => {
      const client = createElkClient('WORKER_TEXT', POLICY);

      client.terminate();

      expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:test');
    });

    it('WHEN a graph is laid out THEN the layout command goes to the worker', () => {
      const client = createElkClient('WORKER_TEXT', POLICY);

      const graph: ElkNode = { id: 'root' };

      void client.layout(graph);

      expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ cmd: 'layout', graph }));
    });
  });

  describe('GIVEN a worker that cannot be built', () => {
    beforeEach((): void => {
      const refuse = function (): WorkerDouble {
        throw new Error('worker-src blocked');
      };

      workerConstructor.mockImplementation(refuse);
    });

    it('WHEN the client is created THEN the error reaches the caller', () => {
      const create = (): unknown => createElkClient('WORKER_TEXT', POLICY);

      expect(create).toThrow('worker-src blocked');
    });

    it('WHEN the client is created THEN the blob URL is revoked', () => {
      const create = (): unknown => createElkClient('WORKER_TEXT', POLICY);

      expect(create).toThrow();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });
});
