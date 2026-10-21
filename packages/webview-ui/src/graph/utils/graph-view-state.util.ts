import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { DEFAULT_DEPTH, MAX_DEPTH, MIN_DEPTH } from '../common/graph.const.ts';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readPosition = (raw: unknown): Position | null => {
  if (!isRecord(raw)) return null;

  const { x, y } = raw;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  const position: Position = { x, y };

  return position;
};

const readBoolean = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readDepth = (value: unknown): number => {
  const isInRange = typeof value === 'number' && value >= MIN_DEPTH && value <= MAX_DEPTH;
  const isWhole = Number.isInteger(value);

  if (!isInRange || !isWhole) return DEFAULT_DEPTH;

  return value;
};

const readFocus = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const readNames = (value: unknown): string[] => {
  const isNameList = Array.isArray(value) && value.every((entry) => typeof entry === 'string');

  if (!isNameList) return [];

  return [...value];
};

/** The saved camera, selection and controls, rebuilt field by field; `null` when anything about `raw` is off. */
export const readGraphViewState = (raw: unknown): GraphViewState | null => {
  if (!isRecord(raw)) return null;

  const { hash, zoom, selected } = raw;
  const pan = readPosition(raw['pan']);
  const isSelectionValid = selected === null || typeof selected === 'string';
  const isZoomValid = isFiniteNumber(zoom) && zoom > 0;
  const isHashValid = typeof hash === 'string';
  const areFieldsValid = isHashValid && isZoomValid && isSelectionValid;

  if (!areFieldsValid || pan === null) return null;

  const state: GraphViewState = {
    hash,
    zoom,
    pan,
    selected,
    controlsOpen: readBoolean(raw['controlsOpen']),
    search: readString(raw['search']),
    depth: readDepth(raw['depth']),
    hidden: readNames(raw['hidden']),
    focus: readFocus(raw['focus']),
    tags: readNames(raw['tags'])
  };

  return state;
};
