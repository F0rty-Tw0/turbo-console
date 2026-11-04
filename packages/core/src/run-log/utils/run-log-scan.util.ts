import { runLogEntrySchema } from '../../shared/turbo/common/run-log.schema.ts';
import { RUN_LOG_OBJECT_MAX, RUN_LOG_PROBE } from '../common/run-log.const.ts';
import type { RunLogEntry, RunLogScan } from '../common/run-log.type.ts';

const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;
const QUOTE = 0x22;
const BACKSLASH = 0x5c;

const DECODER = new TextDecoder();

const stringEndOf = (bytes: Uint8Array, quote: number): number => {
  let index = quote + 1;

  while (index < bytes.length) {
    const byte = bytes[index];

    if (byte === BACKSLASH) {
      index += 2;
      continue;
    }

    index += 1;

    if (byte === QUOTE) return index;
  }

  return -1;
};

const objectEndOf = (bytes: Uint8Array, start: number): number => {
  let depth = 0;
  let index = start;

  while (index < bytes.length) {
    const byte = bytes[index];

    if (byte === QUOTE) {
      index = stringEndOf(bytes, index);

      if (index === -1) return -1;

      continue;
    }

    if (byte === OPEN_BRACE) depth += 1;

    if (byte === CLOSE_BRACE) depth -= 1;

    index += 1;

    if (depth === 0) return index;
  }

  return -1;
};

const jsonOf = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const entryOf = (bytes: Uint8Array, start: number, end: number): RunLogEntry | null => {
  const isOversize = end - start > RUN_LOG_OBJECT_MAX;

  if (isOversize) return null;

  const objectBytes = bytes.subarray(start, end);
  const text = DECODER.decode(objectBytes);
  const json = jsonOf(text);
  const parsed = runLogEntrySchema.safeParse(json);

  return parsed.success ? parsed.data : null;
};

/**
 * Reads every complete `{…}` object of `bytes` from index `from`, ignoring the `[`, `,` and `]` between them.
 * `next` is the index to resume from: the `{` of the first incomplete object, else the byte after the last
 * complete object, else `from`. The caller keeps `bytes.subarray(next)`, appends the next read and scans from 0.
 * `leadingInvalid` counts per call, so it describes the head of a file only for a scan from offset 0.
 */
export const scanRunLog = (bytes: Uint8Array, from: number): RunLogScan => {
  const entries: RunLogEntry[] = [];
  let invalid = 0;
  let leadingInvalid = 0;
  let next = from;
  let start = bytes.indexOf(OPEN_BRACE, from);

  while (start !== -1) {
    const end = objectEndOf(bytes, start);

    if (end === -1) {
      next = start;
      break;
    }

    const entry = entryOf(bytes, start, end);
    const isLeadingInvalid = entry === null && entries.length === 0;

    if (entry !== null) entries.push(entry);

    if (entry === null) invalid += 1;

    if (isLeadingInvalid) leadingInvalid += 1;

    next = end;
    start = bytes.indexOf(OPEN_BRACE, end);
  }

  const scan: RunLogScan = { entries, next, invalid, leadingInvalid };

  return scan;
};

export const isUnknownRunLog = (leadingInvalid: number): boolean => leadingInvalid >= RUN_LOG_PROBE;
