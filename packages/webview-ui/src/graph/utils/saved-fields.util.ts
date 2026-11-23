import type { Position } from '../../bridge/common/graph-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import { DEFAULT_DEPTH, MAX_DEPTH, MIN_DEPTH } from '../common/graph.const.ts';

export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readPosition = (raw: unknown): Position | null => {
  if (!isRecord(raw)) return null;

  const { x, y } = raw;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  const position: Position = { x, y };

  return position;
};

export const readCamera = (zoom: unknown, rawPan: unknown): Viewport | null => {
  const pan = readPosition(rawPan);
  const isZoomValid = isFiniteNumber(zoom) && zoom > 0;

  if (!isZoomValid || pan === null) return null;

  const camera: Viewport = { zoom, pan };

  return camera;
};

export const isNameList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

export const depthWithin = (value: unknown, min: number, max: number): number | null => {
  const isInRange = typeof value === 'number' && value >= min && value <= max;
  const isWhole = Number.isInteger(value);

  if (!isInRange || !isWhole) return null;

  return value;
};

export const readDepth = (value: unknown): number => depthWithin(value, MIN_DEPTH, MAX_DEPTH) ?? DEFAULT_DEPTH;
