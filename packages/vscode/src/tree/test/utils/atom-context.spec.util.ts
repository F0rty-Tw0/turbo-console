import { rowContextOf } from './row-context.spec.util.ts';
import type { RunLookup } from '../../../run/common/run.type.ts';
import type { AtomView } from '../../common/atom-view.type.ts';
import { NO_ATOMS } from '../../common/atom.const.ts';
import type { RowContext } from '../../common/tree-node.type.ts';

/** A list-mode context whose package `e2e` reads `view`; every other package reads no Atomizer groups. */
export const atomContextOf = (view: AtomView, runs?: RunLookup): RowContext => {
  const base = rowContextOf('list', runs);
  const context: RowContext = {
    ...base,
    atoms: (_root, packageName) => (packageName === 'e2e' ? view : NO_ATOMS)
  };

  return context;
};
