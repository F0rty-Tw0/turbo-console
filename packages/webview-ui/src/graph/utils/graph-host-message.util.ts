import type { GraphHostMessage } from '../../bridge/common/graph-message.type.ts';

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const isGraphShape = (state: UnknownRecord): boolean => {
  const { hash, packages, edges, positions } = state;
  const hasHash = typeof hash === 'string';
  const hasLists = Array.isArray(packages) && Array.isArray(edges);
  const hasPositions = positions === null || isRecord(positions);

  return hasHash && hasLists && hasPositions;
};

const isGraphState = (state: unknown): boolean => {
  if (!isRecord(state)) return false;

  switch (state['kind']) {
    case 'loading':
    case 'singlePackage':
      return true;
    case 'error':
      return typeof state['message'] === 'string';
    case 'graph':
      return isGraphShape(state);
    default:
      return false;
  }
};

/**
 * Narrows a posted value to a `state` message by its state's `kind` and top-level shape; anything else is ignored. The
 * payload itself comes from the extension host, which builds it.
 */
export const isGraphHostMessage = (value: unknown): value is GraphHostMessage => {
  if (!isRecord(value)) return false;

  if (value['type'] !== 'state') return false;

  return isGraphState(value['state']);
};
