import { plainLines } from './plain-text.util.ts';

/** Caps the scan and the message: a single huge line, or a 256 MB stderr on the exit path, never lands whole. */
const MAX_TAIL_LENGTH = 8192;

/**
 * The last `lines` lines of the last 8 Ki characters of `stderr`, CRLF and lone CR as LF, made plain by `plainLines`,
 * trailing whitespace dropped (`''` for empty stderr). When the cut lands mid-line, that partial line is dropped,
 * unless it is the only one.
 */
export const stderrTail = (stderr: string, lines: number): string => {
  const recent = stderr.slice(-MAX_TAIL_LENGTH);
  const crlfAsLf = recent.replaceAll('\r\n', '\n');
  const unixLines = crlfAsLf.replaceAll('\r', '\n');
  const normalised = plainLines(unixLines).trimEnd();

  if (normalised === '') return '';

  const all = normalised.split('\n');
  const afterCut = all.slice(1);
  const isPartial = recent.length < stderr.length && afterCut.length > 0;
  const whole = isPartial ? afterCut : all;

  return whole.slice(-lines).join('\n');
};
