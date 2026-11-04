import { basename } from 'node:path';

import { RunLogFileTail } from './run-log-file-tail.ts';
import { RUN_LOG_OUTCOME_TEXTS } from '../common/run-log-tail.const.ts';
import type { RunLogListener, RunLogOutcome, RunLogPorts, RunLogTail, RunLogWatcher } from '../common/run-log-tail.type.ts';
import { runLogDirOf } from '../utils/run-log-dir.util.ts';
import { runLogWatchErrorText } from '../utils/run-text.util.ts';

type LiveTail = {
  readonly file: RunLogFileTail;
  readonly handle: RunLogTail;
};

type LoggedKind = RunLogOutcome | 'watch';

/**
 * The live turbo log tails of the window (spec D5, D6): one folder watcher per root while any of its tails lives, and
 * each degrade line once per session. A tail ends once, by `drain` or `close`: it leaves the registry, releases the
 * root's watcher if it was the last, and removes its file after its last read.
 */
export class RunLogTails {
  private readonly ports: RunLogPorts;
  private readonly liveByRoot = new Map<string, Map<string, LiveTail>>();
  private readonly watchers = new Map<string, RunLogWatcher>();
  private readonly loggedKinds = new Set<LoggedKind>();

  public constructor(ports: RunLogPorts) {
    this.ports = ports;
  }

  /** Tails `path` of `root` and reads what it already holds; a path already live returns its handle. */
  public start(root: string, path: string, onEvent: RunLogListener): RunLogTail {
    const live = this.liveOf(root);
    const existing = live.get(path);

    if (existing !== undefined) return existing.handle;

    const file = new RunLogFileTail(path, this.ports.read, onEvent);
    const drain = async (): Promise<void> => this.drainTail(root, path, file);
    const close = (): void => {
      this.closeTail(root, path, file);
    };

    const handle: RunLogTail = { drain, close };

    live.set(path, { file, handle });
    this.watch(root);
    file.changed();

    return handle;
  }

  private liveOf(root: string): Map<string, LiveTail> {
    const known = this.liveByRoot.get(root);

    if (known !== undefined) return known;

    const created = new Map<string, LiveTail>();

    this.liveByRoot.set(root, created);

    return created;
  }

  private watch(root: string): void {
    const isWatched = this.watchers.has(root);

    if (isWatched) return;

    const dir = runLogDirOf(root);
    const onChange = (fileName: string | null): void => {
      this.route(root, fileName);
    };
    const onError = (error: unknown): void => {
      this.dropWatcher(root);
      this.logOnce('watch', runLogWatchErrorText(dir, error));
    };

    this.watchers.set(root, this.ports.watch(dir, onChange, onError));
  }

  private dropWatcher(root: string): void {
    this.watchers.get(root)?.close();
    this.watchers.delete(root);
  }

  private route(root: string, fileName: string | null): void {
    const live = this.liveByRoot.get(root) ?? new Map<string, LiveTail>();

    for (const [path, tail] of live) {
      const name = basename(path);

      if (fileName === null || name === fileName) tail.file.changed();
    }
  }

  private async drainTail(root: string, path: string, file: RunLogFileTail): Promise<void> {
    const outcome = await file.drain();

    const isLeaving = this.leave(root, path, file);

    if (!isLeaving) return;

    this.logOutcome(outcome);
    await this.removeFile(path);
  }

  private closeTail(root: string, path: string, file: RunLogFileTail): void {
    const isLeaving = this.leave(root, path, file);

    if (!isLeaving) return;

    const removeAfterRead = async (): Promise<void> => this.removeFile(path);

    void file.close().then(removeAfterRead);
  }

  /** Unregisters the tail and releases the root's watcher with its last tail; `false` when the tail had already ended. */
  private leave(root: string, path: string, file: RunLogFileTail): boolean {
    const live = this.liveOf(root);

    if (live.get(path)?.file !== file) return false;

    live.delete(path);

    if (live.size === 0) this.dropWatcher(root);

    return true;
  }

  private async removeFile(path: string): Promise<void> {
    try {
      await this.ports.remove(path);
    } catch {
      return;
    }
  }

  private logOutcome(outcome: RunLogOutcome): void {
    const line = RUN_LOG_OUTCOME_TEXTS[outcome];

    if (line !== undefined) this.logOnce(outcome, line);
  }

  private logOnce(kind: LoggedKind, line: string): void {
    const isLogged = this.loggedKinds.has(kind);

    if (isLogged) return;

    this.loggedKinds.add(kind);
    this.ports.log(line);
  }
}
