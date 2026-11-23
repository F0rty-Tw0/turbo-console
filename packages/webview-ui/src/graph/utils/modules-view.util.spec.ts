import { describe, expect, it } from 'vitest';

import { freshModulesViewOf } from './fresh-view-state.util.ts';
import { defaultExpandedOf } from './module-expand.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import { enteredModulesViewOf, shownModulesViewOf } from './modules-view.util.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

const FRESH_WEB: ModulesViewState = freshModulesViewOf('web');

const WEB_SRC_OPEN: ModulesViewState = { ...FRESH_WEB, expanded: ['src'] };

const DEFAULT_EXPANDED: string[] = defaultExpandedOf(moduleTreeOf(MODULES_FOUND_STUB.files));

describe('FEATURE: modules views to enter and show', () => {
  describe('GIVEN a web view saved with src expanded', () => {
    it('WHEN web is entered THEN the saved view is kept', () => {
      expect(enteredModulesViewOf(WEB_SRC_OPEN, 'web')).toBe(WEB_SRC_OPEN);
    });

    it('WHEN ui is entered THEN a fresh ui view is used', () => {
      expect(enteredModulesViewOf(WEB_SRC_OPEN, 'ui')).toStrictEqual(freshModulesViewOf('ui'));
    });

    it('WHEN web is found THEN the saved expansion is kept', () => {
      expect(shownModulesViewOf(WEB_SRC_OPEN, 'web', MODULES_FOUND_STUB)).toStrictEqual(WEB_SRC_OPEN);
    });
  });

  describe('GIVEN no saved view', () => {
    it('WHEN web is entered THEN a fresh web view is used', () => {
      expect(enteredModulesViewOf(null, 'web')).toStrictEqual(FRESH_WEB);
    });

    it('WHEN web is found THEN a fresh web view gets the default expansion', () => {
      expect(shownModulesViewOf(null, 'web', MODULES_FOUND_STUB)).toStrictEqual({ ...FRESH_WEB, expanded: DEFAULT_EXPANDED });
    });
  });
});
