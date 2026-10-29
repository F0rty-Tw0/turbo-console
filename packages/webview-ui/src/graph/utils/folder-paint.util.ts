import { edgeIdOf } from './edge-id.util.ts';
import { folderOfElementId } from './folder-id.util.ts';
import { folderLinkOf } from './folder-links.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NORMAL_FOLDER_PAINT } from '../common/paint.const.ts';
import type { FolderPaint, Paint } from '../common/paint.type.ts';

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

type Inside = (name: string) => boolean;

const normalState = (): ProbeState => 'normal';

const unscenedPaint: Paint = { nodeState: normalState, edgeState: normalState, ...NORMAL_FOLDER_PAINT };

/** The packages at the far end of a link with exactly one end in the folder. */
const farEndsOf = (edges: GraphEdge[], isInside: Inside): Set<string> => {
  const far = new Set<string>();

  for (const { source, target } of edges) {
    const isSourceInside = isInside(source);
    const isTargetInside = isInside(target);

    if (isSourceInside && !isTargetInside) far.add(target);

    if (isTargetInside && !isSourceInside) far.add(source);
  }

  return far;
};

const crossingEdgeStateOf = (edge: GraphEdge, isInside: Inside): ProbeState => {
  const isSourceInside = isInside(edge.source);
  const isTargetInside = isInside(edge.target);

  if (isSourceInside && isTargetInside) return 'normal';

  const isCrossing = isSourceInside || isTargetInside;

  return isCrossing ? 'highlighted' : 'dimmed';
};

const selectedOr = (folder: string, state: FolderStates): FolderStates => {
  const stateOf = (candidate: string): ProbeState => {
    if (candidate === folder) return 'selected';

    return state(candidate);
  };

  return stateOf;
};

/**
 * The paint for an inspected folder (spec §4.4): its packages and the far ends of links crossing its edge stay `normal`,
 * every other package is `dimmed`; a crossing link is `highlighted`, a link inside `normal`, any other `dimmed`.
 * The folder's box and collapsed node are `selected`; every other folder reads the package states.
 */
export const folderRowPaintOf = (folder: string, edges: GraphEdge[], scene: FolderScene | null): Paint => {
  if (scene === null) return unscenedPaint;

  const isInside: Inside = (name: string): boolean => scene.folderOf.get(name) === folder;
  const far = farEndsOf(edges, isInside);
  const nodeState = (name: string): ProbeState => (isInside(name) || far.has(name) ? 'normal' : 'dimmed');
  const edgeState = (edge: GraphEdge): ProbeState => crossingEdgeStateOf(edge, isInside);
  const others = folderPaintOf(nodeState, edgeState, scene);
  const isCrossing = (edge: GraphEdge): boolean => edgeState(edge) === 'highlighted';
  const folderLinkState = (link: FolderLink): ProbeState => {
    const hasCrossing = link.links.some(isCrossing);

    return hasCrossing ? 'highlighted' : 'dimmed';
  };
  const boxState = selectedOr(folder, others.boxState);
  const collapsedState = selectedOr(folder, others.collapsedState);
  const paint: Paint = { nodeState, edgeState, boxState, collapsedState, folderLinkState };

  return paint;
};

/** The folder link with the bundle's exact ends reads `selected`; any other folder link reads the package and link states. */
const selectedLinkOr = (bundled: FolderLink, others: FolderPaint): ((link: FolderLink) => ProbeState) => {
  const stateOf = (link: FolderLink): ProbeState => {
    const isBundled = link.source === bundled.source && link.target === bundled.target;

    if (isBundled) return 'selected';

    return others.folderLinkState(link);
  };

  return stateOf;
};

/**
 * The paint for an inspected bundle (spec D10): the links inside it are `selected` and their ends `highlighted`, every
 * other package and link is `dimmed`. A bundle whose folder link is not in the scene paints like none.
 */
export const bundlePaintOf = (source: string, target: string, scene: FolderScene | null): Paint => {
  const bundled = folderLinkOf(scene, source, target);

  if (bundled === null) return unscenedPaint;

  const keys = new Set(bundled.links.map(edgeIdOf));
  const ends = new Set(bundled.links.flatMap((edge: GraphEdge): string[] => [edge.source, edge.target]));
  const nodeState = (name: string): ProbeState => (ends.has(name) ? 'highlighted' : 'dimmed');
  const edgeState = (edge: GraphEdge): ProbeState => (keys.has(edgeIdOf(edge)) ? 'selected' : 'dimmed');
  const others = folderPaintOf(nodeState, edgeState, scene);
  const folderLinkState = selectedLinkOr(bundled, others);
  const { boxState, collapsedState } = others;
  const paint: Paint = { nodeState, edgeState, boxState, collapsedState, folderLinkState };

  return paint;
};
