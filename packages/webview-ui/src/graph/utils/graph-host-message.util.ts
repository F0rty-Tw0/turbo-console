import { isEdgeExplained } from './edge-explained.util.ts';
import { isAtomGroupList, isAtomStateRecord, isGraphTaskList, isRunsRecord, isTaskIdList } from './graph-task-shape.util.ts';
import type { UnknownRecord } from '../../bridge/common/bridge.type.ts';
import { TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import type { GraphHostMessage } from '../../bridge/common/graph-message.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { isString } from '../../bridge/utils/string.util.ts';

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

const hasCachesOf = (state: UnknownRecord): boolean => {
  const { positions, folderPositions } = state;
  const hasPositions = positions === null || isRecord(positions);
  const hasFolderPositions = folderPositions === null || isRecord(folderPositions);

  return hasPositions && hasFolderPositions;
};

const hasSinglePackageOf = (state: UnknownRecord): boolean => {
  const { singlePackage, rootLabel } = state;
  const hasFlag = typeof singlePackage === 'boolean';
  const hasLabel = rootLabel === null || typeof rootLabel === 'string';

  return hasFlag && hasLabel;
};

const isGraphShape = (state: UnknownRecord): boolean => {
  const { hash, packages, edges, tasks, atomGroups } = state;
  const hasHash = typeof hash === 'string';
  const hasPackages = Array.isArray(packages) && packages.every(isPackage);
  const hasEdges = Array.isArray(edges) && edges.every(isEdge);
  const hasGraph = hasHash && hasPackages && hasEdges;
  const hasTaskParts = isGraphTaskList(tasks) && isAtomGroupList(atomGroups);
  const hasCaches = hasCachesOf(state);
  const hasSinglePackage = hasSinglePackageOf(state);
  const hasHostFields = hasCaches && hasSinglePackage;

  return hasGraph && hasTaskParts && hasHostFields;
};

const isGraphState = (state: unknown): boolean => {
  if (!isRecord(state)) return false;

  switch (state['kind']) {
    case 'loading':
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
 * count, each edge end, each task's fields and each atom group's files; to an `edgeExplained` message by its names and
 * result; to a `runs` message by its run states; to a `showTasks` message by its task ids; to a `showPackage` message by
 * its package name; or to an `atoms` message by its counts lines and the four outcome words. Anything else is ignored. The payload itself comes from the extension host,
 * which builds it.
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
    case 'showPackage':
      return isString(value['name']);
    case 'atoms':
      return isAtomStateRecord(value['groups']);
    default:
      return false;
  }
};
