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

const APPS_TO_UI: BundleInspection = { kind: 'bundle', source: collapsedIdOf('apps'), target: '@acme/ui' };

/** The collapsed apps folder links to `@acme/ui` through `web` and `docs`; hiding one of them leaves one row from the other. */
const WITHOUT_DOCS = ['web', '@acme/config', '@acme/ui', '@acme/utils'];

const WITHOUT_WEB = ['docs', '@acme/config', '@acme/ui', '@acme/utils'];

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

/** The bundle view of `inspection`, docs to the collapsed packages folder unless given, over `scene`. */
const bundleViewOver = (scene: FolderScene, inspection: BundleInspection = DOCS_TO_PACKAGES): BundleDetails => {
  const model = bundleModelOf(inspection.source, inspection.target, contextOf(scene));

  if (model === null) throw new Error('the fixture has a folder link between the inspected ends');

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

  describe('GIVEN the bundle view of the collapsed apps folder to @acme/ui, listing one row from docs', () => {
    it('WHEN the scene has as many rows to the same target but from web THEN the view is not kept', () => {
      const view = bundleViewOver(boardsSceneOf(['apps'], WITHOUT_WEB), APPS_TO_UI);
      const context = contextOf(boardsSceneOf(['apps'], WITHOUT_DOCS));

      expect(isSameBundleView(view, APPS_TO_UI, context)).toBe(false);
    });
  });
});
