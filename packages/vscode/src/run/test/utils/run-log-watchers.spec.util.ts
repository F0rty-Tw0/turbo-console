import type { RunLogWatcher } from '../../common/run-log-tail.type.ts';
import type { FakeWatcherRecord, FakeWatchers } from '../common/run-log-fs.type.ts';

export const fakeWatchers = (): FakeWatchers => {
  const watchers: FakeWatcherRecord[] = [];

  const watch: FakeWatchers['watch'] = (dir, onChange, onError) => {
    const record: FakeWatcherRecord = { dir, closed: false, onChange, onError };
    const watcher: RunLogWatcher = {
      close: (): void => {
        record.closed = true;
      }
    };

    watchers.push(record);

    return watcher;
  };

  const openWatchersOf = (dir: string): FakeWatcherRecord[] => watchers.filter((record) => record.dir === dir && !record.closed);

  const emit = (dir: string, fileName: string | null): void => {
    for (const record of openWatchersOf(dir)) record.onChange(fileName);
  };

  const fail = (dir: string, error: unknown): void => {
    for (const record of openWatchersOf(dir)) record.onError(error);
  };

  const fake: FakeWatchers = { watchers, watch, emit, fail };

  return fake;
};
