import type { RunLogEvent } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { RunLogTail } from '../common/run-log-tail.type.ts';
import type { DependenciesOf, ProgressOwner, ProgressPort, ProgressRuns } from '../common/run-progress.type.ts';
import type { RunEntry, Runs } from '../common/run.type.ts';
import { progressKeyOf } from '../utils/run-entry.util.ts';

/**
 * One begun run's two halves: the log (`isDrained`: its tail drained or closed, or it never had one) and the summary
 * (`isMatched`: the owner's `ended` entry holds its match, or a rerun took its slot while the match was pending).
 */
type JoinState = {
  readonly owner: ProgressOwner;
  readonly tail: RunLogTail | null;
  readonly isDrained: boolean;
  readonly ended: RunEntry | null;
  readonly isMatched: boolean;
};

const joinAfterEntry = (join: JoinState, entry: RunEntry): JoinState => {
  const { launchedAt } = join.owner;

  if (entry.launchedAt === launchedAt) {
    if (entry.state === 'running') return join;

    const ended: JoinState = { ...join, ended: entry, isMatched: !entry.matching };

    return ended;
  }

  const isRerunOverPendingMatch = entry.launchedAt > launchedAt && join.ended?.matching === true;
  const matched: JoinState = { ...join, isMatched: true };

  return isRerunOverPendingMatch ? matched : join;
};

/**
 * Settles each begun run once both halves are done (spec D10), whichever comes first, with the entry it latched when it
 * ended: the store holds the rerun's entry by then. The progress is told about the owner runs of `runs`; a throwing
 * settle (a progress listener's bug) is logged, never thrown, since `abort` and a rerun's settle run inside code with no
 * catch of its own.
 */
export class RunProgressJoin implements ProgressPort {
  private readonly joins = new Map<string, JoinState>();
  private readonly progress: ProgressRuns;
  private readonly log: (text: string) => void;

  public constructor(progress: ProgressRuns, runs: Pick<Runs, 'onDidChange'>, log: (text: string) => void) {
    this.progress = progress;
    this.log = log;
    runs.onDidChange((entry) => {
      this.latch(entry);
    });
  }

  public begin(owner: ProgressOwner, dependenciesOf: DependenciesOf): void {
    const join: JoinState = { owner, tail: null, isDrained: false, ended: null, isMatched: false };

    this.progress.begin(owner, dependenciesOf);
    // grug: one begin per launch (key has launchedAt); a second begin replaces the join
    this.joins.set(progressKeyOf(owner), join);
  }

  public tail(owner: ProgressOwner, handle: RunLogTail): void {
    const key = progressKeyOf(owner);
    const join = this.joins.get(key);
    const isRefused = join === undefined || join.isDrained || join.tail !== null;

    if (isRefused) {
      handle.close();

      return;
    }

    const tailed: JoinState = { ...join, tail: handle };

    this.joins.set(key, tailed);
  }

  public event(owner: ProgressOwner, event: RunLogEvent): void {
    this.progress.event(owner, event);
  }

  /**
   * The drain half: reads the tail to its end; with no tail it is done at once. A tail whose drain rejects still ends
   * the half, and its error reaches the caller.
   */
  public async drain(owner: ProgressOwner): Promise<void> {
    const key = progressKeyOf(owner);

    try {
      await this.joins.get(key)?.tail?.drain();
    } finally {
      this.finishDrain(key);
    }
  }

  /** The drain half for a start that failed: the tail reads no more. */
  public abort(owner: ProgressOwner): void {
    const key = progressKeyOf(owner);

    this.joins.get(key)?.tail?.close();
    this.finishDrain(key);
  }

  /** Re-reads the join: an `abort` during the drain may have settled it already. */
  private finishDrain(key: string): void {
    const join = this.joins.get(key);

    if (join === undefined) return;

    const drained: JoinState = { ...join, isDrained: true };

    this.settleWhenDone(key, drained);
  }

  private latch(entry: RunEntry): void {
    for (const [key, join] of this.joins) {
      const isTask = join.owner.root === entry.root && join.owner.taskId === entry.taskId;

      if (isTask) this.settleWhenDone(key, joinAfterEntry(join, entry));
    }
  }

  /** Stores `join`, or settles its run with the latched entry and forgets it when both halves are done. */
  private settleWhenDone(key: string, join: JoinState): void {
    const { ended } = join;
    const isDone = join.isDrained && join.isMatched;

    if (!isDone || ended === null) {
      this.joins.set(key, join);

      return;
    }

    this.joins.delete(key);

    try {
      this.progress.settle(join.owner, ended);
    } catch (error) {
      this.log(logTextOf(error));
    }
  }
}
