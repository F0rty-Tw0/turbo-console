import type { Core } from 'cytoscape';

import { FOLDER_NODE_CLASS } from '../../common/graph.const.ts';

const isMark = (name: string): boolean => name !== FOLDER_NODE_CLASS;

/** The classes of the element but the folder node marker, which no mark writes. */
export const classesOf = (cy: Core, id: string): string[] => cy.getElementById(id).classes().filter(isMark);
