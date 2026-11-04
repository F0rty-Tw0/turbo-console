import { runLogFixtureBytes } from './run-log-fixture.spec.util.ts';
import type { RunLogEntry } from '../../common/run-log.type.ts';
import { runLogEventOf } from '../../utils/run-log-event.util.ts';
import { scanRunLog } from '../../utils/run-log-scan.util.ts';

/** The entry at `index` of a captured fixture, exactly as turbo wrote it. */
export const fixtureEntryOf = async (name: string, index: number): Promise<RunLogEntry> => {
  const bytes = await runLogFixtureBytes(name);
  const { entries } = scanRunLog(bytes, 0);
  const entry = entries[index];

  if (entry === undefined) throw new Error(`fixture ${name} has no entry ${index}`);

  return entry;
};

/** The sorted, distinct `<taskId> <kind>` pairs that classifying every entry of a fixture yields. */
export const fixtureEventPairs = async (name: string): Promise<string[]> => {
  const bytes = await runLogFixtureBytes(name);
  const { entries } = scanRunLog(bytes, 0);
  const events = entries.map(runLogEventOf);
  const present = events.filter((event) => event !== null);
  const pairs = present.map((event) => `${event.taskId} ${event.kind}`);
  const distinct = new Set(pairs);
  const sorted = Array.from(distinct).toSorted();

  return sorted;
};

/** A log entry of a given source and text. */
export const entryWith = (source: string, text: string): RunLogEntry => {
  const entry: RunLogEntry = { timestamp: 0, source, level: 'stdout', text };

  return entry;
};
