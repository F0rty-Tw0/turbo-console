import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { LayoutNotice } from '../common/graph-layouts.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import { FALLBACK_NOTICE, LAYING_OUT_FOLDERS_TEXT, LAYING_OUT_GRAPH_TEXT, NO_NOTICE } from '../common/graph.const.ts';

type LayoutArrival = 'ignore' | 'place' | 'store';

type SwitchPlan = 'keep' | 'place' | 'layOut';

/** The layout mode of the Group by folder checkbox. */
export const groupingOf = (isGrouped: boolean): LayoutGrouping => {
  return isGrouped ? 'folders' : 'flat';
};

/** A result for a graph no longer drawn is ignored; one of the checkbox's mode is placed; one of the other mode is stored. */
export const arrivalOf = (
  resultHash: string,
  drawnHash: string | null,
  runMode: LayoutGrouping,
  mode: LayoutGrouping
): LayoutArrival => {
  if (resultHash !== drawnHash) return 'ignore';

  return runMode === mode ? 'place' : 'store';
};

/** The mode on screen is kept; another mode is placed from its snapshot, or laid out when it has none. */
export const switchPlanOf = (next: LayoutGrouping, drawnMode: LayoutGrouping, hasSnapshot: boolean): SwitchPlan => {
  if (next === drawnMode) return 'keep';

  return hasSnapshot ? 'place' : 'layOut';
};

/** The notice of a layout on screen: the simplified-layout notice only for a fallback. */
export const engineNoticeOf = (engine: LayoutEngine | null): LayoutNotice => {
  return engine === 'fallback' ? FALLBACK_NOTICE : NO_NOTICE;
};

/** The notice while the first layout of `mode` runs and the other mode stays on screen. */
export const progressNoticeOf = (mode: LayoutGrouping): LayoutNotice => {
  const text = mode === 'folders' ? LAYING_OUT_FOLDERS_TEXT : LAYING_OUT_GRAPH_TEXT;
  const notice: LayoutNotice = { kind: 'progress', text };

  return notice;
};
