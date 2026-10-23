import { describe, expect, it } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { portsWith } from '../test/utils/graph-session.spec.util.ts';

describe('FEATURE: graph session task messages before the run wiring', () => {
  describe('GIVEN a session on /ws', () => {
    it.each([[{ type: 'runTask', taskId: 'a#build', noCache: false }], [{ type: 'stopTask', taskId: 'a#build' }]])(
      'WHEN %j arrives THEN it is dropped and logged',
      async (raw) => {
        const ports = portsWith(null);
        const session = new GraphSession('/ws', new RootStore(), ports);

        await session.receive(raw);

        expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Dropped a graph message'));
      }
    );
  });
});
