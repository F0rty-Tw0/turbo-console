import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { relayoutOf } from './graph-module-wire-parts.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleInputMode } from '../common/module-mode.type.ts';
import { freshModulesViewOf } from '../utils/fresh-view-state.util.ts';

const WEB_VIEW: ModulesViewState = freshModulesViewOf('web');

describe('FEATURE: relayoutOf', () => {
  let view: Mock<ModuleInputMode['view']>;
  let update: Mock<ModuleInputMode['update']>;

  beforeEach((): void => {
    view = vi.fn<ModuleInputMode['view']>(() => WEB_VIEW);
    update = vi.fn<ModuleInputMode['update']>();
  });

  describe('GIVEN a modules view saved', () => {
    it('WHEN Re-layout or Retry is asked THEN the view is drawn again by a forced relayout redraw', () => {
      relayoutOf({ view, update });

      expect(update.mock.calls).toStrictEqual([[WEB_VIEW, { kind: 'relayout' }]]);
    });
  });

  describe('GIVEN no modules view saved', () => {
    it('WHEN Re-layout or Retry is asked THEN nothing is drawn', () => {
      view.mockReturnValue(null);

      relayoutOf({ view, update });

      expect(update).not.toHaveBeenCalled();
    });
  });
});
