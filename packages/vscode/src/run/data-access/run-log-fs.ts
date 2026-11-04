import { watch } from 'node:fs';
import { open, readdir, rm, stat } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';

import type { RunLogPorts, RunLogRead, RunLogWatcher } from '../common/run-log-tail.type.ts';

const NO_WATCHER: RunLogWatcher = { close: () => undefined };

/** One stat sizes the buffer to the bytes that exist, so a tail read of 3 bytes allocates 3 bytes, not the window. */
const readFrom = async (handle: FileHandle, from: number, max: number): Promise<Uint8Array> => {
  const { size } = await handle.stat();

  if (size <= from) return new Uint8Array(0);

  const length = Math.min(max, size - from);
  const buffer = Buffer.allocUnsafe(length);
  const { bytesRead } = await handle.read(buffer, 0, length, from);

  return buffer.subarray(0, bytesRead);
};

const readOpen = async (path: string, from: number, max: number): Promise<Uint8Array> => {
  const handle = await open(path, 'r');

  try {
    return await readFrom(handle, from, max);
  } finally {
    await handle.close();
  }
};

/** Any error reads as `null`: the drain retries, and a file that never reads ends as `missing`, logged there. */
const read: RunLogRead = async (path, from, max) => {
  try {
    return await readOpen(path, from, max);
  } catch {
    return null;
  }
};

const remove = async (path: string): Promise<void> => {
  await rm(path, { force: true });
};

/** A folder that cannot be listed holds no file the sweep could remove. */
const list = async (dir: string): Promise<string[]> => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

const modifiedAt = async (path: string): Promise<number | null> => {
  try {
    const stats = await stat(path);

    return stats.mtimeMs;
  } catch {
    return null;
  }
};

const watchDir: RunLogPorts['watch'] = (dir, onChange, onError) => {
  const onEvent = (_event: string, name: string | null): void => {
    onChange(name);
  };

  try {
    const watcher = watch(dir, { persistent: false }, onEvent);
    const closable: RunLogWatcher = {
      close: () => {
        watcher.close();
      }
    };

    watcher.on('error', onError);

    return closable;
  } catch (error) {
    onError(error);

    return NO_WATCHER;
  }
};

/** The log tails' file effects over `node:fs`; `log` takes one Output line (U7e1 passes `output.warn`). */
export const editorRunLogPorts = (log: (line: string) => void): RunLogPorts => {
  const ports: RunLogPorts = { watch: watchDir, read, remove, list, modifiedAt, now: () => Date.now(), log };

  return ports;
};
