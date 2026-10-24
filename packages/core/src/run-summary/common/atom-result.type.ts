/** The newest result of one Atomizer file task: how it ended, how long it ran and when it ended (epoch ms). */
export type AtomResult = {
  readonly outcome: 'passed' | 'failed' | 'cached';
  readonly durationMs: number | null;
  readonly endedAt: number;
};
