import { describe, expect, it } from 'vitest';

import { detailsViewOf } from './module-details-view.util.ts';
import { moduleSitesModelOf } from './module-sites-model.util.ts';
import type { ModuleSite, ModuleSitesFound } from '../../bridge/common/graph-module-sites.type.ts';
import { IMPORTS_FOLD_AT } from '../common/details-imports.const.ts';
import { MODULE_IMPORTED_BY_HEADING, MODULE_IMPORTS_HEADING } from '../common/graph-module.const.ts';
import type { ModuleDetailsView, ModuleSitesState } from '../common/module-details.type.ts';
import type { ModuleFolds } from '../common/module-selection.type.ts';
import { MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { link, node } from '../test/utils/module-selections.spec.util.ts';

const CLOSED: ModuleFolds = { imports: false, importedBy: false };

const IMPORTS_OPEN: ModuleFolds = { imports: true, importedBy: false };

const SITE_TARGET: ModuleSite['target'] = { kind: 'file', path: 'src/c.ts' };

const siteAt = (line: number): ModuleSite => {
  const site: ModuleSite = {
    file: 'src/lib/b.ts',
    line,
    text: "import { c } from '../c.ts';",
    kind: 'static',
    isType: false,
    target: SITE_TARGET
  };

  return site;
};

const PAST_FOLD: ModuleSite[] = Array.from({ length: IMPORTS_FOLD_AT + 1 }, (_blank, line): ModuleSite => siteAt(line));

const MANY_IMPORTS: ModuleSitesFound = { ...MODULE_SITES_FOUND_STUB, imports: PAST_FOLD, importsTotal: PAST_FOLD.length };

const FOUND: ModuleSitesState = { kind: 'found', result: MANY_IMPORTS };

const SCANNING: ModuleSitesState = { kind: 'scanning', previous: null };

const moreOf = (view: ModuleDetailsView): string | null => (view.kind === 'file' ? view.imports.more : null);

describe('FEATURE: detailsViewOf', () => {
  describe('GIVEN a found answer with imports past the fold, both folds closed', () => {
    it('WHEN b.ts is shown THEN it is the file view of src/lib/b.ts with both lists modelled', () => {
      expect(detailsViewOf(node('file:src/lib/b.ts'), FOUND, CLOSED)).toStrictEqual({
        kind: 'file',
        id: 'file:src/lib/b.ts',
        path: 'src/lib/b.ts',
        imports: moduleSitesModelOf(FOUND, 'imports', MODULE_IMPORTS_HEADING, false),
        importedBy: moduleSitesModelOf(FOUND, 'importedBy', MODULE_IMPORTED_BY_HEADING, false)
      });
    });

    it('WHEN the stub @s/x is shown THEN it is the stub view of @s/x with its importers', () => {
      expect(detailsViewOf(node('pkg:@s/x'), FOUND, CLOSED)).toStrictEqual({
        kind: 'stub',
        id: 'pkg:@s/x',
        name: '@s/x',
        importedBy: moduleSitesModelOf(FOUND, 'importedBy', MODULE_IMPORTED_BY_HEADING, false)
      });
    });

    it('WHEN the link file:src/a.ts → dir:src/lib is shown THEN it is the link view titled src/a.ts → src/lib/', () => {
      expect(detailsViewOf(link('file:src/a.ts', 'dir:src/lib'), FOUND, CLOSED)).toStrictEqual({
        kind: 'link',
        title: 'src/a.ts → src/lib/',
        imports: moduleSitesModelOf(FOUND, 'link', MODULE_IMPORTS_HEADING, false)
      });
    });

    it('WHEN b.ts is shown THEN its imports offer Show more', () => {
      expect(moreOf(detailsViewOf(node('file:src/lib/b.ts'), FOUND, CLOSED))).not.toBeNull();
    });

    it('WHEN a folder node is shown THEN it is the empty view', () => {
      expect(detailsViewOf(node('dir:src/lib'), FOUND, CLOSED)).toStrictEqual({ kind: 'empty' });
    });
  });

  describe('GIVEN a found answer with imports past the fold, the imports fold open', () => {
    it('WHEN b.ts is shown THEN its imports offer no Show more', () => {
      expect(moreOf(detailsViewOf(node('file:src/lib/b.ts'), FOUND, IMPORTS_OPEN))).toBeNull();
    });
  });

  describe('GIVEN a first lookup still scanning', () => {
    it('WHEN b.ts is shown THEN both lists read scanning', () => {
      const view = detailsViewOf(node('file:src/lib/b.ts'), SCANNING, CLOSED);

      expect(view.kind === 'file' && [view.imports.isScanning, view.importedBy.isScanning]).toStrictEqual([true, true]);
    });
  });
});
