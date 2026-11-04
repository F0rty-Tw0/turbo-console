import { bytesOf, turboLogOf } from './run-log-bytes.spec.util.ts';
import { folderCallsOf } from './run-log-folder.spec.util.ts';
import { fakeWatchers } from './run-log-watchers.spec.util.ts';
import type { RunLogPorts, RunLogRead } from '../../common/run-log-tail.type.ts';
import type { FakeLogFs, RunLogReadRecord } from '../common/run-log-fs.type.ts';

const EMPTY_LOG = turboLogOf([]);

const TRAILER_SIZE = 2;

const FIRST_LINE_AT = 2;

const concatOf = (head: Uint8Array, tail: Uint8Array): Uint8Array => {
  const joined = new Uint8Array(head.length + tail.length);

  joined.set(head);
  joined.set(tail, head.length);

  return joined;
};

/** The bytes after turbo rewrote the `]\n` at the end of `existing` to hold `line`. */
const appendedOf = (existing: Uint8Array, line: string): Uint8Array => {
  const kept = existing.subarray(0, existing.length - TRAILER_SIZE);
  const separator = kept.length === FIRST_LINE_AT ? '' : ',\n';
  const added = bytesOf(`${separator}${line}\n]\n`);

  return concatOf(kept, added);
};

/** The sum of the bytes the reads returned. */
export const bytesReadOf = (reads: RunLogReadRecord[]): number => {
  let total = 0;

  for (const read of reads) total += read.length;

  return total;
};

export const fakeLogFs = (): FakeLogFs => {
  const files = new Map<string, Uint8Array>();
  const reads: RunLogReadRecord[] = [];
  const { watchers, watch, emit, fail, failNextWatch } = fakeWatchers();
  const { removed, logs, remove, log } = folderCallsOf(files);
  let gate: Promise<undefined> | null = null;

  const read: RunLogRead = async (path, from, max) => {
    const file = files.get(path);
    const bytes = file?.subarray(from, from + max) ?? null;
    const length = bytes?.length ?? 0;

    reads.push({ from, length });

    await gate;

    return bytes;
  };

  const write = (path: string, lines: string[]): void => {
    files.set(path, turboLogOf(lines));
  };

  const append = (path: string, line: string): void => {
    const existing = files.get(path) ?? EMPTY_LOG;

    files.set(path, appendedOf(existing, line));
  };

  const hold = (): (() => void) => {
    const { promise, resolve } = Promise.withResolvers<undefined>();

    gate = promise;

    return (): void => {
      gate = null;
      resolve(undefined);
    };
  };

  const ports: RunLogPorts = { watch, read, remove, log };

  const fs: FakeLogFs = {
    read,
    files,
    reads,
    write,
    append,
    hold,
    watchers,
    emit,
    fail,
    failNextWatch,
    removed,
    logs,
    ports
  };

  return fs;
};
