import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphImageSaver } from './graph-image-saver.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG = Buffer.from([...SIGNATURE, 1, 2, 3]).toString('base64');
const NOT_PNG = Buffer.from('plain text, not a PNG').toString('base64');

type Deferred = {
  readonly promise: Promise<string | null>;
  readonly resolve: (path: string | null) => void;
};

const deferred = (): Deferred => {
  let resolve: Deferred['resolve'] = () => undefined;
  const promise = new Promise<string | null>((done) => {
    resolve = done;
  });
  const pending: Deferred = { promise, resolve };

  return pending;
};

describe('FEATURE: the graph image saver', () => {
  let ports: GraphPorts;
  let saver: GraphImageSaver;

  beforeEach(() => {
    ports = graphPortsMock();
    saver = new GraphImageSaver('/ws', ports);
  });

  describe('GIVEN a PNG', () => {
    beforeEach(() => {
      vi.mocked(ports.pickSaveUri).mockResolvedValue('/out/x.png');
    });

    it('WHEN it is saved THEN the dialog opens at <root>/<basename>-package-graph.png', async () => {
      await saver.save(PNG);

      expect(ports.pickSaveUri).toHaveBeenCalledExactlyOnceWith(join('/ws', 'ws-package-graph.png'));
    });

    it('WHEN it is saved THEN the plain bytes are written to the picked path', async () => {
      await saver.save(PNG);

      expect(ports.writeBytes).toHaveBeenCalledExactlyOnceWith('/out/x.png', Uint8Array.from([...SIGNATURE, 1, 2, 3]));
    });

    it('WHEN it is saved THEN an info shows the path', async () => {
      await saver.save(PNG);

      expect(ports.showInfo).toHaveBeenCalledExactlyOnceWith('Saved the graph image to /out/x.png.');
    });

    it('WHEN the write rejects THEN an error shows its message and the failure is logged', async () => {
      vi.mocked(ports.writeBytes).mockRejectedValue(new Error('disk full'));

      await saver.save(PNG);

      expect(ports.showError).toHaveBeenCalledExactlyOnceWith('Could not save the graph image: disk full');
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('disk full');
      expect(ports.showInfo).not.toHaveBeenCalled();
    });

    it('WHEN the dialog rejects THEN an error shows its message and the next save opens a dialog', async () => {
      vi.mocked(ports.pickSaveUri).mockRejectedValueOnce(new Error('no window'));

      await saver.save(PNG);
      await saver.save(PNG);

      expect(ports.showError).toHaveBeenCalledExactlyOnceWith('Could not save the graph image: no window');
      expect(ports.pickSaveUri).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN the dialog is cancelled', () => {
    it('WHEN a PNG is saved THEN nothing is written and no message shows', async () => {
      vi.mocked(ports.pickSaveUri).mockResolvedValue(null);

      await saver.save(PNG);

      expect(ports.writeBytes).not.toHaveBeenCalled();
      expect(ports.showInfo).not.toHaveBeenCalled();
      expect(ports.showError).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN bytes that are not a PNG', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('WHEN they are saved THEN only their first 12 characters are decoded', async () => {
      const from = vi.spyOn(Buffer, 'from');

      await saver.save(NOT_PNG);

      expect(from).toHaveBeenCalledExactlyOnceWith(NOT_PNG.slice(0, 12), 'base64');
    });

    it('WHEN they are saved THEN an error shows, the dialog stays shut and the failure is logged', async () => {
      await saver.save(NOT_PNG);

      expect(ports.showError).toHaveBeenCalledExactlyOnceWith('The graph image was not a PNG.');
      expect(ports.pickSaveUri).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledOnce();
    });

    it('WHEN they are saved THEN the next PNG still opens a dialog', async () => {
      await saver.save(NOT_PNG);
      await saver.save(PNG);

      expect(ports.pickSaveUri).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a first save whose dialog is still open', () => {
    let first: Deferred;
    let firstSave: Promise<void>;

    beforeEach(() => {
      first = deferred();
      vi.mocked(ports.pickSaveUri).mockReturnValueOnce(first.promise);
      firstSave = saver.save(PNG);
    });

    it('WHEN a second arrives THEN it is dropped and logged with no second dialog', async () => {
      await saver.save(PNG);

      expect(ports.pickSaveUri).toHaveBeenCalledOnce();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('Dropped a graph message: exportImage while a save is open');
    });

    it('WHEN the first resolves and a third arrives THEN a dialog opens', async () => {
      first.resolve(null);
      await firstSave;

      await saver.save(PNG);

      expect(ports.pickSaveUri).toHaveBeenCalledTimes(2);
    });
  });
});
