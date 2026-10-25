import type { Timings } from '../../../shared/common/api.type.ts';
import type { Span } from '../../../shared/common/span.type.ts';

const OPEN_SPAN: Span = { start: 0, end: null };

export const TIMINGS_STUB: Timings = {
  activation: OPEN_SPAN,
  activationResume: OPEN_SPAN,
  treeVisible: new Map(),
  runs: []
};
