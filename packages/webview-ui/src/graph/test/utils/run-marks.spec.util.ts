import type { Core } from 'cytoscape';

import type { GraphRunState } from '../../../bridge/common/graph-state.type.ts';
import { FOLDER_NODE_CLASS } from '../../common/graph.const.ts';

const isMark = (name: string): boolean => name !== FOLDER_NODE_CLASS;

/** The classes of the element but the folder node marker, which no mark writes. */
export const classesOf = (cy: Core, id: string): string[] => cy.getElementById(id).classes().filter(isMark);

/** The package runs map holding only web in `state`. */
export const mapOf = (state: GraphRunState): Map<string, GraphRunState> => {
  const runs = new Map<string, GraphRunState>([['web', state]]);

  return runs;
};
