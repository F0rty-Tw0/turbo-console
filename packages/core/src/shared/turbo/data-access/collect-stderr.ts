import type { ChildProcess } from 'node:child_process';

/** Enough for the 20-line tail a failure message shows, without holding a chatty turbo's whole stderr. */
const MAX_STDERR_LENGTH = 64 * 1024;

/**
 * Keeps the last 64 Ki characters `child` writes to stderr (execFile decodes it as utf8, so ~64 KiB for turbo's
 * ASCII output) and returns a reader for them. A second `data` listener: execFile's own buffering is untouched.
 */
export const collectStderr = (child: ChildProcess): (() => string) => {
  let collected = '';

  const onData = (chunk: string): void => {
    const joined = collected + chunk;

    collected = joined.slice(-MAX_STDERR_LENGTH);
  };

  child.stderr?.on('data', onData);

  const read = (): string => collected;

  return read;
};
