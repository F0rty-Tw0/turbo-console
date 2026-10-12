import { plainLines } from './plain-text.util.ts';

/** Caps the scan and the message: a single huge line, or a 256 MB stderr on the exit path, never lands whole. */
const MAX_TAIL_LENGTH = 8192;

/**
 * True when the 8 Ki cut split a line: something was cut off and no line starts at the cut. A line starts after LF,
 * or after a lone CR; a CR whose LF is past the cut split a CRLF, so the tail starts with an empty partial line.
 */
const isCutMidLine = (stderr: string): boolean => {
  const cutAt = stderr.length - MAX_TAIL_LENGTH;
  const beforeCut = stderr[cutAt - 1];
  const isLoneCr = beforeCut === '\r' && stderr[cutAt] !== '\n';
  const startsLine = beforeCut === '\n' || isLoneCr;

  return cutAt > 0 && !startsLine;
};

/**
 * The last `lines` lines of the last 8 Ki characters of `stderr`, CRLF and lone CR as LF, made plain by `plainLines`,
 * trailing whitespace dropped (`''` for empty stderr or `lines <= 0`). When the cut lands mid-line, that partial line
 * is dropped, unless it is the only one.
 */
export const stderrTail = (stderr: string, lines: number): string => {
  if (lines <= 0) return '';

  const recent = stderr.slice(-MAX_TAIL_LENGTH);
  const crlfAsLf = recent.replaceAll('\r\n', '\n');
  const unixLines = crlfAsLf.replaceAll('\r', '\n');
  const normalised = plainLines(unixLines).trimEnd();

  if (normalised === '') return '';

  const all = normalised.split('\n');
  const afterCut = all.slice(1);
  const cutMidLine = isCutMidLine(stderr);
  const isPartial = cutMidLine && afterCut.length > 0;
  const whole = isPartial ? afterCut : all;

  return whole.slice(-lines).join('\n');
};
