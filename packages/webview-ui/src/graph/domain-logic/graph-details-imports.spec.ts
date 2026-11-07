import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportsBlock } from './graph-details-imports.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { IMPORTS_STATUS_DELAY_MS } from '../common/details-imports.const.ts';
import type { ImportRowElements, ImportsDetails, LinkDetails } from '../common/details-view.type.ts';
import type { DetailsViews, LinkViewModel } from '../common/details.type.ts';
import type { GraphDetailsDeps } from '../common/graph-details.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';
import type { LinkInspection } from '../common/inspection.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { detailsViewsMock } from '../test/mocks/graph-package-side.mock.ts';
import { selfAndBelowOf, withClass } from '../test/utils/class-elements.spec.util.ts';
import { stubElementClass } from '../test/utils/graph-package-side.spec.util.ts';
import { foundOf, sitesOf } from '../test/utils/import-sites.spec.util.ts';
import { lastReturnOf } from '../test/utils/spy-return.spec.util.ts';

const WEB_TO_UI_MODEL: LinkViewModel = { source: 'web', target: 'ui', file: 'apps/web/package.json' };

const UI_TO_CORE_MODEL: LinkViewModel = { source: 'ui', target: 'core', file: 'packages/ui/package.json' };

const WEB_TO_UI: LinkInspection = { kind: 'link', source: 'web', target: 'ui' };

const UI_TO_CORE: LinkInspection = { kind: 'link', source: 'ui', target: 'core' };

const LINK: GraphEdge = { source: 'web', target: 'ui' };

const SCANNING: ImportsState = { kind: 'scanning' };

const FAILED: ImportsState = { kind: 'failed' };

const FOUND = foundOf(sitesOf(3));

const FOUND_STALE = foundOf(sitesOf(3), { isRefreshing: true });

const FOUND_TWO = foundOf(sitesOf(2));

const SITES_SHIFTED = sitesOf(1, 'src/0.ts').concat(sitesOf(3));

const FOUND_SHIFTED = foundOf(SITES_SHIFTED);

const MANY = foundOf(sitesOf(25));

const CLICKED_PARTS = [
  { label: 'button', partOf: (row: ImportRowElements): unknown => row.button },
  { label: 'line number', partOf: (row: ImportRowElements): unknown => row.button.children[0] }
];

const isClickable = (node: unknown): node is HTMLElement => node instanceof Element && 'click' in node;

describe('FEATURE: ImportsBlock', () => {
  let views: DetailsViews;
  let imports: Mock<DetailsViews['imports']>;
  let onOpenImport: Mock<GraphDetailsDeps['onOpenImport']>;
  let onRescan: Mock<(link: GraphEdge) => void>;
  let block: ImportsBlock;
  let view: LinkDetails;

  const shown = (): ImportsDetails => lastReturnOf(imports);

  const rowAt = (index: number): ImportRowElements => {
    const row = shown().rows[index];

    if (row === undefined) throw new Error(`no row ${index} drawn`);

    return row;
  };

  const statusOf = (slot: HTMLElement): Element | null => slot.querySelector('[role="status"]');

  const remounted = (model: LinkViewModel, inspection: LinkInspection): void => {
    view = views.link(model, false);
    block.mounted(view, inspection);
  };

  beforeEach((): void => {
    vi.useFakeTimers();
    vi.stubGlobal('document', fakeDocumentMock());
    stubElementClass();
    views = detailsViewsMock();
    imports = vi.spyOn(views, 'imports');
    onOpenImport = vi.fn();
    onRescan = vi.fn();
    block = new ImportsBlock({ views, onOpenImport }, onRescan);
    remounted(WEB_TO_UI_MODEL, WEB_TO_UI);
  });

  afterEach((): void => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('GIVEN a link view with the scanning state drawn', () => {
    beforeEach((): void => {
      block.drawn(SCANNING, LINK);
    });

    it('THEN the slot holds one imports block', () => {
      expect(withClass(view.imports, 'details-imports-block')).toStrictEqual([shown().root]);
    });

    it('THEN Scan again is aria-disabled', () => {
      expect(shown().scanAgain.getAttribute('aria-disabled')).toBe('true');
    });

    it('WHEN Scan again is clicked THEN no scan is asked', () => {
      shown().scanAgain.click();

      expect(onRescan).not.toHaveBeenCalled();
    });

    it('THEN the new status line is still empty', () => {
      expect(statusOf(view.imports)?.textContent).toBe('');
    });

    it('WHEN the status delay passes THEN the status line reads Scanning for imports', () => {
      vi.advanceTimersByTime(IMPORTS_STATUS_DELAY_MS);

      expect(statusOf(view.imports)?.textContent).toBe('Scanning for imports');
    });

    it('WHEN three found sites are drawn and then the status delay passes THEN the status line reads the found count', () => {
      block.drawn(FOUND, LINK);
      vi.advanceTimersByTime(IMPORTS_STATUS_DELAY_MS);

      expect(statusOf(view.imports)?.textContent).toBe('3 imports found');
    });

    it('WHEN another link is mounted and the status delay passes THEN its status line stays empty until it is drawn', () => {
      remounted(UI_TO_CORE_MODEL, UI_TO_CORE);
      vi.advanceTimersByTime(IMPORTS_STATUS_DELAY_MS);

      expect(statusOf(view.imports)?.textContent).toBe('');
    });
  });

  describe('GIVEN a link view mounted and then a view that is not a link', () => {
    it('WHEN a found state is drawn THEN no block is built and the link slot stays empty of blocks', () => {
      const linkSlot = view.imports;

      block.mounted(views.empty(false), { kind: 'none' });
      block.drawn(FOUND, LINK);

      expect(imports).not.toHaveBeenCalled();
      expect(withClass(linkSlot, 'details-imports-block')).toStrictEqual([]);
    });
  });

  describe('GIVEN a link view with three found sites drawn and the status delay passed', () => {
    beforeEach((): void => {
      block.drawn(FOUND, LINK);
      vi.advanceTimersByTime(IMPORTS_STATUS_DELAY_MS);
    });

    it('WHEN Scan again is clicked THEN a scan of web to ui is asked', () => {
      shown().scanAgain.click();

      expect(onRescan).toHaveBeenCalledExactlyOnceWith(LINK);
    });

    it.each(CLICKED_PARTS)('WHEN the $label of row 2 is clicked THEN src/a.ts of web is opened at 0-based line 1', ({ partOf }) => {
      const part = partOf(rowAt(1));

      if (!isClickable(part)) throw new Error('the row part is not a clickable element');

      part.click();

      expect(onOpenImport).toHaveBeenCalledExactlyOnceWith('web', 'src/a.ts', 1);
    });

    describe('WHEN the heading is clicked', () => {
      beforeEach((): void => {
        const heading = selfAndBelowOf(shown().root).find((element) => element.tagName === 'H3');

        if (!isClickable(heading)) throw new Error('no heading drawn');

        heading.click();
      });

      it('THEN no import is opened', () => {
        expect(onOpenImport).not.toHaveBeenCalled();
      });

      it('THEN no scan is asked', () => {
        expect(onRescan).not.toHaveBeenCalled();
      });
    });

    it('WHEN focus is on Scan again and a stale state is drawn THEN the new Scan again has focus', () => {
      shown().scanAgain.focus();
      block.drawn(FOUND_STALE, LINK);

      expect(document.activeElement).toBe(shown().scanAgain);
    });

    it('WHEN focus is on row src/a.ts:2 and sites with one more in front are drawn THEN the new row src/a.ts:2 has focus', () => {
      rowAt(2).button.focus();
      block.drawn(FOUND_SHIFTED, LINK);

      expect(document.activeElement).toBe(rowAt(3).button);
    });

    it('WHEN focus is on row src/a.ts:2 and sites without it are drawn THEN Scan again has focus', () => {
      rowAt(2).button.focus();
      block.drawn(FOUND_TWO, LINK);

      expect(document.activeElement).toBe(shown().scanAgain);
    });

    it('WHEN focus is outside the slot and the state is drawn again THEN focus stays outside', () => {
      const outside = document.createElement('button');

      outside.focus();
      block.drawn(FOUND, LINK);

      expect(document.activeElement).toBe(outside);
    });

    it('THEN the status line reads the count without the heading', () => {
      expect(statusOf(view.imports)?.textContent).toBe('3 imports found');
    });

    it('WHEN a failed state is drawn THEN the status line includes the failed word', () => {
      block.drawn(FAILED, LINK);

      expect(statusOf(view.imports)?.textContent).toContain("Couldn't scan");
    });

    it('WHEN the state is drawn again THEN the slot holds only the status line and the new block', () => {
      const status = statusOf(view.imports);

      block.drawn(FOUND, LINK);

      expect(Array.from(view.imports.children)).toStrictEqual([status, shown().root]);
    });

    it('WHEN the state is drawn again THEN the status line text is not written', () => {
      const status = statusOf(view.imports);
      const written = vi.fn();
      const text = status?.textContent;

      Object.defineProperty(status, 'textContent', { get: (): unknown => text, set: written });
      block.drawn(FOUND, LINK);

      expect(written).not.toHaveBeenCalled();
    });

    it('WHEN the state is drawn again THEN the status line is the same element', () => {
      const before = statusOf(view.imports);

      block.drawn(FOUND, LINK);

      expect(statusOf(view.imports)).toBe(before);
    });
  });

  describe('GIVEN a link view with 25 found sites drawn and Show more clicked while focus is outside the block', () => {
    beforeEach((): void => {
      block.drawn(MANY, LINK);
      shown().more?.click();
    });

    it('THEN all 25 rows are drawn', () => {
      expect(shown().rows).toHaveLength(25);
    });

    it('THEN row 21 has focus', () => {
      expect(document.activeElement).toBe(rowAt(20).button);
    });

    it('THEN there is no Show more', () => {
      expect(shown().more).toBeNull();
    });

    it('WHEN a reply is drawn for a new link object of the same ends THEN all 25 rows stay', () => {
      block.drawn(MANY, { source: 'web', target: 'ui' });

      expect(shown().rows).toHaveLength(25);
    });

    it('WHEN the same link is rebuilt and drawn THEN all 25 rows stay', () => {
      remounted(WEB_TO_UI_MODEL, WEB_TO_UI);
      block.drawn(MANY, LINK);

      expect(shown().rows).toHaveLength(25);
    });

    it('WHEN another link is mounted, then this link again, and drawn THEN the fold is back at 20 rows', () => {
      remounted(UI_TO_CORE_MODEL, UI_TO_CORE);
      remounted(WEB_TO_UI_MODEL, WEB_TO_UI);
      block.drawn(MANY, LINK);

      expect(shown().rows).toHaveLength(20);
    });
  });

  describe('GIVEN a link view with 25 found sites drawn and Show more focused', () => {
    beforeEach((): void => {
      block.drawn(MANY, LINK);
      shown().more?.focus();
    });

    it('WHEN the state is drawn again THEN Scan again has focus', () => {
      block.drawn(MANY, LINK);

      expect(document.activeElement).toBe(shown().scanAgain);
    });

    it('WHEN Show more is clicked THEN focus moves once, to row 21', () => {
      const focused: unknown[] = [];

      view.imports.addEventListener('focusin', (event): void => {
        focused.push(event.target);
      });
      shown().more?.click();

      expect(focused).toStrictEqual([rowAt(20).button]);
    });
  });
});
