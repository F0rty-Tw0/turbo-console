import type { ProbeEdge, ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';

const isGhostNode = (node: ProbeNode): boolean => node.isGhost;

const idOf = (node: ProbeNode): string => node.id;

const isGhostEdge = (edge: ProbeEdge): boolean => edge.isGhost;

const isUndrawn = (edge: ProbeEdge): boolean => !edge.isDrawn;

const nameOfEdge = (edge: ProbeEdge): string => `${edge.source}>${edge.target}`;

const touches = (edge: ProbeEdge, name: string): boolean => edge.source === name || edge.target === name;

const problemsOfPathEdge = (edge: ProbeEdge, name: string): string[] => {
  const label = nameOfEdge(edge);
  const isOnGhost = touches(edge, name);
  const isNotDrawn = isUndrawn(edge);
  const problems: string[] = [];

  if (!isOnGhost) problems.push(`${label} is a ghost edge off ${name}`);

  if (isNotDrawn) problems.push(`${label} is not drawn`);

  if (edge.lineStyle !== 'dashed') problems.push(`${label} line is ${edge.lineStyle}`);

  return problems;
};

const problemsOfNode = (nodes: ProbeNode[], name: string): string[] => {
  const ghosts = nodes.filter(isGhostNode).map(idOf);
  const node = nodes.find((candidate): boolean => candidate.id === name);
  const isOnlyGhost = ghosts.length === 1 && ghosts[0] === name;
  const problems: string[] = [];

  if (!isOnlyGhost) problems.push(`ghost nodes are [${ghosts.join(', ')}]`);

  if (node?.borderStyle !== 'dashed') problems.push(`${name} border is ${node?.borderStyle}`);

  return problems;
};

/**
 * What is wrong with `name` as the one ghost; `[]` when it is dashed, its path edges are dashed and drawn, and every
 * other edge touching it is not drawn.
 */
export const ghostProblemsOf = (nodes: ProbeNode[], edges: ProbeEdge[], name: string): string[] => {
  const pathEdges = edges.filter(isGhostEdge);
  const touching = edges.filter((edge): boolean => touches(edge, name));
  const drawnOthers = touching.filter((edge): boolean => !edge.isGhost && edge.isDrawn);
  const pathProblems = pathEdges.flatMap((edge): string[] => problemsOfPathEdge(edge, name));
  const drawnProblems = drawnOthers.map((edge): string => `${nameOfEdge(edge)} is drawn`);
  const nodeProblems = problemsOfNode(nodes, name);
  const problems = nodeProblems.concat(pathProblems, drawnProblems);

  if (pathEdges.length === 0) problems.push('no ghost edge');

  return problems;
};

/** What is left of a ghost: a ghost node or edge, or an edge between two visible packages that is not drawn. */
export const leftoverGhostOf = (nodes: ProbeNode[], edges: ProbeEdge[], visible: string[]): string[] => {
  const ghostNodes = nodes.filter(isGhostNode).map((node): string => `ghost node ${node.id}`);
  const ghostEdges = edges.filter(isGhostEdge).map((edge): string => `ghost edge ${nameOfEdge(edge)}`);
  const isShown = (edge: ProbeEdge): boolean => visible.includes(edge.source) && visible.includes(edge.target);
  const undrawn = edges.filter((edge): boolean => isShown(edge) && isUndrawn(edge));
  const undrawnNames = undrawn.map((edge): string => `undrawn edge ${nameOfEdge(edge)}`);

  return [...ghostNodes, ...ghostEdges, ...undrawnNames];
};
