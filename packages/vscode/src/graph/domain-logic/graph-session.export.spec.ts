import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { PNG_STUB } from '../test/stubs/graph-image.stub.ts';
import { feedsOf } from '../test/utils/graph-feeds.spec.util.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';

describe('FEATURE: graph session image export', () => {
  describe('GIVEN a session on /ws', () => {
    it('WHEN the page posts an exportImage THEN the save dialog opens at the default path', async () => {
      const ports = portsWith(null);
      const session = new GraphSession('/ws', new RootStore(), ports, feedsOf(new RunStore()));

      await session.receive({ type: 'exportImage', png: PNG_STUB });

      expect(ports.pickSaveUri).toHaveBeenCalledExactlyOnceWith(join('/ws', 'ws-package-graph.png'));
    });

    it('WHEN the png carries a data: prefix THEN the schema drops it and no dialog opens', async () => {
      const ports = portsWith(null);
      const session = new GraphSession('/ws', new RootStore(), ports, feedsOf(new RunStore()));

      await session.receive({ type: 'exportImage', png: `data:image/png;base64,${PNG_STUB}` });

      expect(ports.pickSaveUri).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });
  });
});
