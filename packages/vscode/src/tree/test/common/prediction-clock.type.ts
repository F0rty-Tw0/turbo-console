import type { PredictionLoadPorts } from '../../common/prediction.type.ts';

/** One `after` call: it fires once when the spec says so, unless it was cancelled first. */
export type FakeTimer = {
  readonly run: () => void;
  readonly ms: number;
  // eslint-disable-next-line local/readonly-type-properties -- set in place by `cancel` and by `fire`
  isCancelled: boolean;
  // eslint-disable-next-line local/readonly-type-properties -- set in place by `cancel` and by `fire`
  isFired: boolean;
};

/** `after` and `cancel` ports over timers the spec fires by hand; `timers` holds every `after` call, in order. */
export type FakeClock = {
  readonly after: PredictionLoadPorts['after'];
  readonly cancel: PredictionLoadPorts['cancel'];
  readonly timers: FakeTimer[];
  readonly pendingTimers: () => FakeTimer[];
  readonly fire: () => void;
};
