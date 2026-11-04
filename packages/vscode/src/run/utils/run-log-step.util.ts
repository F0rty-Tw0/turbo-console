import { isUnknownRunLog, scanRunLog } from '@turbo-console/core';
import type { RunLogEntry } from '@turbo-console/core';

import type { RunLogCursor, RunLogStep } from '../common/run-log-tail.type.ts';

const NEWLINE = 0x0a;
const OPEN_BRACE = 0x7b;

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
 * The index after the newline that ends a broken object, `-1` when the open object at `next` is not broken: a later
 * line began (compact objects hold no raw newline), so the object will never close. A newline with no `{` after it is
 * turbo's stale byte over `[\n]\n`, not a break.
 */
const brokenEndOf = (bytes: Uint8Array, next: number): number => {
  if (bytes[next] !== OPEN_BRACE) return -1;

  const newline = bytes.indexOf(NEWLINE, next);

  if (newline === -1) return -1;

  const laterLine = bytes.indexOf(OPEN_BRACE, newline);

  if (laterLine === -1) return -1;

  return newline + 1;
};

const walkOf = (bytes: Uint8Array, start: number, cursor: RunLogCursor): Walk => {
  const entries: RunLogEntry[] = [];
  let leadingInvalid = cursor.leadingInvalid;
  let hasEntry = cursor.hasEntry;
  let from = start;
  let next: number;
  let brokenEnd: number;

  do {
    const scan = scanRunLog(bytes, from);

    for (const entry of scan.entries) entries.push(entry);

    if (!hasEntry) leadingInvalid += scan.leadingInvalid;

    hasEntry = hasEntry || scan.entries.length > 0;
    next = scan.next;
    brokenEnd = brokenEndOf(bytes, next);
    from = brokenEnd;

    if (brokenEnd !== -1 && !hasEntry) leadingInvalid += 1;
  } while (brokenEnd !== -1);

  const walk: Walk = { entries, next, leadingInvalid, hasEntry };

  return walk;
};

const stepOfWalk = (walk: Walk, moved: Pick<RunLogCursor, 'offset' | 'skipping'>): RunLogStep => {
  const isUnknown = isUnknownRunLog(walk.leadingInvalid);
  const cursor: RunLogCursor = { ...moved, leadingInvalid: walk.leadingInvalid, hasEntry: walk.hasEntry };
  const known: RunLogStep = { cursor, entries: walk.entries, isUnknown };

  if (!isUnknown) return known;

  const unknown: RunLogStep = { cursor, entries: [], isUnknown };

  return unknown;
};

/**
 * One read of at most `RUN_LOG_READ_MAX` bytes from `cursor.offset`, stepped (spec D4, D5). The cursor stops at the first
 * incomplete object, so turbo's in-place rewrite of the closing `]` is re-read. A window that holds an open object it can
 * never close, or no `{` at all, is moved past (a full window never leaves the cursor in place), and a broken line is
 * counted invalid once and skipped to its newline.
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
  const advance = isStuck ? bytes.length : walk.next;
  const moved = { offset: cursor.offset + advance, skipping: isOversize };
  const counted: Walk = { ...walk, leadingInvalid };

  return stepOfWalk(counted, moved);
};
