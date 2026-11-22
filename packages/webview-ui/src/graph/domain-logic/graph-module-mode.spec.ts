import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphModuleMode } from './graph-module-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphScanModulesMessage } from '../../bridge/common/graph-modules.type.ts';
import type { GraphViewState, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { ModuleModeRig } from '../test/common/graph-module-mode.type.ts';
import { REPLY_AT, ROOT_LISTED, WEB_GONE, WEB_LISTED, moduleModeRigOf } from '../test/utils/graph-module-mode.spec.util.ts';
import { freshModulesViewOf, freshViewStateOf } from '../utils/fresh-view-state.util.ts';

const SCAN_WEB: GraphScanModulesMessage = { type: 'scanModules', packageName: 'web' };

const SCAN_UI: GraphScanModulesMessage = { type: 'scanModules', packageName: 'ui' };

const SCAN_ROOT: GraphScanModulesMessage = { type: 'scanModules', packageName: '//' };

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_SRC_OPEN: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const FRESH_STATE: GraphViewState = freshViewStateOf('h1');

describe('FEATURE: GraphModuleMode entry and package states', () => {
  let rig: ModuleModeRig;
  let modes: ViewStateModes;
  let mode: GraphModuleMode;

  /** Modules mode over a real `ViewStateModes` that starts from `saved`, with task mode in `isTaskMode`. */
  const open = (saved: GraphViewState | null = null, isTaskMode = false): void => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    modes = new ViewStateModes(saver, saved);
    rig = moduleModeRigOf(modes, isTaskMode);
    mode = new GraphModuleMode(rig.deps);
  };

  describe('GIVEN package mode with a graph state held', () => {
    beforeEach(() => {
      open();
      mode.received(WEB_LISTED);
    });

    it('WHEN web is entered THEN it is Loading, posts scanModules once and saves a fresh web view in modules mode', () => {
      mode.enter('web');

      expect(mode.phase()).toStrictEqual({ kind: 'loading', name: 'web' });
      expect(rig.post.mock.calls).toStrictEqual([[SCAN_WEB]]);
      expect([modes.mode(), modes.modules()]).toStrictEqual(['modules', FRESH_WEB]);
    });

    it('WHEN web is entered THEN the screen enters and shows the scan of web', () => {
      mode.enter('web');

      expect([rig.screen.enter.mock.calls, rig.screen.scanning.mock.calls]).toStrictEqual([[[]], [['web']]]);
    });

    it('WHEN web is entered twice THEN the second enter is ignored', () => {
      mode.enter('web');
      mode.enter('web');

      expect(rig.post).toHaveBeenCalledOnce();
    });

    it('WHEN web then ui is entered THEN it is Loading ui with a fresh ui view and one post each', () => {
      mode.enter('web');
      mode.enter('ui');

      expect(mode.phase()).toStrictEqual({ kind: 'loading', name: 'ui' });
      expect(rig.post.mock.calls).toStrictEqual([[SCAN_WEB], [SCAN_UI]]);
      expect(modes.modules()).toStrictEqual(freshModulesViewOf('ui'));
    });

    it('WHEN nothing is entered THEN it is off and task mode is not touched', () => {
      expect([mode.isActive(), mode.phase(), rig.tasks.leave.mock.calls]).toStrictEqual([false, { kind: 'off' }, []]);
    });
  });

  describe('GIVEN a cold panel with no graph state yet', () => {
    beforeEach(() => {
      open();
    });

    it('WHEN showModules web arrives THEN it is Waiting and posts nothing', () => {
      mode.receive({ type: 'showModules', name: 'web' }, REPLY_AT);

      expect(mode.phase()).toStrictEqual({ kind: 'waiting', name: 'web' });
      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN the first graph state lists web THEN it is Loading and posts scanModules once', () => {
      mode.enter('web');
      mode.received(WEB_LISTED);
      mode.received(WEB_LISTED);

      expect(mode.phase()).toStrictEqual({ kind: 'loading', name: 'web' });
      expect(rig.post.mock.calls).toStrictEqual([[SCAN_WEB]]);
    });

    it('WHEN Refresh is pressed while Waiting THEN nothing is posted', () => {
      mode.enter('web');
      mode.refresh();

      expect(rig.post).not.toHaveBeenCalled();
    });

    it('WHEN the first graph state does not list web THEN it leaves to packages with the gone notice', () => {
      mode.enter('web');
      mode.received(WEB_GONE);

      expect([mode.phase(), rig.onExit.mock.calls, rig.notice.mock.calls]).toStrictEqual([
        { kind: 'off' },
        [['packages']],
        [['web is no longer in the workspace']]
      ]);
      expect(rig.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a reload saved in modules mode on web with src expanded', () => {
    const saved: GraphViewState = { ...FRESH_STATE, mode: 'modules', modules: WEB_SRC_OPEN };

    beforeEach(() => {
      open(saved);
      mode.enter('web');
    });

    it('WHEN the first graph state lists web THEN it asks once and keeps the saved expansion', () => {
      mode.received(WEB_LISTED);

      expect(rig.post.mock.calls).toStrictEqual([[SCAN_WEB]]);
      expect(modes.modules()?.expanded).toStrictEqual(['src']);
    });
  });

  describe('GIVEN single-package task mode with the root state held', () => {
    beforeEach(() => {
      open(null, true);
      mode.received(ROOT_LISTED);
    });

    it('WHEN // is entered THEN task mode is parked toward modules and the scan is asked', () => {
      mode.enter('//');

      expect(rig.tasks.leave.mock.calls).toStrictEqual([['modules']]);
      expect(rig.post.mock.calls).toStrictEqual([[SCAN_ROOT]]);
    });

    it('WHEN // is entered and left THEN Back returns to tasks and leaves the mode for task mode to write', () => {
      mode.enter('//');
      mode.leave();

      expect([rig.onExit.mock.calls, modes.mode()]).toStrictEqual([[['tasks']], 'modules']);
    });
  });
});
