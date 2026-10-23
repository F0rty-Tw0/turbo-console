import { isEdgeExplained } from './edge-explained.util.ts';
import { isGraphTaskList, isRunsRecord, isTaskIdList } from './graph-task-shape.util.ts';
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
  const { hash, packages, edges, positions, folderPositions, tasks } = state;
  const hasHash = typeof hash === 'string';
  const hasPackages = Array.isArray(packages) && packages.every(isPackage);
  const hasEdges = Array.isArray(edges) && edges.every(isEdge);
  const hasPositions = positions === null || isRecord(positions);
  const hasFolderPositions = folderPositions === null || isRecord(folderPositions);
  const hasCaches = hasPositions && hasFolderPositions;
  const hasGraph = hasHash && hasPackages && hasEdges;

  return hasGraph && hasCaches && isGraphTaskList(tasks);
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
 * Narrows a posted value to a `state` message, by its state's `kind` and shape down to each package's name, path, tags and task
 * count, each edge end and each task's fields; to an `edgeExplained` message by its names and result; to a `runs` message by its
 * run states; or to a `showTasks` message by its task ids. Anything else is ignored. The payload itself comes from the extension
 * host, which builds it.
 */
export const isGraphHostMessage = (value: unknown): value is GraphHostMessage => {
  if (!isRecord(value)) return false;

  switch (value['type']) {
    case 'state':
      return isGraphState(value['state']);
    case 'edgeExplained':
      return isEdgeExplained(value);
    case 'runs':
      return isRunsRecord(value['runs']);
    case 'showTasks':
      return isTaskIdList(value['taskIds']);
    default:
      return false;
  }
};
