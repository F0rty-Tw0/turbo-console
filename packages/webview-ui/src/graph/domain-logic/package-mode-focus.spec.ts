import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageModeFocus } from './package-mode-focus.ts';
import type { LayoutScreen } from '../common/graph-layouts.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { packageSideDepsMock } from '../test/mocks/graph-package-side.mock.ts';
import { stubPackageSideGlobals } from '../test/utils/graph-package-side.spec.util.ts';

describe('FEATURE: PackageModeFocus', () => {
  let page: PageElements;
  let doc: Pick<Document, 'activeElement'>;
  let screen: LayoutScreen;
  let focus: PackageModeFocus;
  let shown: LayoutScreen;

  /** The loading screen dropped focus: the next `document` has no focused element. */
  const dropFocus = (): void => {
    vi.stubGlobal('document', fakeDocumentMock());
  };

  beforeEach(() => {
    stubPackageSideGlobals();
    doc = document;
    page = packageSideDepsMock().page;
    screen = { showLoading: vi.fn(), showGraph: vi.fn(), showNotice: vi.fn() };
    focus = new PackageModeFocus(page);
    shown = focus.screenOf(screen);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN Tasks has focus and focus is kept', () => {
    beforeEach(() => {
      page.taskMode.focus();
      focus.keep();
    });

    describe('WHEN focus is lost and the graph shows', () => {
      beforeEach(() => {
        dropFocus();
        shown.showGraph(false);
      });

      it('THEN Packages has focus', () => {
        expect(doc.activeElement).toBe(page.packagesMode);
      });

      it('THEN the screen showed the graph', () => {
        expect(screen.showGraph).toHaveBeenCalledWith(false);
      });

      it('WHEN focus is lost again and the graph shows again THEN focus is not given back', () => {
        page.details.focus();
        dropFocus();
        shown.showGraph(false);

        expect(doc.activeElement).toBe(page.details);
      });
    });

    it('WHEN focus moved to the details and the graph shows THEN the details keep focus', () => {
      page.details.focus();
      shown.showGraph(true);

      expect(doc.activeElement).toBe(page.details);
    });
  });

  describe('GIVEN the details have focus and focus is kept', () => {
    beforeEach(() => {
      page.details.focus();
      focus.keep();
    });

    it('WHEN focus is lost and the graph shows THEN the details keep focus', () => {
      dropFocus();
      shown.showGraph(false);

      expect(doc.activeElement).toBe(page.details);
    });
  });
});
