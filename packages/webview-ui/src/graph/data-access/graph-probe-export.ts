import type { Core } from 'cytoscape';

import { styleText } from './graph-probe-state.ts';
import { EXPORTING_CLASS } from '../common/graph.const.ts';

/** The label `id` draws while an export is on (`EXPORTING_CLASS`), read as the export does; the class is removed either way. */
export const exportLabelOf = (cy: Core, id: string): string => {
  const node = cy.getElementById(id);

  node.addClass(EXPORTING_CLASS);

  try {
    return styleText(node, 'label');
  } finally {
    node.removeClass(EXPORTING_CLASS);
  }
};
