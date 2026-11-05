import { vi } from 'vitest';

import { fakeRunLogTail } from './run-log-tail-fake.spec.util.ts';
import { dependenciesOfMap } from './run-progress.spec.util.ts';
import type { ProgressOwner } from '../../common/run-progress.type.ts';
import type { JoinHarness, JoinParts } from '../common/run-progress-join-harness.type.ts';
import {
  JOIN_DEFINITION_STUB,
  JOIN_DEPENDENCIES_STUB,
  JOIN_OWNER_STUB,
  JOIN_REQUEST_STUB,
  SEEN_B_STUB
} from '../stubs/run-progress-join.stub.ts';

export const joinHarnessOf = (parts: JoinParts): JoinHarness => {
  const { runs, progress, join } = parts;
  const settle = vi.spyOn(progress, 'settle');
  const tail = fakeRunLogTail();
  const dependenciesOf = dependenciesOfMap(JOIN_DEPENDENCIES_STUB);
  const beginRun = (owner: ProgressOwner = JOIN_OWNER_STUB): void => {
    runs.tryStart(JOIN_REQUEST_STUB, owner.launchedAt);
    join.begin(owner, dependenciesOf);
  };
  const beginTailedRun = (): void => {
    beginRun();
    join.tail(JOIN_OWNER_STUB, tail.handle);
    join.event(JOIN_OWNER_STUB, SEEN_B_STUB);
  };
  const endRun = (exitCode: number): void => {
    runs.processEnded(JOIN_DEFINITION_STUB, exitCode, 3000, JOIN_OWNER_STUB.launchedAt);
  };
  const stateOfB = (): string | undefined => progress.recordsOf('/ws', 'b#build')[0]?.state;
  const harness: JoinHarness = { ...parts, settle, tail, dependenciesOf, beginRun, beginTailedRun, endRun, stateOfB };

  return harness;
};
