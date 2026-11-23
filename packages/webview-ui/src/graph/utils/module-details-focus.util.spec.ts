import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { focusKeyOf, focusTargetOf, isFocusedOf, isSelectionOf, refocusOf, twinOf } from './module-details-focus.util.ts';
import type { ImportGroupModel, ImportRowModel, ImportsViewModel } from '../common/details-imports.type.ts';
import type { ImportsDetails } from '../common/details-view.type.ts';
import type {
  ModuleDetailsElements,
  ModuleDetailsFocusKey,
  ModuleDetailsList,
  ModuleDetailsView
} from '../common/module-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { moduleDetailsViewsMock } from '../test/mocks/module-panel-views.mock.ts';
import {
  B_LINE_4_ROW_STUB,
  FILE_A_VIEW_STUB,
  IMPORTED_BY_MODEL_STUB,
  LINK_A_B_VIEW_STUB,
  STUB_X_VIEW_STUB
} from '../test/stubs/module-details.stub.ts';

const rowAt = (index: number): ImportRowModel => {
  const row: ImportRowModel = { ...B_LINE_4_ROW_STUB, key: `src/b.ts:${index}`, line: index };

  return row;
};

const MANY_ROWS: ImportRowModel[] = Array.from({ length: 22 }, (_, index) => rowAt(index));

const MANY_GROUP: ImportGroupModel = { file: 'src/b.ts', rows: MANY_ROWS };

const MANY_IMPORTED_BY: ImportsViewModel = { ...IMPORTED_BY_MODEL_STUB, groups: [MANY_GROUP], more: null };

/** `@s/x` with its Imported by fold open: 22 rows, so row 20 is the first past the fold. */
const STUB_X_OPEN: ModuleDetailsView = { kind: 'stub', id: 'pkg:@s/x', name: '@s/x', importedBy: MANY_IMPORTED_BY };

const ROW_KEY: ModuleDetailsFocusKey = { part: 'row', list: 'imports', site: 'src/b.ts:4' };

const GONE_ROW_KEY: ModuleDetailsFocusKey = { part: 'row', list: 'imports', site: 'src/z.ts:1' };

const MORE_KEY: ModuleDetailsFocusKey = { part: 'more', list: 'importedBy', site: null };

const FOCUS_KEY: ModuleDetailsFocusKey = { part: 'focus', list: null, site: null };

const HEADING_KEY: ModuleDetailsFocusKey = { part: 'heading', list: null, site: null };

const blockOf = (elements: ModuleDetailsElements, list: ModuleDetailsList): ImportsDetails => {
  const block = elements.blocks.find((each) => each.list === list);

  if (block === undefined) throw new Error(`no ${list} block`);

  return block.details;
};

describe('FEATURE: module Details focus', () => {
  let build: (view: ModuleDetailsView) => ModuleDetailsElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());

    const { views } = moduleDetailsViewsMock();

    build = (view: ModuleDetailsView): ModuleDetailsElements => views.view(view, false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN the src/a.ts file view', () => {
    let elements: ModuleDetailsElements;

    beforeEach(() => {
      elements = build(FILE_A_VIEW_STUB);
    });

    it('WHEN focus sits outside it THEN it has no focus key', () => {
      const outside = document.createElement('button');

      expect(focusKeyOf(elements, outside)).toBeNull();
    });

    it('WHEN focus sits on the src/b.ts line 4 row THEN the key names that row of Imports', () => {
      const [row] = blockOf(elements, 'imports').rows;

      expect(focusKeyOf(elements, row?.button ?? null)).toStrictEqual(ROW_KEY);
    });

    it('WHEN focus sits on Show more of Imported by THEN the key is more of importedBy', () => {
      expect(focusKeyOf(elements, blockOf(elements, 'importedBy').more)).toStrictEqual(MORE_KEY);
    });

    it('WHEN focus sits on Scan again of Imports THEN the key is scan of imports', () => {
      const key: ModuleDetailsFocusKey = { part: 'scan', list: 'imports', site: null };

      expect(focusKeyOf(elements, blockOf(elements, 'imports').scanAgain)).toStrictEqual(key);
    });

    it('WHEN focus sits on Focus or the heading THEN the key is focus or heading', () => {
      expect([focusKeyOf(elements, elements.focus), focusKeyOf(elements, elements.heading)]).toStrictEqual([FOCUS_KEY, HEADING_KEY]);
    });

    it('WHEN a row key that no longer exists is matched THEN Scan again of that list is the twin', () => {
      expect(twinOf(elements, GONE_ROW_KEY)).toBe(blockOf(elements, 'imports').scanAgain);
    });

    it('WHEN the same row key is matched THEN that row is the twin', () => {
      const [row] = blockOf(elements, 'imports').rows;

      expect(twinOf(elements, ROW_KEY)).toBe(row?.button);
    });

    it('WHEN the more key is matched without rows past the fold THEN Scan again of Imported by is the twin', () => {
      expect(twinOf(elements, MORE_KEY)).toBe(blockOf(elements, 'importedBy').scanAgain);
    });

    it('WHEN its target is read THEN it is file:src/a.ts, focused only while the focus is file:src/a.ts', () => {
      expect([
        focusTargetOf(FILE_A_VIEW_STUB),
        isFocusedOf(FILE_A_VIEW_STUB, 'file:src/a.ts'),
        isFocusedOf(FILE_A_VIEW_STUB, null)
      ]).toStrictEqual(['file:src/a.ts', true, false]);
    });
  });

  describe('GIVEN a stub view with its Imported by fold open', () => {
    it('WHEN the more key is matched THEN the first row past the fold is the twin', () => {
      const elements = build(STUB_X_OPEN);

      expect(twinOf(elements, MORE_KEY)).toBe(blockOf(elements, 'importedBy').rows[20]?.button);
    });

    it('WHEN an Imports row key is matched THEN Focus is the twin, since the stub has no Imports', () => {
      const elements = build(STUB_X_VIEW_STUB);

      expect(twinOf(elements, ROW_KEY)).toBe(elements.focus);
    });

    it('WHEN its target is read THEN it is pkg:@s/x', () => {
      expect(focusTargetOf(STUB_X_VIEW_STUB)).toBe('pkg:@s/x');
    });
  });

  describe('GIVEN the link view, which has no Focus', () => {
    let elements: ModuleDetailsElements;

    beforeEach(() => {
      elements = build(LINK_A_B_VIEW_STUB);
    });

    it('WHEN the focus key is matched THEN the heading is the twin', () => {
      expect(twinOf(elements, FOCUS_KEY)).toBe(elements.heading);
    });

    it('WHEN an Imported by key is matched THEN the heading is the twin, since the link has no Imported by', () => {
      expect(twinOf(elements, MORE_KEY)).toBe(elements.heading);
    });

    it('WHEN its target is read THEN it has none and is never focused', () => {
      expect([focusTargetOf(LINK_A_B_VIEW_STUB), isFocusedOf(LINK_A_B_VIEW_STUB, null)]).toStrictEqual([null, false]);
    });
  });

  describe('GIVEN the empty view', () => {
    it('WHEN any key is matched THEN its hint, the heading, is the twin', () => {
      const elements = build({ kind: 'empty' });

      expect([twinOf(elements, ROW_KEY), twinOf(elements, HEADING_KEY)]).toStrictEqual([elements.heading, elements.heading]);
    });

    it('WHEN Clear selection hides THEN the hint takes focus, else focus outside the old view stays', () => {
      const elements = build({ kind: 'empty' });

      expect([refocusOf(elements, null, true), refocusOf(elements, null, false)]).toStrictEqual([elements.heading, null]);
    });

    it('WHEN it or the loading view is read THEN neither is a selection, while a file view is', () => {
      const loading: ModuleDetailsView = { kind: 'loading', packageName: 'web' };

      expect([isSelectionOf({ kind: 'empty' }), isSelectionOf(loading), isSelectionOf(FILE_A_VIEW_STUB)]).toStrictEqual([
        false,
        false,
        true
      ]);
    });
  });
});
