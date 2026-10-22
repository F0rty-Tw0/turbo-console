import { folderOfElementId } from './folder-id.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NORMAL_FOLDER_PAINT } from '../common/paint.const.ts';
import type { FolderPaint } from '../common/paint.type.ts';

type NodeState = (name: string) => ProbeState;

type EdgeState = (edge: GraphEdge) => ProbeState;

type FolderStates = (folder: string) => ProbeState;

const STRONGEST_FIRST: ProbeState[] = ['selected', 'highlighted', 'normal', 'dimmed'];

const LIT_EDGE_STATES: ProbeState[] = ['highlighted', 'selected'];

/** The strongest of `states`, order selected, highlighted, normal, dimmed; `normal` for none. */
export const strongestOf = (states: ProbeState[]): ProbeState => {
  const strongest = STRONGEST_FIRST.find((state: ProbeState): boolean => states.includes(state));

  return strongest ?? 'normal';
};

/** The states of the folder's packages that are visible or ghosts; hidden packages never count. */
const countedStatesOf = (scene: FolderScene, nodeState: NodeState, folder: string): ProbeState[] => {
  const names = scene.members.get(folder) ?? [];
  const isCounted = (name: string): boolean => scene.visible.has(name) || scene.ghosts.has(name);
  const counted = names.filter(isCounted);

  return counted.map((name: string): ProbeState => nodeState(name));
};

const isNotDimmed = (state: ProbeState): boolean => state !== 'dimmed';

/** A box is `dimmed` only when it counts packages and every one is dimmed; never `highlighted`. */
const boxStateOf = (states: ProbeState[]): ProbeState => {
  if (states.length === 0) return 'normal';

  return states.some(isNotDimmed) ? 'normal' : 'dimmed';
};

/** A folder link end: a collapsed folder reads `collapsedState`, a known package its `nodeState`, anything else `normal`. */
const endStateOf = (end: string, scene: FolderScene, nodeState: NodeState, collapsedState: FolderStates): ProbeState => {
  const folder = folderOfElementId(end);

  if (folder !== null) return collapsedState(folder);

  const isKnown = scene.folderOf.has(end);

  if (!isKnown) return 'normal';

  return nodeState(end);
};

const folderLinkStateOf = (link: FolderLink, edgeState: EdgeState, endState: (end: string) => ProbeState): ProbeState => {
  const isLit = link.links.some((edge: GraphEdge): boolean => LIT_EDGE_STATES.includes(edgeState(edge)));

  if (isLit) return 'highlighted';

  const sourceState = endState(link.source);
  const targetState = endState(link.target);
  const isDimmed = sourceState === 'dimmed' || targetState === 'dimmed';

  return isDimmed ? 'dimmed' : 'normal';
};

/** The state of each folder box, collapsed folder and folder link, from the package and link states; `normal` for a `null` scene. */
export const folderPaintOf = (nodeState: NodeState, edgeState: EdgeState, scene: FolderScene | null): FolderPaint => {
  if (scene === null) return NORMAL_FOLDER_PAINT;

  const boxState = (folder: string): ProbeState => boxStateOf(countedStatesOf(scene, nodeState, folder));
  const collapsedState = (folder: string): ProbeState => strongestOf(countedStatesOf(scene, nodeState, folder));
  const endState = (end: string): ProbeState => endStateOf(end, scene, nodeState, collapsedState);
  const folderLinkState = (link: FolderLink): ProbeState => folderLinkStateOf(link, edgeState, endState);
  const paint: FolderPaint = { boxState, collapsedState, folderLinkState };

  return paint;
};
