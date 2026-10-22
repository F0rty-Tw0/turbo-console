import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphLinkRef, GraphTraceRef, GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
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

const readControlsOpen = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

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

const readDetailsOpen = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

const readLink = (value: unknown): GraphLinkRef | null => {
  if (!isRecord(value)) return null;

  const { source, target } = value;

  if (typeof source !== 'string' || typeof target !== 'string') return null;

  const link: GraphLinkRef = { source, target };

  return link;
};

const readTrace = (value: unknown): GraphTraceRef | null => {
  if (!isRecord(value)) return null;

  const { start, end } = value;

  if (typeof start !== 'string' || typeof end !== 'string') return null;

  const trace: GraphTraceRef = { start, end };

  return trace;
};

/** The saved camera, selection, controls and inspection, rebuilt field by field; `null` when the camera or selection is off, a bad controls or inspection field takes its default. */
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
    controlsOpen: readControlsOpen(raw['controlsOpen']),
    search: readString(raw['search']),
    depth: readDepth(raw['depth']),
    hidden: readNames(raw['hidden']),
    focus: readFocus(raw['focus']),
    tags: readNames(raw['tags']),
    detailsOpen: readDetailsOpen(raw['detailsOpen']),
    link: readLink(raw['link']),
    trace: readTrace(raw['trace'])
  };

  return state;
};
