import type { ControlsRowsHost } from '../common/graph-controls.type.ts';
import { toggleRow } from '../utils/controls-rules.util.ts';
import { isShowable } from '../utils/ghost-show.util.ts';

/** The details panel's Focus: the list's Focus toggle on `name`. */
export const focusRow = (controls: ControlsRowsHost, name: string): void => {
  const { mounted } = controls;

  if (mounted !== null) controls.focus(mounted, name);
};

/** The details panel's Exclude: unticks `name`; the focused package stays, as in the list. */
export const excludeRow = (controls: ControlsRowsHost, name: string): void => {
  const { mounted, applied } = controls;

  if (mounted !== null) controls.edit(mounted, toggleRow(applied, name, false));
};

/** The details panel's Show: re-ticks `name`, a hidden path package of the trace. */
export const showRow = (controls: ControlsRowsHost, name: string): void => {
  const { mounted, applied } = controls;

  if (mounted !== null) controls.edit(mounted, toggleRow(applied, name, true));
};

/** Whether re-ticking `name` alone would draw it again. */
export const canShowRow = (controls: ControlsRowsHost, name: string): boolean => {
  const graph = controls.mounted?.graph ?? null;

  return graph !== null && isShowable(graph.infos, graph.edges, controls.applied, name);
};
