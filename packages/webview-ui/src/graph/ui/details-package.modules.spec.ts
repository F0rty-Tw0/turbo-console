import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { packageView } from './details-package.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { graphIconConstMock } from '../test/mocks/graph-icon-const.mock.ts';
import { SWAPPED_ACTION_ICONS_STUB as SWAPPED } from '../test/stubs/action-icons.stub.ts';
import { WEB_PACKAGE_STUB } from '../test/stubs/package-view.stub.ts';
import { faceOf } from '../test/utils/button-face.spec.util.ts';

describe('FEATURE: packageView Show modules', () => {
  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the package web with no tasks', () => {
    it('WHEN built THEN Show modules is shown and draws the list-tree icon before its label', () => {
      const view = packageView({ ...WEB_PACKAGE_STUB, taskCount: 0 }, false);

      expect([view.showModules.hidden, faceOf(view.showModules)]).toStrictEqual([false, ['codicon codicon-list-tree', 'Show modules']]);
    });
  });

  describe('GIVEN the action icons swapped', () => {
    beforeEach((): void => {
      vi.resetModules();
      vi.doMock('../common/graph-icon.const.ts', (): object => graphIconConstMock(SWAPPED));
    });

    afterEach((): void => {
      vi.doUnmock('../common/graph-icon.const.ts');
      vi.resetModules();
    });

    it('WHEN built THEN Show modules draws the swapped icon, so it reads ACTION_ICONS', async () => {
      const swapped = await import('./details-package.ts');
      const view = swapped.packageView(WEB_PACKAGE_STUB, false);

      expect(faceOf(view.showModules)[0]).toBe(`codicon codicon-${SWAPPED.showModules}`);
    });
  });
});
