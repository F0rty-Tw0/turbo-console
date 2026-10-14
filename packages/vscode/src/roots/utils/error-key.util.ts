import type { ErrorKey } from '../common/coordinator.type.ts';
import type { LoadFailure } from '../common/root.type.ts';

export const errorKeyOf = (failure: LoadFailure | null): ErrorKey | null => {
  if (failure === null) return null;

  return `${failure.stage}:${failure.error.kind}`;
};
