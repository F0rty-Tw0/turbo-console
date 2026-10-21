import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readPosition = (raw: unknown): Position | null => {
  if (!isRecord(raw)) return null;

  const { x, y } = raw;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  const position: Position = { x, y };

  return position;
};

/** The saved camera and selection, rebuilt field by field; `null` when anything about `raw` is off. */
export const readGraphViewState = (raw: unknown): GraphViewState | null => {
  if (!isRecord(raw)) return null;

  const { hash, zoom, selected } = raw;
  const pan = readPosition(raw['pan']);
  const isSelectionValid = selected === null || typeof selected === 'string';
  const isZoomValid = isFiniteNumber(zoom) && zoom > 0;

  const isHashValid = typeof hash === 'string';

  const areFieldsValid = isHashValid && isZoomValid && isSelectionValid;

  if (!areFieldsValid || pan === null) return null;

  const state: GraphViewState = { hash, zoom, pan, selected };

  return state;
};
