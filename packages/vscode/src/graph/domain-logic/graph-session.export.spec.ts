import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');

describe('FEATURE: graph session image export', () => {
  describe('GIVEN a session on /ws', () => {
    it('WHEN the page posts an exportImage THEN the save dialog opens at the default path', async () => {
      const ports = portsWith(null);
      const session = new GraphSession('/ws', new RootStore(), ports);

      await session.receive({ type: 'exportImage', png: PNG });

      expect(ports.pickSaveUri).toHaveBeenCalledExactlyOnceWith(join('/ws', 'ws-package-graph.png'));
    });

    it('WHEN the png carries a data: prefix THEN the schema drops it and no dialog opens', async () => {
      const ports = portsWith(null);
      const session = new GraphSession('/ws', new RootStore(), ports);

      await session.receive({ type: 'exportImage', png: `data:image/png;base64,${PNG}` });

      expect(ports.pickSaveUri).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });
  });
});
