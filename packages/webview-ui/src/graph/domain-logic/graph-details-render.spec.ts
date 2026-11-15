import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hadFocusOf, updateView } from './graph-details-render.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { PackageDetails } from '../common/details-view.type.ts';
import type { DetailsContext, ShownInspection } from '../common/graph-details.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { detailsViewsMock } from '../test/mocks/graph-package-side.mock.ts';
import { WEB_PACKAGE_STUB } from '../test/stubs/package-view.stub.ts';

const NOTHING: ShownInspection = { kind: 'none' };

const CORE: ShownInspection = { kind: 'package', name: 'core' };

const WEB_SHOWN: ShownInspection = { kind: 'package', name: 'web' };

const WEB: GraphPackage = { name: 'web', bareName: 'w', path: 'packages/web', tags: [], taskCount: 5 };

const CONTEXT: Omit<DetailsContext, 'drawn'> = {
  visible: new Set(['web']),
  focus: null,
  showable: new Set(),
  isRebuild: false,
  scene: null,
  focusedFolder: null
};

describe('FEATURE: graph details render', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an aside holding Clear selection and the content', () => {
    let aside: HTMLElement;
    let content: HTMLElement;
    let clear: HTMLButtonElement;

    beforeEach(() => {
      aside = document.createElement('aside');
      content = document.createElement('div');
      clear = document.createElement('button');
      aside.append(clear, content);
    });

    describe('GIVEN focus on a button in the content', () => {
      it('WHEN core is shown THEN the view takes focus', () => {
        const button = document.createElement('button');

        content.append(button);
        button.focus();

        expect(hadFocusOf(content, clear, CORE)).toBe(true);
      });
    });

    describe('GIVEN focus on Clear selection', () => {
      it('WHEN core is shown THEN Clear keeps focus', () => {
        clear.focus();

        expect(hadFocusOf(content, clear, CORE)).toBe(false);
      });

      it('WHEN nothing is shown THEN the Empty view takes focus', () => {
        clear.focus();

        expect(hadFocusOf(content, clear, NOTHING)).toBe(true);
      });
    });

    describe('GIVEN focus outside the aside', () => {
      it('WHEN nothing is shown THEN focus stays put', () => {
        const search = document.createElement('input');

        search.focus();

        expect(hadFocusOf(content, clear, NOTHING)).toBe(false);
      });
    });
  });

  describe('GIVEN the web card built with the heading web', () => {
    describe('WHEN updated with web labelled w', () => {
      let view: PackageDetails;
      let isUpdated: boolean;

      beforeEach(() => {
        const labels = new Map([['web', 'w']]);
        const drawn: DrawnGraph = { hash: 'h', packages: ['web'], infos: [WEB], edges: [], scopeShown: false, labels };
        const context: DetailsContext = { ...CONTEXT, drawn };

        const views = detailsViewsMock();

        view = views.package(WEB_PACKAGE_STUB, false);
        isUpdated = updateView(view, WEB_SHOWN, context, { views, hasTasks: (): boolean => false });
      });

      it('THEN the card is updated, not rebuilt', () => {
        expect(isUpdated).toBe(true);
      });

      it('THEN its heading reads w', () => {
        expect(view.heading.textContent).toBe('w');
      });
    });
  });
});
