import { RUN_LOG_OBJECT_MAX } from '../../common/run-log.const.ts';
import type { RunLogEntry } from '../../common/run-log.type.ts';
import { RUN_LOG_ENTRY_STUB } from '../stubs/run-log-entry.stub.ts';

export const runLogBytes = (text: string): Uint8Array => new TextEncoder().encode(text);

export const runLogEntryOf = (timestamp: number, text = `line ${timestamp}`): RunLogEntry => {
  const entry: RunLogEntry = { ...RUN_LOG_ENTRY_STUB, timestamp, text };

  return entry;
};

/** The JSON of a valid entry that is exactly `RUN_LOG_OBJECT_MAX + 1` bytes long. */
export const oversizeEntryJson = (): string => {
  const emptyJson = JSON.stringify(runLogEntryOf(1, ''));
  const emptySize = runLogBytes(emptyJson).length;
  const text = 'x'.repeat(RUN_LOG_OBJECT_MAX + 1 - emptySize);
  const json = JSON.stringify(runLogEntryOf(1, text));

  return json;
};

/** The number of elements of the whole-file JSON array, or -1 when the bytes are not one JSON array. */
export const jsonElementCount = (bytes: Uint8Array): number => {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

  return Array.isArray(parsed) ? parsed.length : -1;
};
