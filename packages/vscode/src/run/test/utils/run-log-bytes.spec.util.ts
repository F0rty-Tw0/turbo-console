const ENCODER = new TextEncoder();

const OPEN_PREFIX = '{"source":"a#b","level":"info","timestamp":1,"text":"';

export const bytesOf = (text: string): Uint8Array => ENCODER.encode(text);

export const byteLengthOf = (text: string): number => bytesOf(text).length;

/** Turbo's on-disk shape (probe P1.1): `[\n`, the first object, then `,\n` before each further one, a `\n` after each, and `]\n`. */
export const turboLogTextOf = (lines: string[]): string => {
  const [first, ...rest] = lines;
  const separatedLines = rest.map((line) => `,\n${line}\n`);
  const restText = separatedLines.join('');
  const body = first === undefined ? '' : `${first}\n${restText}`;

  return `[\n${body}]\n`;
};

export const turboLogOf = (lines: string[]): Uint8Array => {
  const text = turboLogTextOf(lines);

  return bytesOf(text);
};

/** An object still being written: `size` bytes, no closing quote or brace, no newline. */
export const openObjectOf = (size: number): string => OPEN_PREFIX.padEnd(size, 'x');

/** One compact object as turbo writes it. */
export const entryJsonOf = (source: string, text: string): string => {
  const entry = { source, level: 'info', timestamp: 1, text };

  return JSON.stringify(entry);
};

/** `count` compact objects `t0#build` … with `textSize` bytes of text each. */
export const entryLinesOf = (count: number, textSize: number): string[] => {
  const text = 'x'.repeat(textSize);
  const lineOf = (_: unknown, index: number): string => entryJsonOf(`t${index}#build`, text);

  return Array.from({ length: count }, lineOf);
};
