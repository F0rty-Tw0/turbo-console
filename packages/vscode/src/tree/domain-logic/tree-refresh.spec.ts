import { beforeEach, describe, expect, it } from 'vitest';

import { TreeRefresher } from './tree-refresh.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { RefresherFixture } from '../test/common/refresher-fixture.type.ts';
import { refresherFixtureOf, scriptRunOf } from '../test/utils/tree-refresher.spec.util.ts';
import { rowIdOf } from '../utils/row-id.util.ts';

const SCRIPT_ID = rowIdOf('task', '/ws', 's#lint');

const RUNNING = scriptRunOf('/ws');

const PROCESS_STARTED = scriptRunOf('/ws', { processStartedAt: 1500 });

const STOP_REQUESTED = scriptRunOf('/ws', { processStartedAt: 1500, stopRequested: true });

const STOPPED = scriptRunOf('/ws', { state: 'stopped', processStartedAt: 1500, endedAt: 2000 });

const LIVE: ReadonlySet<string> = new Set(['s#lint']);

const NOBODY: ReadonlySet<string> = new Set();

describe('FEATURE: tree refresh on a run change', () => {
  let fixture: RefresherFixture;
  let refresher: TreeRefresher;

  beforeEach(() => {
    fixture = refresherFixtureOf();
    refresher = new TreeRefresher(fixture.deps);
  });

  describe('GIVEN scripts hidden and a script that has not started', () => {
    it('WHEN it starts running THEN the whole tree is redrawn once', () => {
      fixture.live.set('/ws', LIVE);

      refresher.runChanged(RUNNING);

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
    });
  });

  describe('GIVEN scripts hidden and a script whose run the tree redrew for', () => {
    beforeEach(() => {
      fixture.live.set('/ws', LIVE);
      refresher.runChanged(RUNNING);
      fixture.show();
      fixture.fire.mockClear();
    });

    it('WHEN its process starts THEN only its task node is redrawn', () => {
      refresher.runChanged(PROCESS_STARTED);

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(fixture.cache.get(SCRIPT_ID));
    });

    it('WHEN a stop is requested THEN only its task node is redrawn', () => {
      refresher.runChanged(STOP_REQUESTED);

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(fixture.cache.get(SCRIPT_ID));
    });

    describe('WHEN it ends', () => {
      beforeEach(() => {
        fixture.live.set('/ws', NOBODY);
        refresher.runChanged(STOPPED);
      });

      it('THEN the whole tree is redrawn once', () => {
        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
      });

      it('THEN the package shown only for that run leaves the node cache', () => {
        expect(fixture.cache.has(rowIdOf('pkg', '/ws', 's'))).toBe(false);
      });

      it('THEN a later start redraws the whole tree again', () => {
        fixture.live.set('/ws', LIVE);
        fixture.fire.mockClear();

        refresher.runChanged(RUNNING);

        expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
      });
    });
  });

  describe('GIVEN scripts shown and the script row in the tree', () => {
    beforeEach(async () => {
      await fixture.toggle.set(true);
      fixture.show();
    });

    it.each([
      ['starts running', RUNNING],
      ['has its process start', PROCESS_STARTED],
      ['has a stop requested', STOP_REQUESTED],
      ['ends', STOPPED]
    ])('WHEN the script %s THEN only its task node is redrawn', (_title, entry) => {
      refresher.runChanged(entry);

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(fixture.cache.get(SCRIPT_ID));
    });
  });

  describe('GIVEN scripts hidden and a turbo task a#build in the tree', () => {
    it('WHEN it starts and ends THEN each change redraws only its task node', () => {
      const turbo = { ...RUN_ENTRY_STUB, root: '/ws', taskId: 'a#build', packageName: 'a' };

      fixture.show();

      const taskNode = fixture.cache.get(rowIdOf('task', '/ws', 'a#build'));

      refresher.runChanged(turbo);
      refresher.runChanged({ ...turbo, state: 'passed', endedAt: 2000 });

      expect(fixture.fire.mock.calls).toStrictEqual([[taskNode], [taskNode]]);
    });
  });

  describe('GIVEN scripts hidden and a task node whose model task is gone', () => {
    it('WHEN its run starts THEN only that node is redrawn', () => {
      const goneId = rowIdOf('task', '/ws', 's#gone');
      const goneNode = { kind: 'task', id: goneId, root: '/ws', key: 's#gone', packageName: 's' } as const;

      fixture.cache.set(goneId, goneNode);
      refresher.runChanged(scriptRunOf('/ws', { taskId: 's#gone' }));

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(goneNode);
    });
  });

  describe('GIVEN scripts hidden in a window with two roots', () => {
    it('WHEN a script of /other starts running THEN the /other root node is redrawn, not the tree', () => {
      const two = refresherFixtureOf(true);
      const twoRefresher = new TreeRefresher(two.deps);

      two.live.set('/other', LIVE);
      two.show();
      twoRefresher.runChanged(scriptRunOf('/other'));

      expect(two.fire).toHaveBeenCalledExactlyOnceWith(two.cache.get(rowIdOf('root', '/other', '/other')));
    });
  });
});
