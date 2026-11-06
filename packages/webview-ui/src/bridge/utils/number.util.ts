import { MANIFEST_LINE_MAX } from '../common/graph-message.const.ts';

/** Whether `value` is a safe whole number of at least 0; the narrowing the message shape checks share. */
export const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Whether `value` is a count that fits a line of a manifest or source file (at most `MANIFEST_LINE_MAX`). */
export const isManifestLine = (value: unknown): value is number => isCount(value) && value <= MANIFEST_LINE_MAX;
