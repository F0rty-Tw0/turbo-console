import type { Readable } from 'node:stream';

/** Enough for the 20-line tail a failure message shows, without holding a chatty turbo's whole output. */
const MAX_TAIL_LENGTH = 64 * 1024;

/**
 * Keeps the last 64 Ki characters `stream` emits (execFile decodes child output as utf8, so ~64 KiB for turbo's
 * ASCII output) and returns a reader for them; a null stream reads as ''. A second `data` listener: execFile's own
 * buffering is untouched.
 */
export const collectTail = (stream: Readable | null): (() => string) => {
  let collected = '';

  const onData = (chunk: string): void => {
    const joined = collected + chunk;

    collected = joined.slice(-MAX_TAIL_LENGTH);
  };

  stream?.on('data', onData);

  const read = (): string => collected;

  return read;
};
