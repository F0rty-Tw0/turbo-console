import { isEdgeExplained } from './edge-explained.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import { TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import type { GraphHostMessage } from '../../bridge/common/graph-message.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';

const isString = (value: unknown): value is string => typeof value === 'string';

const isEdge = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { source, target } = value;

  return isString(source) && isString(target);
};

const isPackage = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  const { name, path, tags, taskCount } = value;
  const hasTags = Array.isArray(tags) && tags.every(isString);
  const hasTaskCount = typeof taskCount === 'number' && Number.isInteger(taskCount) && taskCount >= 0 && taskCount <= TASK_COUNT_MAX;

  return isString(name) && isString(path) && hasTags && hasTaskCount;
};

const isGraphShape = (state: UnknownRecord): boolean => {
  const { hash, packages, edges, positions } = state;
  const hasHash = typeof hash === 'string';
  const hasPackages = Array.isArray(packages) && packages.every(isPackage);
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
 * Narrows a posted value to a `state` message, by its state's `kind` and shape down to each package's name, path, tags and task count and
 * each edge end, or to an `edgeExplained` message by its names and result; anything else is ignored. The payload itself comes from the
 * extension host, which builds it.
 */
export const isGraphHostMessage = (value: unknown): value is GraphHostMessage => {
  if (!isRecord(value)) return false;

  switch (value['type']) {
    case 'state':
      return isGraphState(value['state']);
    case 'edgeExplained':
      return isEdgeExplained(value);
    default:
      return false;
  }
};
