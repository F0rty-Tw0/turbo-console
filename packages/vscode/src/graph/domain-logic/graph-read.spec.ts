import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openReadable, textOf } from './graph-read.ts';
import type { ExplainContext, GraphPorts } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';

describe('FEATURE: graph read helpers', () => {
  let ports: GraphPorts;
  let context: ExplainContext;

  beforeEach(() => {
    ports = graphPortsMock();
    context = { state: GRAPH_STATE_STUB, root: '/ws', ports, canPost: (): boolean => true };
  });

  describe('GIVEN textOf', () => {
    it('WHEN the read gives text THEN it is that text', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');

      const text = await textOf(context, '/ws/a.json');

      expect(text).toBe('{}');
    });

    it('WHEN the read rejects THEN it is null and the failure is logged once', async () => {
      vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES'));

      const text = await textOf(context, '/ws/a.json');

      expect(text).toBeNull();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('EACCES');
    });
  });

  describe('GIVEN openReadable', () => {
    it('WHEN the read gives text THEN the file opens at the line', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');

      await openReadable(context, '/ws/a.json', 3, 'thing');

      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith('/ws/a.json', 3);
    });

    it('WHEN the read gives null THEN nothing opens and `Not a readable <what>: <path>` is logged', async () => {
      await openReadable(context, '/ws/a.json', 3, 'thing');

      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('Not a readable thing: /ws/a.json');
    });

    it('WHEN the read gives text but the panel can no longer post THEN nothing opens', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');
      context = { ...context, canPost: (): boolean => false };

      await openReadable(context, '/ws/a.json', 3, 'thing');

      expect(ports.openAt).not.toHaveBeenCalled();
    });

    it('WHEN the read rejects THEN nothing opens and the failure is logged', async () => {
      vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES'));

      await openReadable(context, '/ws/a.json', 3, 'thing');

      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith('EACCES');
    });

    it('WHEN openAt rejects THEN the failure is logged and it does not reject', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');
      vi.mocked(ports.openAt).mockRejectedValue(new Error('no editor'));

      await openReadable(context, '/ws/a.json', 3, 'thing');

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('no editor');
    });
  });
});
