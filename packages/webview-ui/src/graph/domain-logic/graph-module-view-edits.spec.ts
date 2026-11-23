import { describe, expect, it, vi } from 'vitest';
import type { Mocked } from 'vitest';

import { depthEdited, focusCleared, resetView, toggleShown } from './graph-module-view-edits.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleViewEditMode } from '../common/module-controls.type.ts';
import type { ModulePhase } from '../common/module-mode.type.ts';
import { ALL_SHOWN_STUB } from '../test/stubs/module-scene.stub.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

type EditedMode = Mocked<ModuleViewEditMode>;

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_FOCUSED: ModulesViewState = { ...FRESH_WEB, focus: 'file:src/a.ts' };

const LOADING: ModulePhase = { kind: 'loading', name: 'web' };

const modeOf = (view: ModulesViewState | null): EditedMode => {
  const mode: EditedMode = { view: vi.fn(() => view), phase: vi.fn(() => LOADING), update: vi.fn(), save: vi.fn() };

  return mode;
};

describe('FEATURE: module view edits', () => {
  describe('GIVEN a web view focused on src/a.ts', () => {
    it('WHEN depth 3 is edited THEN the view is drawn again at depth 3 with a fit', () => {
      const mode = modeOf(WEB_FOCUSED);

      depthEdited(mode, 3);

      expect([mode.update.mock.calls, mode.save.mock.calls]).toStrictEqual([[[{ ...WEB_FOCUSED, depth: 3 }, { kind: 'fit' }]], []]);
    });

    it('WHEN the focus is cleared THEN the view is saved and drawn with no focus and a fit', () => {
      const mode = modeOf(WEB_FOCUSED);

      focusCleared(mode);

      expect(mode.update.mock.calls).toStrictEqual([[FRESH_WEB, { kind: 'fit' }]]);
    });
  });

  describe('GIVEN a web view with no focus', () => {
    it('WHEN depth 3 is edited THEN it is only saved', () => {
      const mode = modeOf(FRESH_WEB);

      depthEdited(mode, 3);

      expect([mode.save.mock.calls, mode.update.mock.calls]).toStrictEqual([[[{ ...FRESH_WEB, depth: 3 }]], []]);
    });

    it('WHEN every kind is shown THEN the view is drawn again with the camera kept', () => {
      const mode = modeOf(FRESH_WEB);

      toggleShown(mode, ALL_SHOWN_STUB);

      expect(mode.update.mock.calls).toStrictEqual([[{ ...FRESH_WEB, shown: ALL_SHOWN_STUB }, { kind: 'keep' }]]);
    });

    it('WHEN Reset view is pressed while Loading THEN nothing is drawn', () => {
      const mode = modeOf(FRESH_WEB);

      resetView(mode);

      expect(mode.update).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN no saved modules view', () => {
    it('WHEN depth, kinds and focus are edited THEN nothing is saved or drawn', () => {
      const mode = modeOf(null);

      depthEdited(mode, 3);
      toggleShown(mode, ALL_SHOWN_STUB);
      focusCleared(mode);

      expect([mode.update.mock.calls, mode.save.mock.calls]).toStrictEqual([[], []]);
    });
  });
});
