import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { taskAnchorOf } from './task-anchor.util.ts';
import { ellipsisSlotOf } from './widget-geometry.util.ts';
import type { MenuTarget, RectPx } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { rectOf } from '../test/utils/rect.spec.util.ts';

const AT_BUILD: RectPx = rectOf(156, 22, 180, 46);

const BUILD_TARGET: MenuTarget = { kind: 'package', name: 'a#build' };

const FOLDER_TARGET: MenuTarget = { kind: 'folder', folder: 'libs' };

describe('FEATURE: taskAnchorOf', () => {
  let opener: HTMLButtonElement;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    opener = document.createElement('button');
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the toolbar of a#build placed at a rect', () => {
    it('WHEN the target is a#build THEN the anchor is its "…" slot and opener', () => {
      const anchor = taskAnchorOf('a#build', opener, AT_BUILD, BUILD_TARGET);

      expect(anchor).toStrictEqual({ rect: ellipsisSlotOf(AT_BUILD), opener });
    });

    it('WHEN the target is another task THEN there is no anchor', () => {
      const anchor = taskAnchorOf('a#build', opener, AT_BUILD, { kind: 'package', name: 'api#build' });

      expect(anchor).toBeNull();
    });

    it('WHEN the target is a folder THEN there is no anchor', () => {
      const anchor = taskAnchorOf('a#build', opener, AT_BUILD, FOLDER_TARGET);

      expect(anchor).toBeNull();
    });
  });

  describe('GIVEN the toolbar of a#build hidden', () => {
    it('WHEN the target is a#build THEN there is no anchor', () => {
      const anchor = taskAnchorOf('a#build', opener, null, BUILD_TARGET);

      expect(anchor).toBeNull();
    });
  });

  describe('GIVEN a#build placed but with no "…" to open from', () => {
    it('WHEN the target is a#build THEN there is no anchor', () => {
      const anchor = taskAnchorOf('a#build', null, AT_BUILD, BUILD_TARGET);

      expect(anchor).toBeNull();
    });
  });
});
