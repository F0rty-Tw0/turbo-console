import { runLogEventOf } from '@turbo-console/core';
import type { RunLogEntry } from '@turbo-console/core';

import { RUN_LOG_READ_MAX, RUN_LOG_START } from '../common/run-log-tail.const.ts';
import type { RunLogCursor, RunLogListener, RunLogOutcome, RunLogRead } from '../common/run-log-tail.type.ts';
import { runLogStepOf } from '../utils/run-log-step.util.ts';

/**
 * One turbo log file read from a cursor (spec D5): one read at a time, events in file order. `changed` reads again
 * while a read is full or another `changed` came in during it. `drain` reads to the end and ends the tail; `close` ends
 * it at once and resolves when the read in flight has finished. A tail that has ended reads and emits nothing.
 */
export class RunLogFileTail {
  private readonly path: string;
  private readonly read: RunLogRead;
  private readonly onEvent: RunLogListener;
  private cursor: RunLogCursor = RUN_LOG_START;
  private loop: Promise<void> | null = null;
  private draining: Promise<RunLogOutcome> | null = null;
  private isDirty = false;
  private hasAppeared = false;
  private isUnknown = false;
  private isClosed = false;
  private isEnded = false;

  public constructor(path: string, read: RunLogRead, onEvent: RunLogListener) {
    this.path = path;
    this.read = read;
    this.onEvent = onEvent;
  }

  /** The file may have grown; ignored once the tail has ended. */
  public changed(): void {
    if (this.isEnded) return;

    this.requestRead();
  }

  /** Waits for the read in flight, reads to the end of the file and ends the tail; a second call returns the same outcome. */
  public async drain(): Promise<RunLogOutcome> {
    this.draining ??= this.finish();

    return this.draining;
  }

  /** Ends the tail at once: no event follows, not even from the read in flight; resolves when that read has finished. */
  public async close(): Promise<void> {
    this.isClosed = true;
    this.isEnded = true;

    await this.loop;
  }

  private async finish(): Promise<RunLogOutcome> {
    if (!this.isEnded) this.requestRead();

    await this.loop;

    this.isEnded = true;

    return this.outcomeOf();
  }

  private requestRead(): void {
    if (this.loop !== null) {
      this.isDirty = true;

      return;
    }

    this.loop = this.readLoop();
  }

  private async readLoop(): Promise<void> {
    let isMore = true;

    while (isMore) {
      this.isDirty = false;

      const isFull = await this.readOnce();

      isMore = this.isMoreAfter(isFull);
    }

    this.loop = null;
  }

  private isMoreAfter(isFull: boolean): boolean {
    const isChanged = isFull || this.isDirty;

    return isChanged && !this.isEnded;
  }

  /** One read from the cursor; whether it filled the window, so the file may hold more. */
  private async readOnce(): Promise<boolean> {
    const bytes = await this.read(this.path, this.cursor.offset, RUN_LOG_READ_MAX);

    if (bytes === null) return false;

    this.hasAppeared = true;

    if (this.isClosed) return false;

    const isFull = bytes.length === RUN_LOG_READ_MAX;
    const step = runLogStepOf(this.cursor, bytes, isFull);

    this.cursor = step.cursor;
    this.emit(step.entries);

    if (step.isUnknown) this.endUnknown();

    return isFull;
  }

  private endUnknown(): void {
    this.isUnknown = true;
    this.isEnded = true;
  }

  private emit(entries: RunLogEntry[]): void {
    for (const entry of entries) {
      const event = runLogEventOf(entry);

      if (event !== null) this.onEvent(event);
    }
  }

  private outcomeOf(): RunLogOutcome {
    if (this.isUnknown) return 'unknown';

    if (!this.hasAppeared) return 'missing';

    return 'read';
  }
}
