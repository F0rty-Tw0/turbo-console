import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isSameBundleView } from './graph-details-bundle.ts';
import type { BundleDetails } from '../common/details-view.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { DetailsContext } from '../common/graph-details.type.ts';
import type { BundleInspection } from '../common/inspection.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { detailsViewsMock } from '../test/mocks/graph-package-side.mock.ts';
import { BOARDS_DRAWN, BOARDS_NAMES, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { bundleModelOf } from '../utils/details-model.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const PACKAGES_ID = collapsedIdOf('packages');

const DOCS_TO_PACKAGES: BundleInspection = { kind: 'bundle', source: 'docs', target: PACKAGES_ID };

/** Packages `@acme/ui` and `@acme/utils` are the two docs depends on; hiding one leaves one package link. */
const WITHOUT_UI = ['docs', 'web', '@acme/config', '@acme/utils'];

const WITHOUT_UTILS = ['docs', 'web', '@acme/config', '@acme/ui'];

const contextOf = (scene: FolderScene): DetailsContext => {
  const context: DetailsContext = {
    drawn: BOARDS_DRAWN,
    visible: new Set(BOARDS_NAMES),
    focus: null,
    showable: new Set(),
    isRebuild: false,
    scene,
    focusedFolder: null
  };

  return context;
};

/** The bundle view of docs to the collapsed packages folder over `scene`. */
const bundleViewOver = (scene: FolderScene): BundleDetails => {
  const model = bundleModelOf('docs', PACKAGES_ID, contextOf(scene));

  if (model === null) throw new Error('the fixture has a docs link to the packages folder');

  return detailsViewsMock().bundle(model, false);
};

describe('FEATURE: isSameBundleView', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the bundle view of docs to the collapsed packages folder', () => {
    it('WHEN the scene lists the same package links THEN the view is kept', () => {
      const view = bundleViewOver(boardsSceneOf(['packages']));
      const context = contextOf(boardsSceneOf(['packages']));

      expect(isSameBundleView(view, DOCS_TO_PACKAGES, context)).toBe(true);
    });

    it('WHEN @acme/ui is hidden, which leaves one package link, THEN the view is not kept', () => {
      const view = bundleViewOver(boardsSceneOf(['packages']));
      const context = contextOf(boardsSceneOf(['packages'], WITHOUT_UI));

      expect(isSameBundleView(view, DOCS_TO_PACKAGES, context)).toBe(false);
    });

    it('WHEN the folder is expanded, so the link is gone, THEN the view is not kept', () => {
      const view = bundleViewOver(boardsSceneOf(['packages']));
      const context = contextOf(boardsSceneOf([]));

      expect(isSameBundleView(view, DOCS_TO_PACKAGES, context)).toBe(false);
    });

    it('WHEN the scene has as many package links but another target THEN the view is not kept', () => {
      const view = bundleViewOver(boardsSceneOf(['packages'], WITHOUT_UI));
      const context = contextOf(boardsSceneOf(['packages'], WITHOUT_UTILS));

      expect(isSameBundleView(view, DOCS_TO_PACKAGES, context)).toBe(false);
    });

    it('WHEN the shown view is the Empty view THEN it is not kept', () => {
      const empty = detailsViewsMock().empty(false);
      const context = contextOf(boardsSceneOf(['packages']));

      expect(isSameBundleView(empty, DOCS_TO_PACKAGES, context)).toBe(false);
    });
  });
});
