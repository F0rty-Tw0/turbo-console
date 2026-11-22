import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleMode } from './graph-module-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphPackageModulesMessage, ModulesResult } from '../../bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { ModuleModeRig } from '../test/common/graph-module-mode.type.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { REPLY_AT, RIG_CAMERA, WEB_GONE, WEB_LISTED, moduleModeRigOf } from '../test/utils/graph-module-mode.spec.util.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';
import { defaultExpandedOf } from '../utils/module-expand.util.ts';
import { moduleTreeOf } from '../utils/module-tree.util.ts';

const FAILED_RESULT: ModulesResult = { kind: 'failed' };

const FOUND: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: MODULES_FOUND_STUB };

const FAILED: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FAILED_RESULT };

const OTHER: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'ui', result: MODULES_FOUND_STUB };

const DEFAULT_EXPANDED = defaultExpandedOf(moduleTreeOf(MODULES_FOUND_STUB.files));

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_BACK: ModulesViewState = { ...FRESH_WEB, expanded: DEFAULT_EXPANDED, camera: RIG_CAMERA };

const WEB_SRC_OPEN: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

describe('FEATURE: GraphModuleMode scan results', () => {
  let rig: ModuleModeRig;
  let modes: ViewStateModes;
  let mode: GraphModuleMode;

  /** Modules mode over a real `ViewStateModes` with nothing saved, Loading web. */
  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    modes = new ViewStateModes(saver, null);
    rig = moduleModeRigOf(modes);
    mode = new GraphModuleMode(rig.deps);
    mode.received(WEB_LISTED);
    mode.enter('web');
  });

  describe('GIVEN Loading web with no expansion set up', () => {
    it('WHEN web is found THEN it is Shown, saves the default expansion and draws with the first camera', () => {
      mode.scanned(FOUND, REPLY_AT);

      expect(mode.phase()).toStrictEqual({ kind: 'shown', name: 'web', found: MODULES_FOUND_STUB });
      expect(modes.modules()?.expanded).toStrictEqual(DEFAULT_EXPANDED);
      expect(rig.screen.shown.mock.calls).toStrictEqual([['web', MODULES_FOUND_STUB, modes.modules(), { kind: 'first' }]]);
    });

    it('WHEN web is found at time 10 THEN the frame clock starts at 10 before the draw', () => {
      mode.scanned(FOUND, REPLY_AT);

      const [startOrder] = rig.start.mock.invocationCallOrder;
      const [shownOrder] = rig.screen.shown.mock.invocationCallOrder;

      expect(rig.start.mock.calls).toStrictEqual([[REPLY_AT]]);
      expect(startOrder).toBeLessThan(shownOrder ?? 0);
    });

    it('WHEN a reply for ui arrives THEN it is ignored', () => {
      mode.scanned(OTHER, REPLY_AT);

      expect([mode.phase(), rig.screen.shown.mock.calls]).toStrictEqual([{ kind: 'loading', name: 'web' }, []]);
      expect(rig.start).not.toHaveBeenCalled();
    });

    it('WHEN web fails THEN it is Failed with no graph kept and the frame clock is not started', () => {
      mode.scanned(FAILED, REPLY_AT);

      expect(mode.phase()).toStrictEqual({ kind: 'failed', name: 'web', found: null });
      expect(rig.screen.failed).toHaveBeenCalledWith('web');
      expect(rig.start).not.toHaveBeenCalled();
    });

    it('WHEN Refresh is pressed THEN scanModules is posted again and it stays Loading', () => {
      mode.refresh();

      expect(rig.post).toHaveBeenCalledTimes(2);
      expect(mode.phase().kind).toBe('loading');
    });

    it('WHEN Back is pressed THEN no camera is saved, since nothing is drawn', () => {
      mode.leave();

      expect(modes.modules()?.camera).toBeNull();
    });
  });

  describe('GIVEN Shown web', () => {
    beforeEach(() => {
      mode.scanned(FOUND, REPLY_AT);
    });

    it('WHEN web is found again THEN it redraws keeping the camera', () => {
      mode.scanned(FOUND, REPLY_AT);

      expect(rig.screen.shown.mock.calls[1]?.[3]).toStrictEqual({ kind: 'keep' });
    });

    it('WHEN web fails THEN it is Failed and keeps the old graph', () => {
      mode.scanned(FAILED, REPLY_AT);

      expect(mode.phase()).toStrictEqual({ kind: 'failed', name: 'web', found: MODULES_FOUND_STUB });
    });

    it('WHEN Back is pressed THEN the camera is saved, the mode is packages, the view is kept and it leaves to packages', () => {
      mode.leave();

      expect([modes.mode(), modes.modules()?.camera, rig.onExit.mock.calls]).toStrictEqual(['packages', RIG_CAMERA, [['packages']]]);
      expect(rig.screen.exit).toHaveBeenCalledOnce();
    });

    it('WHEN web is left and entered again THEN the expansion and camera come back', () => {
      mode.leave();
      mode.enter('web');

      expect(modes.modules()).toStrictEqual(WEB_BACK);
    });

    it('WHEN a state no longer lists web THEN it leaves and says so', () => {
      mode.received(WEB_GONE);

      expect([mode.isActive(), rig.notice.mock.calls]).toStrictEqual([false, [['web is no longer in the workspace']]]);
    });

    it('WHEN a view is updated with an anchor THEN it is saved and drawn again around it', () => {
      mode.update(WEB_SRC_OPEN, { kind: 'anchor', id: 'dir:src' });

      expect([mode.view(), rig.screen.shown.mock.lastCall]).toStrictEqual([
        WEB_SRC_OPEN,
        ['web', MODULES_FOUND_STUB, WEB_SRC_OPEN, { kind: 'anchor', id: 'dir:src' }]
      ]);
    });
  });

  describe('GIVEN Shown web replaced by a host message', () => {
    beforeEach(() => {
      mode.scanned(FOUND, REPLY_AT);
      mode.suspend();
    });

    it('WHEN a state lists web THEN the saved view is drawn again keeping the camera', () => {
      mode.received(WEB_LISTED);

      expect(rig.screen.shown.mock.lastCall).toStrictEqual(['web', MODULES_FOUND_STUB, modes.modules(), { kind: 'keep' }]);
    });

    it('WHEN a second state lists web THEN nothing is drawn again', () => {
      mode.received(WEB_LISTED);
      mode.received(WEB_LISTED);

      expect(rig.screen.shown).toHaveBeenCalledTimes(2);
    });

    it('WHEN a state no longer lists web THEN it leaves without drawing', () => {
      mode.received(WEB_GONE);

      expect([mode.isActive(), rig.screen.shown.mock.calls.length]).toStrictEqual([false, 1]);
    });
  });

  describe('GIVEN Loading web replaced by a host message', () => {
    it('WHEN a state lists web THEN nothing is drawn or shown until its scan lands', () => {
      mode.suspend();
      mode.received(WEB_LISTED);

      expect([rig.screen.shown.mock.calls, rig.screen.reshow.mock.calls]).toStrictEqual([[], []]);
    });
  });

  describe('GIVEN Failed web', () => {
    beforeEach(() => {
      mode.scanned(FAILED, REPLY_AT);
    });

    it('WHEN web is entered again THEN it is Loading and posts', () => {
      mode.enter('web');

      expect([mode.phase().kind, rig.post.mock.calls.length]).toStrictEqual(['loading', 2]);
    });

    it('WHEN web is found THEN it is Shown', () => {
      mode.scanned(FOUND, REPLY_AT);

      expect(mode.phase().kind).toBe('shown');
    });

    it('WHEN a host message replaced it and a state lists web THEN the graph view shows again', () => {
      mode.suspend();
      mode.received(WEB_LISTED);

      expect(rig.screen.reshow).toHaveBeenCalledOnce();
    });

    it('WHEN a view is updated THEN it is saved but nothing is drawn', () => {
      mode.update(WEB_SRC_OPEN, { kind: 'fit' });

      expect([mode.view(), rig.screen.shown.mock.calls]).toStrictEqual([WEB_SRC_OPEN, []]);
    });
  });
});
