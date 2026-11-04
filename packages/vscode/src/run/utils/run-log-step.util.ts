import { isUnknownRunLog, scanRunLog } from '@turbo-console/core';
import type { RunLogEntry, RunLogScan } from '@turbo-console/core';

import type { RunLogCursor, RunLogStep } from '../common/run-log-tail.type.ts';

const NEWLINE = 0x0a;
const OPEN_BRACE = 0x7b;

type Probe = Pick<RunLogCursor, 'leadingInvalid' | 'hasEntry'>;

type Move = Pick<RunLogCursor, 'offset' | 'skipping'>;

type Walk = {
  readonly entries: RunLogEntry[];
  readonly next: number;
  readonly leadingInvalid: number;
  readonly hasEntry: boolean;
};

/** The index after the first newline of a skipped window, `0` when no line is being skipped, `-1` while the broken line goes on. */
const skippedStartOf = (bytes: Uint8Array, isSkipping: boolean): number => {
  if (!isSkipping) return 0;

  const newline = bytes.indexOf(NEWLINE);

  if (newline === -1) return -1;

  return newline + 1;
};

/**
 * The index after the newline that ends a broken object at `next`, else `-1`. Broken = a newline and then a `{` follow
 * it (a later line began; compact objects hold no raw newline). A newline with no `{` after it is turbo's stale byte
 * over `[\n]\n`.
 */
const brokenEndOf = (bytes: Uint8Array, next: number): number => {
  if (bytes[next] !== OPEN_BRACE) return -1;

  const newline = bytes.indexOf(NEWLINE, next);

  if (newline === -1) return -1;

  const laterLine = bytes.indexOf(OPEN_BRACE, newline);

  if (laterLine === -1) return -1;

  return newline + 1;
};

/** The bytes one scan reads: the whole window, or in line mode only up to the newline that ends the line at `from`. */
const viewOf = (bytes: Uint8Array, from: number, isLineMode: boolean): Uint8Array => {
  if (!isLineMode) return bytes;

  const newline = bytes.indexOf(NEWLINE, from);

  if (newline === -1) return bytes;

  return bytes.subarray(0, newline + 1);
};

/**
 * Where the walk scans next: after a broken line, after a line-mode line with no open object, else `-1` (done). An open
 * object that is not broken ends the walk: no `{` follows it in the window, so no later line holds an object.
 */
const nextFromOf = (bytes: Uint8Array, view: Uint8Array, next: number, brokenEnd: number): number => {
  if (brokenEnd !== -1) return brokenEnd;

  const isLineDone = view.length < bytes.length && bytes[next] !== OPEN_BRACE;

  if (isLineDone) return view.length;

  return -1;
};

/** The D4 probe after one scan: until the first valid entry, its invalid objects and a broken one add to `leadingInvalid`. */
const probedOf = (probe: Probe, scan: RunLogScan, isBroken: boolean): Probe => {
  if (probe.hasEntry) return probe;

  const hasEntry = scan.entries.length > 0;
  const brokenCount = isBroken && !hasEntry ? 1 : 0;
  const leadingInvalid = probe.leadingInvalid + scan.leadingInvalid + brokenCount;
  const probed: Probe = { leadingInvalid, hasEntry };

  return probed;
};

/**
 * Scans the window from `start`, resuming after each broken line. After the first break it scans one line at a time:
 * rescanning the rest of the window per broken line is quadratic. So after a break a multi-line (pretty-printed) object
 * counts as broken lines; turbo writes compact objects. Moving `next` past a broken line is a guard: the scan of the
 * later line moves it on anyway, unless that scan stops before the `{`. A line with no object leaves `next` in place, so a `]` turbo rewrites is re-read.
 */
const walkOf = (bytes: Uint8Array, start: number, cursor: RunLogCursor): Walk => {
  const entries: RunLogEntry[] = [];
  let probe: Probe = { leadingInvalid: cursor.leadingInvalid, hasEntry: cursor.hasEntry };
  let next = start;
  let from = start;
  let isLineMode = false;

  while (from !== -1) {
    const view = viewOf(bytes, from, isLineMode);
    const scan = scanRunLog(view, from);
    const brokenEnd = brokenEndOf(bytes, scan.next);
    const isBroken = brokenEnd !== -1;
    const hasObject = scan.next !== from || bytes[from] === OPEN_BRACE;

    for (const entry of scan.entries) entries.push(entry);

    probe = probedOf(probe, scan, isBroken);

    if (hasObject) next = scan.next;

    if (isBroken) next = brokenEnd;

    isLineMode = isLineMode || isBroken;
    from = nextFromOf(bytes, view, scan.next, brokenEnd);
  }

  const walk: Walk = { ...probe, entries, next };

  return walk;
};

/**
 * How far a full window whose walk moved no cursor is passed. An open object at 0 that a newline ends (no `{` follows
 * it in the window, or the walk would have broken there) is passed to that newline; one that runs past the window is
 * passed and skipped. A window with no `{` is passed whole.
 */
const stuckMoveOf = (bytes: Uint8Array, isOversize: boolean): Move => {
  const passed: Move = { offset: bytes.length, skipping: isOversize };

  if (!isOversize) return passed;

  const newline = bytes.indexOf(NEWLINE);

  if (newline === -1) return passed;

  const ended: Move = { offset: newline + 1, skipping: false };

  return ended;
};

const stepOfWalk = (walk: Walk, moved: Move): RunLogStep => {
  const isUnknown = isUnknownRunLog(walk.leadingInvalid);
  const cursor: RunLogCursor = { ...moved, leadingInvalid: walk.leadingInvalid, hasEntry: walk.hasEntry };
  const known: RunLogStep = { cursor, entries: walk.entries, isUnknown };

  if (!isUnknown) return known;

  const unknown: RunLogStep = { cursor, entries: [], isUnknown };

  return unknown;
};

/**
 * One read of `bytes` from `cursor.offset`, stepped (spec D4, D5); `isFull` = the read returned `RUN_LOG_READ_MAX` bytes.
 * The cursor stops on the first incomplete object, so turbo's in-place rewrite of the closing `]` is re-read. A broken
 * line counts invalid once and the walk resumes after its newline. A full window that moves no cursor is passed: an
 * open object at 0 counts invalid once and is passed to its newline, or past the window and skipped until one; a
 * window with no `{` is passed whole. A skipped window with no newline is passed whole.
 */
export const runLogStepOf = (cursor: RunLogCursor, bytes: Uint8Array, isFull: boolean): RunLogStep => {
  const start = skippedStartOf(bytes, cursor.skipping);

  if (start === -1) {
    const passed: RunLogCursor = { ...cursor, offset: cursor.offset + bytes.length };
    const stillSkipping: RunLogStep = { cursor: passed, entries: [], isUnknown: false };

    return stillSkipping;
  }

  const walk = walkOf(bytes, start, cursor);
  const isStuck = isFull && walk.next === 0;
  const isOversize = isStuck && bytes[0] === OPEN_BRACE;
  const isLeading = isOversize && !walk.hasEntry;
  const oversizeCount = isLeading ? 1 : 0;
  const leadingInvalid = walk.leadingInvalid + oversizeCount;
  const stuckMove = stuckMoveOf(bytes, isOversize);
  const walked: Move = { offset: walk.next, skipping: false };
  const move = isStuck ? stuckMove : walked;
  const moved: Move = { offset: cursor.offset + move.offset, skipping: move.skipping };
  const counted: Walk = { ...walk, leadingInvalid };

  return stepOfWalk(counted, moved);
};
