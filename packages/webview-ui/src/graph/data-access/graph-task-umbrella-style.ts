import { ATOM_COUNTS_LINE_PX } from '../common/graph-atom.const.ts';

/** An umbrella is its name's height plus one chip row; its one-line name is lifted half that row to sit centred above the chips. */
export const UMBRELLA_NODE = { 'text-margin-y': -ATOM_COUNTS_LINE_PX / 2 } as const;
