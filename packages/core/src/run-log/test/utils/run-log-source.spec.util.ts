import { RUN_LOG_OBJECT_MAX } from '../../common/run-log.const.ts';
import type { RunLogEntry } from '../../common/run-log.type.ts';
import { RUN_LOG_ENTRY_STUB } from '../stubs/run-log-entry.stub.ts';

export const runLogBytes = (text: string): Uint8Array => new TextEncoder().encode(text);

export const runLogEntryOf = (timestamp: number, text = `line ${timestamp}`): RunLogEntry => {
  const entry: RunLogEntry = { ...RUN_LOG_ENTRY_STUB, timestamp, text };

  return entry;
};

/** A log entry of a given source and text. */
export const runLogEntryWith = (source: string, text: string): RunLogEntry => {
  const entry: RunLogEntry = { ...RUN_LOG_ENTRY_STUB, source, text };

  return entry;
};

/** The JSON of a valid entry that is exactly `size` bytes long. */
export const entryJsonOfSize = (size: number): string => {
  const emptyJson = JSON.stringify(runLogEntryOf(1, ''));
  const emptySize = runLogBytes(emptyJson).length;
  const text = 'x'.repeat(size - emptySize);
  const json = JSON.stringify(runLogEntryOf(1, text));

  return json;
};

/** The JSON of a valid entry that is exactly `RUN_LOG_OBJECT_MAX + 1` bytes long. */
export const oversizeEntryJson = (): string => entryJsonOfSize(RUN_LOG_OBJECT_MAX + 1);

/** The number of elements of the whole-file JSON array, or -1 when the bytes are valid JSON but not an array; throws on bytes that are not JSON. */
export const jsonElementCount = (bytes: Uint8Array): number => {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  const isArray = Array.isArray(parsed);

  return isArray ? parsed.length : -1;
};
