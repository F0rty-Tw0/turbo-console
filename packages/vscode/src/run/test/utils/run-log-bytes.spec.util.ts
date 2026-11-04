const ENCODER = new TextEncoder();

const OPEN_PREFIX = '{"source":"a#b","level":"info","timestamp":1,"text":"';

/** One compact object, as turbo writes it. */
export const entryJsonOf = (source: string, text: string, timestamp = 1): string =>
  JSON.stringify({ source, level: 'info', timestamp, text });

export const bytesOf = (text: string): Uint8Array => ENCODER.encode(text);

/** Turbo's on-disk shape (probe P1.1): `[\n`, the first object, then `,\n` before each further one, a `\n` after each, and `]\n`. */
export const turboLogOf = (lines: string[]): Uint8Array => {
  const [first, ...rest] = lines;
  const restText = rest.map((line) => `,\n${line}\n`).join('');
  const body = first === undefined ? '' : `${first}\n${restText}`;
  const text = `[\n${body}]\n`;

  return bytesOf(text);
};

/** An object still being written: `size` bytes, no closing quote or brace, no newline. */
export const openObjectOf = (size: number): string => OPEN_PREFIX.padEnd(size, 'x');
