import { endOf } from './module-end.util.ts';
import { moduleSitesModelOf } from './module-sites-model.util.ts';
import { moduleIdLabelOf } from './module-text.util.ts';
import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';
import { MODULE_IMPORTED_BY_HEADING, MODULE_IMPORTS_HEADING } from '../common/graph-module.const.ts';
import type { ModuleDetailsView, ModuleSitesState } from '../common/module-details.type.ts';
import type { ModuleFolds } from '../common/module-selection.type.ts';

/**
 * What Details shows for `sel` with its lookup in `state`: a file's two lists, a stub's importers, or a link's lines under
 * its `<source> → <target>` title, each folded unless `folds` opens it. A folder card is never a selection (spec C4), so a
 * `dir:` node reads as the empty view.
 */
export const detailsViewOf = (sel: ModuleSelection, state: ModuleSitesState, folds: ModuleFolds): ModuleDetailsView => {
  if (sel.kind === 'link') {
    const title = `${moduleIdLabelOf(sel.source)} → ${moduleIdLabelOf(sel.target)}`;
    const lines = moduleSitesModelOf(state, 'link', MODULE_IMPORTS_HEADING, folds.imports);
    const linkView: ModuleDetailsView = { kind: 'link', title, imports: lines };

    return linkView;
  }

  const { id } = sel;
  const end = endOf(id);
  const importedBy = moduleSitesModelOf(state, 'importedBy', MODULE_IMPORTED_BY_HEADING, folds.importedBy);

  if (end.kind === 'stub') {
    const stubView: ModuleDetailsView = { kind: 'stub', id, name: end.name, importedBy };

    return stubView;
  }

  if (end.kind === 'dir') {
    const emptyView: ModuleDetailsView = { kind: 'empty' };

    return emptyView;
  }

  const imports = moduleSitesModelOf(state, 'imports', MODULE_IMPORTS_HEADING, folds.imports);
  const fileView: ModuleDetailsView = { kind: 'file', id, path: end.path, imports, importedBy };

  return fileView;
};
