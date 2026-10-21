import type { UnknownRecord } from '../common/bridge.type.ts';

/** Whether `value` is an object whose keys can be read; `null` is not, and an array is. */
export const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;
