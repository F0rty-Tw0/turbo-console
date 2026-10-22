import { beforeEach, describe, expect, it } from 'vitest';

import { GraphLayouts } from './graph-layouts.ts';
import type { GraphWebviewMessage, LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { GraphReady, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import { LAYING_OUT_FOLDERS_TEXT, LAYING_OUT_GRAPH_TEXT } from '../common/graph.const.ts';
import type { LayoutsRig } from '../test/common/graph-layouts.type.ts';
import {
  DRAGGED_POSITIONS_STUB,
  FLAT_POSITIONS_STUB,
  GROUPED_POSITIONS_STUB,
  OTHER_POSITIONS_STUB,
  SAVED_GROUPED_STUB,
  STATE_STUB
} from '../test/stubs/graph-layouts.stub.ts';
import { isGroupedGraph, layoutsRigOf, resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { folderGroupsOf } from '../utils/folder-group.util.ts';

type HarnessParts = {
  readonly layouts: GraphLayouts;
  readonly open: (state?: GraphReady, saved?: GraphViewState | null) => void;
};

type LayoutsHarness = LayoutsRig & HarnessParts;

const UNCACHED: GraphReady = { ...STATE_STUB, positions: null };

const CACHED_BOTH: GraphReady = { ...STATE_STUB, folderPositions: GROUPED_POSITIONS_STUB };

const GROUPS: FolderGroup[] = folderGroupsOf(STATE_STUB.packages);

const NAMES: string[] = ['web', 'ui', 'core'];

const layoutsHarness = (): LayoutsHarness => {
  const rig = layoutsRigOf();
  const layouts = new GraphLayouts(rig.deps);
  const open = (state: GraphReady = STATE_STUB, saved: GraphViewState | null = null): void => {
    rig.setDrawn(state);
    void layouts.show(state, saved);
  };
  const harness: LayoutsHarness = { ...rig, layouts, open };

  return harness;
};

const positionsPost = (positions: Positions, grouping: LayoutGrouping): GraphWebviewMessage => {
  const post: GraphWebviewMessage = { type: 'positions', hash: 'h1', positions, grouping };

  return post;
};

const DONE_ELK: GraphWebviewMessage = { type: 'layoutDone', ms: 5, engine: 'elk' };

describe('FEATURE: GraphLayouts', () => {
  let harness: LayoutsHarness;

  beforeEach(() => {
    harness = layoutsHarness();
  });

  it('GIVEN the grouped layout is pending WHEN the reader toggles flat, grouped, flat, grouped THEN one grouped run lays out and lands once', async () => {
    harness.open(STATE_STUB, null);
    void harness.layouts.switchTo('folders');
    void harness.layouts.switchTo('flat');
    void harness.layouts.switchTo('folders');
    await harness.runs.settle(0, resultOf('h1', GROUPED_POSITIONS_STUB));

    expect(harness.runs.count()).toBe(1);
    expect(harness.view.setGrouping).toHaveBeenCalledExactlyOnceWith(expect.any(Array));
    expect(harness.view.setPositions).toHaveBeenCalledExactlyOnceWith(GROUPED_POSITIONS_STUB);
    expect(harness.layouts.drawnMode()).toBe('folders');
  });

  describe('GIVEN a new hash', () => {
    it('WHEN it opens with the flat layout cached THEN the cached layout draws at once', () => {
      harness.open(STATE_STUB, null);

      expect(harness.screen.showGraph).toHaveBeenCalledExactlyOnceWith(false);
      expect(harness.view.setGraph).toHaveBeenCalledExactlyOnceWith(NAMES, STATE_STUB.edges, FLAT_POSITIONS_STUB, harness.deps.sizeOf);
      expect(harness.runs.count()).toBe(0);
      expect(harness.layouts.engine()).toBe('cache');
      expect(harness.onDrawn).toHaveBeenCalledExactlyOnceWith(null);
      expect(harness.onPlaced).toHaveBeenCalledExactlyOnceWith('flat');
      expect(harness.onDrawn).toHaveBeenCalledBefore(harness.onPlaced);
    });

    it('WHEN it opens with no positions THEN Loading shows, a flat run lays out, draws and posts', async () => {
      harness.open(UNCACHED, null);
      await harness.runs.settle(0, resultOf('h1', FLAT_POSITIONS_STUB));

      expect(harness.screen.showLoading).toHaveBeenCalledOnce();
      expect(isGroupedGraph(harness.runs.graphOf(0))).toBe(false);
      expect(harness.view.setGraph).toHaveBeenCalledExactlyOnceWith(NAMES, STATE_STUB.edges, FLAT_POSITIONS_STUB, harness.deps.sizeOf);
      expect(harness.posts()).toStrictEqual([positionsPost(FLAT_POSITIONS_STUB, 'flat'), DONE_ELK]);
    });

    it('WHEN it opens grouped with the grouped layout cached THEN the boxes draw at once', () => {
      harness.open(CACHED_BOTH, SAVED_GROUPED_STUB);

      expect(harness.view.setGraph).toHaveBeenCalledExactlyOnceWith(
        NAMES,
        STATE_STUB.edges,
        GROUPED_POSITIONS_STUB,
        harness.deps.sizeOf
      );
      expect(harness.view.setGrouping).toHaveBeenCalledExactlyOnceWith(GROUPS);
      expect(harness.view.setGraph).toHaveBeenCalledBefore(harness.view.setGrouping);
      expect(harness.runs.count()).toBe(0);
      expect(harness.layouts.mode()).toBe('folders');
      expect(harness.layouts.engine()).toBe('cache');
      expect(harness.onPlaced).toHaveBeenCalledExactlyOnceWith('folders');
    });

    it('WHEN it opens grouped with no grouped cache THEN Loading shows and a grouped run posts the folders layout', async () => {
      harness.open(STATE_STUB, SAVED_GROUPED_STUB);
      await harness.runs.settle(0, resultOf('h1', GROUPED_POSITIONS_STUB));

      expect(harness.screen.showLoading).toHaveBeenCalledOnce();
      expect(isGroupedGraph(harness.runs.graphOf(0))).toBe(true);
      expect(harness.posts()).toStrictEqual([positionsPost(GROUPED_POSITIONS_STUB, 'folders'), DONE_ELK]);
    });
  });

  describe('GIVEN both layouts cached and flat dragged', () => {
    it('WHEN the reader switches to grouped and back THEN each switch places its snapshot and fits', () => {
      harness.open(CACHED_BOTH, null);
      harness.layouts.dragged(DRAGGED_POSITIONS_STUB);

      void harness.layouts.switchTo('folders');
      void harness.layouts.switchTo('flat');

      expect(harness.view.setGrouping).toHaveBeenNthCalledWith(1, GROUPS);
      expect(harness.view.setGrouping).toHaveBeenLastCalledWith(null);
      expect(harness.view.setPositions).toHaveBeenLastCalledWith(DRAGGED_POSITIONS_STUB);
      expect(harness.view.fit).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN flat drawn and the grouped layout not cached', () => {
    beforeEach(() => {
      harness.open(STATE_STUB, null);
      void harness.layouts.switchTo('folders');
    });

    it('WHEN the reader switches to grouped THEN the folders progress shows while flat stays and one grouped run starts', () => {
      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'progress', text: LAYING_OUT_FOLDERS_TEXT });
      expect(harness.layouts.mode()).toBe('folders');
      expect(harness.layouts.drawnMode()).toBe('flat');
      expect(harness.view.setGrouping).not.toHaveBeenCalled();
      expect(harness.runs.count()).toBe(1);
      expect(isGroupedGraph(harness.runs.graphOf(0))).toBe(true);
    });

    it('WHEN the reader switches to grouped THEN the canvas resizes after the notice shows', () => {
      expect(harness.view.resize).toHaveBeenCalledOnce();
      expect(harness.screen.showNotice).toHaveBeenCalledBefore(harness.view.resize);
    });

    it('WHEN the reader switches back to flat THEN the canvas resizes after the notice hides', () => {
      void harness.layouts.switchTo('flat');

      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'none' });
      expect(harness.view.resize).toHaveBeenCalledTimes(2);
      expect(harness.screen.showNotice.mock.invocationCallOrder.at(-1)).toBeLessThan(
        harness.view.resize.mock.invocationCallOrder.at(-1) ?? 0
      );
    });

    it('WHEN the reader drags in the window THEN the drag posts as flat', () => {
      harness.layouts.dragged(DRAGGED_POSITIONS_STUB);

      expect(harness.posts()).toStrictEqual([positionsPost(DRAGGED_POSITIONS_STUB, 'flat')]);
    });

    it('WHEN a drag in the window is followed by the grouped landing and a switch to flat THEN the drag is placed', async () => {
      harness.layouts.dragged(DRAGGED_POSITIONS_STUB);
      await harness.runs.settle(0, resultOf('h1', GROUPED_POSITIONS_STUB));

      void harness.layouts.switchTo('flat');

      expect(harness.view.setPositions).toHaveBeenLastCalledWith(DRAGGED_POSITIONS_STUB);
    });

    it('WHEN a new hash opens flat from its cache and the reader switches to grouped THEN a grouped run starts for it', () => {
      harness.open({ ...STATE_STUB, hash: 'h2' }, null);

      void harness.layouts.switchTo('folders');

      expect(harness.runs.count()).toBe(2);
      expect(isGroupedGraph(harness.runs.graphOf(1))).toBe(true);
    });
  });

  describe('GIVEN the grouped layout lands after the reader switched back to flat', () => {
    beforeEach(async () => {
      harness.open(STATE_STUB, null);
      void harness.layouts.switchTo('folders');
      void harness.layouts.switchTo('flat');
      await harness.runs.settle(0, resultOf('h1', GROUPED_POSITIONS_STUB));
    });

    it('THEN nothing changes on screen, the notice included', () => {
      expect(harness.view.setGrouping).not.toHaveBeenCalled();
      expect(harness.view.setPositions).not.toHaveBeenCalled();
      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'none' });
    });

    it('THEN the grouped layout is posted', () => {
      expect(harness.posts()).toContainEqual(positionsPost(GROUPED_POSITIONS_STUB, 'folders'));
    });

    it('WHEN the reader switches to grouped THEN the stored layout is placed with no new run', () => {
      void harness.layouts.switchTo('folders');

      expect(harness.view.setPositions).toHaveBeenCalledExactlyOnceWith(GROUPED_POSITIONS_STUB);
      expect(harness.runs.count()).toBe(1);
    });
  });

  describe('GIVEN folders drawn from the only cached layout', () => {
    it('WHEN the reader switches to flat THEN the graph progress shows', () => {
      harness.open({ ...UNCACHED, folderPositions: GROUPED_POSITIONS_STUB }, SAVED_GROUPED_STUB);

      void harness.layouts.switchTo('flat');

      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'progress', text: LAYING_OUT_GRAPH_TEXT });
    });
  });

  describe('GIVEN the grouped layout fell back while flat came from the cache', () => {
    beforeEach(async () => {
      harness.open(STATE_STUB, null);
      void harness.layouts.switchTo('folders');
      await harness.runs.settle(0, resultOf('h1', GROUPED_POSITIONS_STUB, 'fallback'));
    });

    it('THEN the fallback notice shows and only layoutDone is posted', () => {
      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'fallback' });
      expect(harness.posts()).toStrictEqual([{ type: 'layoutDone', ms: 5, engine: 'fallback' }]);
      expect(harness.layouts.engine()).toBe('fallback');
    });

    it('WHEN the reader drags the grouped layout THEN nothing is posted', () => {
      harness.layouts.dragged(DRAGGED_POSITIONS_STUB);

      expect(harness.posts()).toHaveLength(1);
    });

    it('WHEN the reader switches to flat and drags THEN the flat drag posts', () => {
      void harness.layouts.switchTo('flat');

      harness.layouts.dragged(DRAGGED_POSITIONS_STUB);

      expect(harness.posts().at(-1)).toStrictEqual(positionsPost(DRAGGED_POSITIONS_STUB, 'flat'));
    });
  });

  describe('GIVEN Re-layout pressed while the switch to grouped is pending (review 2)', () => {
    beforeEach(async () => {
      harness.open(STATE_STUB, null);
      void harness.layouts.switchTo('folders');
      void harness.layouts.relayout();
      await harness.runs.settle(0, null);
    });

    it('THEN the restart is grouped and the dropped run changes nothing', () => {
      expect(isGroupedGraph(harness.runs.graphOf(1))).toBe(true);
      expect(harness.layouts.mode()).toBe('folders');
      expect(harness.layouts.drawnMode()).toBe('flat');
      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'progress', text: LAYING_OUT_FOLDERS_TEXT });
      expect(harness.view.setPositions).not.toHaveBeenCalled();
      expect(harness.posts()).toStrictEqual([]);
    });

    it('WHEN the restart lands THEN the boxes are placed once and posted as folders', async () => {
      await harness.runs.settle(1, resultOf('h1', GROUPED_POSITIONS_STUB));

      expect(harness.view.setGrouping).toHaveBeenCalledExactlyOnceWith(GROUPS);
      expect(harness.view.setPositions).toHaveBeenCalledExactlyOnceWith(GROUPED_POSITIONS_STUB);
      expect(harness.layouts.drawnMode()).toBe('folders');
      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'none' });
      expect(harness.posts()).toStrictEqual([positionsPost(GROUPED_POSITIONS_STUB, 'folders'), DONE_ELK]);
      expect(harness.onPlaced).toHaveBeenLastCalledWith('folders');
      expect(harness.runs.count()).toBe(2);
    });

    it('WHEN the reader toggles flat and grouped before the restart lands THEN the restart is reused and placed once', async () => {
      void harness.layouts.switchTo('flat');
      void harness.layouts.switchTo('folders');
      await harness.runs.settle(1, resultOf('h1', GROUPED_POSITIONS_STUB));

      expect(harness.runs.count()).toBe(2);
      expect(harness.view.setGrouping).toHaveBeenCalledExactlyOnceWith(GROUPS);
      expect(harness.view.setPositions).toHaveBeenCalledExactlyOnceWith(GROUPED_POSITIONS_STUB);
      expect(harness.layouts.drawnMode()).toBe('folders');
    });
  });

  describe('GIVEN folders drawn from the cache', () => {
    beforeEach(() => {
      harness.open(CACHED_BOTH, SAVED_GROUPED_STUB);
    });

    it('WHEN Re-layout lands THEN the grouped layout is placed, fitted and posted as folders', async () => {
      void harness.layouts.relayout();
      await harness.runs.settle(0, resultOf('h1', OTHER_POSITIONS_STUB));

      expect(isGroupedGraph(harness.runs.graphOf(0))).toBe(true);
      expect(harness.view.setPositions).toHaveBeenCalledExactlyOnceWith(OTHER_POSITIONS_STUB);
      expect(harness.view.fit).toHaveBeenCalledOnce();
      expect(harness.view.setGrouping).toHaveBeenCalledOnce();
      expect(harness.screen.showNotice).toHaveBeenLastCalledWith({ kind: 'none' });
      expect(harness.posts()).toStrictEqual([positionsPost(OTHER_POSITIONS_STUB, 'folders'), DONE_ELK]);
      expect(harness.onPlaced).toHaveBeenLastCalledWith('folders');
    });

    describe('WHEN a new hash opens flat with only its grouped layout cached', () => {
      const next: GraphReady = { ...STATE_STUB, hash: 'h2', positions: null, folderPositions: OTHER_POSITIONS_STUB };

      beforeEach(() => {
        harness.open(next, null);
      });

      it('THEN Loading shows and a flat run starts', () => {
        expect(harness.screen.showLoading).toHaveBeenCalledOnce();
        expect(harness.layouts.drawnMode()).toBe('flat');
        expect(isGroupedGraph(harness.runs.graphOf(0))).toBe(false);
      });

      it('THEN a switch to grouped after the flat layout lands places the new grouped cache', async () => {
        await harness.runs.settle(0, resultOf('h2', FLAT_POSITIONS_STUB));

        void harness.layouts.switchTo('folders');

        expect(harness.view.setPositions).toHaveBeenLastCalledWith(OTHER_POSITIONS_STUB);
        expect(harness.runs.count()).toBe(1);
      });

      it('THEN a result for the old hash posts and draws nothing', async () => {
        await harness.runs.settle(0, resultOf('h1', FLAT_POSITIONS_STUB));

        expect(harness.view.setGraph).toHaveBeenCalledOnce();
        expect(harness.posts()).toStrictEqual([]);
      });
    });
  });

  describe('GIVEN a layout in flight for an uncached graph', () => {
    beforeEach(() => {
      harness.open(UNCACHED, null);
    });

    it('WHEN another hash opens before it lands THEN its result places and posts nothing', async () => {
      harness.open({ ...UNCACHED, hash: 'h2' }, null);
      await harness.runs.settle(0, resultOf('h1', FLAT_POSITIONS_STUB));

      expect(harness.view.setGraph).not.toHaveBeenCalled();
      expect(harness.posts()).toStrictEqual([]);
    });

    it('WHEN the page drops the graph before it lands THEN its result places and posts nothing', async () => {
      harness.setDrawn(null);
      await harness.runs.settle(0, resultOf('h1', FLAT_POSITIONS_STUB));

      expect(harness.view.setGraph).not.toHaveBeenCalled();
      expect(harness.posts()).toStrictEqual([]);
    });
  });
});
