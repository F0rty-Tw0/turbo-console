import type { ProbeEdge } from '../../../src/graph/common/graph-probe.type.ts';

type DrawnStyle = Pick<ProbeEdge, 'curveStyle' | 'zCompoundDepth'>;

/** A drawn line's `curve-style` and `z-compound-depth`, as one string to compare with `PLAIN_LINE`. */
export const drawnStyleOf = (edge: DrawnStyle): string => `${edge.curveStyle} ${edge.zCompoundDepth}`;

export const isDrawn = (edge: Pick<ProbeEdge, 'isDrawn'>): boolean => edge.isDrawn;
