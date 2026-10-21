import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import type { GraphHostMessage } from '../../bridge/common/graph-message.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';

const isString = (value: unknown): value is string => typeof value === 'string';

const isEdge = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { source, target } = value;

  return isString(source) && isString(target);
};

const isGraphShape = (state: UnknownRecord): boolean => {
  const { hash, packages, edges, positions } = state;
  const hasHash = typeof hash === 'string';
  const hasPackages = Array.isArray(packages) && packages.every(isString);
  const hasEdges = Array.isArray(edges) && edges.every(isEdge);
  const hasPositions = positions === null || isRecord(positions);

  return hasHash && hasPackages && hasEdges && hasPositions;
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
 * Narrows a posted value to a `state` message by its state's `kind` and shape, down to each package name and edge end;
 * anything else is ignored. The payload itself comes from the extension host, which builds it.
 */
export const isGraphHostMessage = (value: unknown): value is GraphHostMessage => {
  if (!isRecord(value)) return false;

  if (value['type'] !== 'state') return false;

  return isGraphState(value['state']);
};
