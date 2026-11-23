import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildModuleDetailsPanel, buildModuleDetailsView } from './module-details-elements.ts';
import type { ImportGroupModel, ImportRowModel, ImportsViewModel } from '../common/details-imports.type.ts';
import type { ModuleDetailsElements, ModuleDetailsView } from '../common/module-details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import {
  B_LINE_4_ROW_STUB,
  FILE_A_VIEW_STUB,
  IMPORTS_MODEL_STUB,
  LINK_A_B_VIEW_STUB,
  STUB_X_VIEW_STUB
} from '../test/stubs/module-details.stub.ts';
import { selfAndBelowOf, textsWith } from '../test/utils/class-elements.spec.util.ts';

const IMG_TEXT = '<img src=x onerror=alert(1)>';

const IMG_ROW: ImportRowModel = { ...B_LINE_4_ROW_STUB, text: IMG_TEXT };

const IMG_GROUP: ImportGroupModel = { file: 'src/b.ts', rows: [IMG_ROW] };

const IMG_IMPORTS: ImportsViewModel = { ...IMPORTS_MODEL_STUB, groups: [IMG_GROUP] };

const IMG_LINK_VIEW: ModuleDetailsView = { kind: 'link', title: 'src/a.ts → src/b.ts', imports: IMG_IMPORTS };

const listsOf = (elements: ModuleDetailsElements): string[] => elements.blocks.map((block) => block.list);

const focusTextOf = (elements: ModuleDetailsElements): (string | null)[] => {
  const { focus } = elements;

  if (focus === null) return [];

  return textsWith(focus, 'button-label');
};

describe('FEATURE: module Details views', () => {
  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN an empty document', () => {
    it('WHEN the panel is built THEN it is a hidden aside#graph-module-details holding an empty div.details-content', () => {
      const { panel, content } = buildModuleDetailsPanel();

      expect([panel.tagName, panel.id, panel.className, panel.hidden, panel.getAttribute('aria-label')]).toStrictEqual([
        'ASIDE',
        'graph-module-details',
        'graph-details graph-module-details',
        true,
        'Details'
      ]);
      expect([Array.from(panel.children), content.className, content.children.length]).toStrictEqual([
        [content],
        'details-content',
        0
      ]);
    });

    it('WHEN the empty view is built THEN it reads the empty hint and has no block and no Focus', () => {
      const elements = buildModuleDetailsView({ kind: 'empty' }, false);

      expect([textsWith(elements.root, 'details-lead'), elements.focus, elements.blocks]).toStrictEqual([
        ['Select a file, package or link to see its imports.'],
        null,
        []
      ]);
    });

    it('WHEN the empty view is built THEN its hint is the heading, which focus can land on (tabIndex -1)', () => {
      const elements = buildModuleDetailsView({ kind: 'empty' }, false);

      expect([elements.heading.className, elements.heading.tabIndex]).toStrictEqual(['details-lead', -1]);
    });

    it('WHEN the loading view of web is built THEN it reads "Scanning web…"', () => {
      const elements = buildModuleDetailsView({ kind: 'loading', packageName: 'web' }, false);

      expect([elements.root.dataset['view'], textsWith(elements.root, 'details-lead')]).toStrictEqual(['loading', ['Scanning web…']]);
    });

    it('WHEN a file view is built unfocused THEN its heading, a Focus button and the Imports then Imported by blocks show, in that order', () => {
      const elements = buildModuleDetailsView(FILE_A_VIEW_STUB, false);
      const blockRoots = elements.blocks.map((block) => block.details.root);
      const [, ...belowTitle] = Array.from(elements.root.children);

      expect([elements.root.dataset['view'], elements.heading.textContent, elements.heading.tabIndex]).toStrictEqual([
        'file',
        'src/a.ts',
        -1
      ]);
      expect([focusTextOf(elements), listsOf(elements)]).toStrictEqual([['Focus'], ['imports', 'importedBy']]);
      expect(belowTitle).toStrictEqual([elements.focus, ...blockRoots]);
    });

    it('WHEN a file view is built focused THEN the button reads Clear focus', () => {
      const elements = buildModuleDetailsView(FILE_A_VIEW_STUB, true);

      expect(focusTextOf(elements)).toStrictEqual(['Clear focus']);
    });

    it('WHEN a stub view is built THEN it has Focus and only the importedBy block', () => {
      const elements = buildModuleDetailsView(STUB_X_VIEW_STUB, false);

      expect([elements.heading.textContent, focusTextOf(elements), listsOf(elements)]).toStrictEqual([
        '@s/x',
        ['Focus'],
        ['importedBy']
      ]);
    });

    it('WHEN a link view is built THEN its heading is the title, there is no Focus, and its one block is listed as imports', () => {
      const elements = buildModuleDetailsView(LINK_A_B_VIEW_STUB, true);

      expect([elements.heading.textContent, elements.focus, listsOf(elements)]).toStrictEqual([
        'src/a.ts → src/b.ts',
        null,
        ['imports']
      ]);
    });

    it('WHEN a site text holds <img> THEN the row text reads it literally and no img element exists', () => {
      const elements = buildModuleDetailsView(IMG_LINK_VIEW, false);
      const tags = selfAndBelowOf(elements.root).map((element) => element.tagName);

      expect(textsWith(elements.root, 'import-text')).toStrictEqual([IMG_TEXT]);
      expect(tags).not.toContain('IMG');
    });
  });
});
