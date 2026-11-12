import type { NodeSingular } from 'cytoscape';

import { ATOM_COUNTS_LINE_PX } from '../common/graph-atom.const.ts';
import { glyphOf } from '../utils/glyph.util.ts';

/** An umbrella is its name's height plus one chip row; its one-line name is lifted half that row to sit centred above the chips. */
export const UMBRELLA_NODE = { 'text-margin-y': -ATOM_COUNTS_LINE_PX / 2 } as const;

/** An umbrella's name over its counts text, the two lines an export draws in place of the DOM chip row. */
const umbrellaExportLabelOf = (node: NodeSingular): string => `${node.data('name')}\n${node.data('countsText')}`;

/** An umbrella's state glyph, a space, then its name over its counts text. */
export const umbrellaExportTextOf = (node: NodeSingular): string => `${glyphOf(node.classes())} ${umbrellaExportLabelOf(node)}`;

/** While exporting, an umbrella draws its name over its counts, centred on the node, since `cy.png` cannot capture the chip row. */
export const UMBRELLA_EXPORT = { label: umbrellaExportLabelOf, 'text-wrap': 'wrap', 'text-margin-y': 0 } as const;
