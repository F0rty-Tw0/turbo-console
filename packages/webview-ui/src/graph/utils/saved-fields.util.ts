import type { Position } from '../../bridge/common/graph-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import type { Viewport } from '../common/graph-page.type.ts';

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
