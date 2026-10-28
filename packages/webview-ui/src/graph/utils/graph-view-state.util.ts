import type { Position } from '../../bridge/common/graph-state.type.ts';
import type {
  GraphFocus,
  GraphLinkRef,
  GraphTraceRef,
  GraphViewMode,
  GraphViewState,
  PanelWidths,
  TaskViewState
} from '../../bridge/common/graph-view-state.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import { DEFAULT_TASK_DEPTH, MAX_TASK_DEPTH, MIN_TASK_DEPTH } from '../common/graph-task.const.ts';
import { DEFAULT_DEPTH, MAX_DEPTH, MIN_DEPTH } from '../common/graph.const.ts';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const readPosition = (raw: unknown): Position | null => {
  if (!isRecord(raw)) return null;

  const { x, y } = raw;

  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  const position: Position = { x, y };

  return position;
};

const readControlsOpen = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readCamera = (zoom: unknown, rawPan: unknown): Viewport | null => {
  const pan = readPosition(rawPan);
  const isZoomValid = isFiniteNumber(zoom) && zoom > 0;

  if (!isZoomValid || pan === null) return null;

  const camera: Viewport = { zoom, pan };

  return camera;
};

const readFitted = (value: unknown): boolean => value === true;

const depthWithin = (value: unknown, min: number, max: number): number | null => {
  const isInRange = typeof value === 'number' && value >= min && value <= max;
  const isWhole = Number.isInteger(value);

  if (!isInRange || !isWhole) return null;

  return value;
};

const readDepth = (value: unknown): number => depthWithin(value, MIN_DEPTH, MAX_DEPTH) ?? DEFAULT_DEPTH;

const readTaskDepth = (value: unknown): number => depthWithin(value, MIN_TASK_DEPTH, MAX_TASK_DEPTH) ?? DEFAULT_TASK_DEPTH;

const readFocus = (value: unknown): GraphFocus | null => {
  if (typeof value === 'string') {
    const migrated: GraphFocus = { kind: 'package', name: value };

    return migrated;
  }

  if (!isRecord(value)) return null;

  const { kind, name, folder } = value;

  if (kind === 'package' && typeof name === 'string') {
    const focus: GraphFocus = { kind, name };

    return focus;
  }

  if (kind === 'folder' && typeof folder === 'string') {
    const focus: GraphFocus = { kind, folder };

    return focus;
  }

  return null;
};

const isNameList = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const readNames = (value: unknown): string[] => {
  const isList = isNameList(value);

  if (!isList) return [];

  return [...value];
};

const readDetailsOpen = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

const readFolder = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const readGrouped = (value: unknown): boolean => (typeof value === 'boolean' ? value : true);

const readLink = (value: unknown): GraphLinkRef | null => {
  if (!isRecord(value)) return null;

  const { source, target } = value;

  if (typeof source !== 'string' || typeof target !== 'string') return null;

  const link: GraphLinkRef = { source, target };

  return link;
};

const readTrace = (value: unknown): GraphTraceRef | null => {
  if (!isRecord(value)) return null;

  const { start, end } = value;

  if (typeof start !== 'string' || typeof end !== 'string') return null;

  const trace: GraphTraceRef = { start, end };

  return trace;
};

/** The saved task view, rebuilt field by field; `null` when any field is off, except a bad depth, which takes its default. */
const readTask = (raw: unknown): TaskViewState | null => {
  if (!isRecord(raw)) return null;

  const { chosen, capLifted, selected, search, layoutKey } = raw;
  const camera = readCamera(raw['zoom'], raw['pan']);
  const isChosenValid = isNameList(chosen);
  const isSelectionValid = selected === null || typeof selected === 'string';
  const areTextsValid = typeof search === 'string' && typeof layoutKey === 'string';
  const areFieldsValid = isChosenValid && typeof capLifted === 'boolean' && isSelectionValid && areTextsValid;

  if (!areFieldsValid || camera === null) return null;

  const depth = readTaskDepth(raw['depth']);
  const fitted = readFitted(raw['fitted']);
  const task: TaskViewState = { chosen: [...chosen], capLifted, depth, selected, search, ...camera, fitted, layoutKey };

  return task;
};

/** Task mode only with a task view to show; anything else reads as package mode. */
const readMode = (value: unknown, task: TaskViewState | null): GraphViewMode => {
  const isTaskMode = value === 'tasks' && task !== null;

  return isTaskMode ? 'tasks' : 'packages';
};

const isPositiveNumber = (value: unknown): value is number => isFiniteNumber(value) && value > 0;

/** The saved panel widths; `null` unless both sides are finite numbers above zero. */
const readPanelWidths = (raw: unknown): PanelWidths | null => {
  if (!isRecord(raw)) return null;

  const { controls, details } = raw;

  if (!isPositiveNumber(controls) || !isPositiveNumber(details)) return null;

  const widths: PanelWidths = { controls, details };

  return widths;
};

/** Whether `raw` holds a grouping choice; a state saved before folders existed has none, and reads as grouped. */
export const hasSavedGrouping = (raw: unknown): boolean => isRecord(raw) && typeof raw['grouped'] === 'boolean';

/** The saved camera, selection, controls, inspection, mode, task view and panel widths, rebuilt field by field; `null` when the camera or selection is off, a bad controls, inspection or task field takes its default. */
export const readGraphViewState = (raw: unknown): GraphViewState | null => {
  if (!isRecord(raw)) return null;

  const { hash, selected } = raw;
  const camera = readCamera(raw['zoom'], raw['pan']);
  const isSelectionValid = selected === null || typeof selected === 'string';
  const isHashValid = typeof hash === 'string';
  const areFieldsValid = isHashValid && isSelectionValid;

  if (!areFieldsValid || camera === null) return null;

  const task = readTask(raw['task']);
  const state: GraphViewState = {
    hash,
    ...camera,
    fitted: readFitted(raw['fitted']),
    selected,
    controlsOpen: readControlsOpen(raw['controlsOpen']),
    search: readString(raw['search']),
    depth: readDepth(raw['depth']),
    hidden: readNames(raw['hidden']),
    focus: readFocus(raw['focus']),
    tags: readNames(raw['tags']),
    detailsOpen: readDetailsOpen(raw['detailsOpen']),
    link: readLink(raw['link']),
    trace: readTrace(raw['trace']),
    folder: readFolder(raw['folder']),
    grouped: readGrouped(raw['grouped']),
    collapsed: readNames(raw['collapsed']),
    mode: readMode(raw['mode'], task),
    task,
    panelWidths: readPanelWidths(raw['panelWidths'])
  };

  return state;
};
