import type { AffectedListener, SharedAffected } from '../../common/affected.type.ts';

/** What a fake adds to `SharedAffected`: `emit` tells every subscribed listener that the view of `root` changed. */
type AffectedEmitter = {
  readonly emit: AffectedListener;
};

/** A `SharedAffected` whose members are spies, plus its emitter. */
export type SharedAffectedFake = SharedAffected & AffectedEmitter;
