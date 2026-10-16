import { beforeEach, describe, expect, it } from 'vitest';

import { TreeRefresher } from './tree-refresh.ts';
import type { RefresherFixture } from '../test/common/refresher-fixture.type.ts';
import { refresherFixtureOf, scriptRunOf, taskRunOf } from '../test/utils/tree-refresher.spec.util.ts';
import { rowIdOf } from '../utils/row-id.util.ts';

const SCRIPT_ID = rowIdOf('task', '/ws', 's#lint');

const RUNNING = scriptRunOf('/ws');

const PROCESS_STARTED = scriptRunOf('/ws', { processStartedAt: 1500 });

const STOP_REQUESTED = scriptRunOf('/ws', { processStartedAt: 1500, stopRequested: true });

const STOPPED = scriptRunOf('/ws', { state: 'stopped', processStartedAt: 1500, endedAt: 2000 });

const LIVE: ReadonlySet<string> = new Set(['s#lint']);

const NOBODY: ReadonlySet<string> = new Set();

const OTHER_ROOT_ID = rowIdOf('root', '/other', '/other');

/** A refresher over the fixture that reseeds on every toggle change, as `PackagesTree.scriptsChanged` does. */
const refresherOf = (fixture: RefresherFixture): TreeRefresher => {
  const refresher = new TreeRefresher(fixture.deps);

  fixture.toggle.onDidChange(() => {
    refresher.reseed();
  });

  return refresher;
};

/** Shows the scripts, then hides them again: two reseeds, scripts hidden after. */
const toggleTwice = async (fixture: RefresherFixture): Promise<void> => {
  await fixture.toggle.set(true);
  await fixture.toggle.set(false);
};

describe('FEATURE: tree refresh on a run change', () => {
  let fixture: RefresherFixture;
  let refresher: TreeRefresher;

  beforeEach(() => {
    fixture = refresherFixtureOf();
    refresher = refresherOf(fixture);
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
      const turbo = taskRunOf('/ws', 'a#build', 'a');

      fixture.show();

      const taskNode = fixture.cache.get(rowIdOf('task', '/ws', 'a#build'));

      refresher.runChanged(turbo);
      refresher.runChanged({ ...turbo, state: 'passed', endedAt: 2000 });

      expect(fixture.fire.mock.calls).toStrictEqual([[taskNode], [taskNode]]);
    });
  });

  describe('GIVEN scripts hidden and the script a#lint of package a, which has turbo tasks', () => {
    const scriptRun = taskRunOf('/ws', 'a#lint', 'a');

    beforeEach(() => {
      fixture.live.set('/ws', new Set(['a#lint']));
      refresher.runChanged(scriptRun);
      fixture.show();
      fixture.live.set('/ws', NOBODY);
      refresher.runChanged({ ...scriptRun, state: 'passed', endedAt: 2000 });
    });

    it('WHEN it starts and ends THEN each change redraws the whole tree', () => {
      expect(fixture.fire.mock.calls).toStrictEqual([[undefined], [undefined]]);
    });

    it('WHEN it ends THEN package a stays in the node cache', () => {
      expect(fixture.cache.has(rowIdOf('pkg', '/ws', 'a'))).toBe(true);
    });
  });

  describe('GIVEN scripts hidden and a script running in a root the window dropped', () => {
    it('WHEN the toggle flips twice, the root comes back and the run ends THEN the whole tree is redrawn', async () => {
      fixture.live.set('/ws', LIVE);
      refresher.runChanged(RUNNING);

      const removed = fixture.entries.splice(0, 1);

      await toggleTwice(fixture);
      fixture.entries.push(...removed);
      fixture.live.set('/ws', NOBODY);
      fixture.fire.mockClear();

      refresher.runChanged(STOPPED);

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
    });
  });

  describe('GIVEN scripts hidden and a remembered run that left the live set unseen', () => {
    it('WHEN the toggle flips twice and the script starts again THEN the whole tree is redrawn', async () => {
      fixture.live.set('/ws', LIVE);
      refresher.runChanged(RUNNING);
      fixture.live.set('/ws', NOBODY);
      await toggleTwice(fixture);
      fixture.live.set('/ws', LIVE);
      fixture.fire.mockClear();

      refresher.runChanged(RUNNING);

      expect(fixture.fire).toHaveBeenCalledExactlyOnceWith(undefined);
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

  describe('GIVEN scripts hidden and the atom-file task s#gen, which is never a row', () => {
    it('WHEN its run starts THEN nothing is redrawn', () => {
      refresher.runChanged(scriptRunOf('/ws', { taskId: 's#gen' }));

      expect(fixture.fire).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN scripts hidden in a window with two roots', () => {
    it('WHEN a script of /other starts running THEN the /other root node is redrawn, not the tree', () => {
      const two = refresherFixtureOf(true);
      const twoRefresher = new TreeRefresher(two.deps);

      two.live.set('/other', LIVE);
      two.show();
      twoRefresher.runChanged(scriptRunOf('/other'));

      expect(two.fire).toHaveBeenCalledExactlyOnceWith(two.cache.get(OTHER_ROOT_ID));
    });

    it('WHEN a /other script live at a toggle ends THEN the /other root node is redrawn', async () => {
      const two = refresherFixtureOf(true);
      const twoRefresher = refresherOf(two);

      two.live.set('/other', LIVE);
      await toggleTwice(two);
      two.show();
      two.live.set('/other', NOBODY);

      twoRefresher.runChanged(scriptRunOf('/other', { state: 'stopped', endedAt: 2000 }));

      expect(two.fire).toHaveBeenCalledExactlyOnceWith(two.cache.get(OTHER_ROOT_ID));
    });
  });
});
