import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { setClassesAmong } from './graph-classes.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import {
  MODULE_BOX_CLASS,
  MODULE_DIR_CLASS,
  MODULE_FILE_CLASS,
  MODULE_LINK_CLASS,
  MODULE_STUB_CLASS
} from '../common/graph-module.const.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NO_CLASSES } from '../common/graph-task.const.ts';
import { BOX_STATE_CLASS_NAMES, DIMMED_BOX_CLASS, STATE_CLASS_NAMES } from '../common/graph.const.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { edgeStateOf, nodeStateOf } from '../utils/highlight.util.ts';

const LEAVES_SELECTOR = `node.${MODULE_FILE_CLASS}, node.${MODULE_DIR_CLASS}, node.${MODULE_STUB_CLASS}`;

const DIMMED_BOX_CLASSES: string[] = [DIMMED_BOX_CLASS];

const idOf = (node: NodeSingular): string => node.id();

const endsOf = (edge: EdgeSingular): GraphEdge => {
  const source = edge.source().id();
  const target = edge.target().id();
  const ends: GraphEdge = { source, target };

  return ends;
};

/** The cards one link away from a node `target`: what it imports and what imports it; `null` for a link or no target. */
const neighboursOf = (cy: Core, target: ModuleSelection | null): Closure | null => {
  if (target === null || target.kind === 'link') return null;

  const node = cy.getElementById(target.id);
  const imported = node.outgoers('node').map(idOf);
  const importing = node.incomers('node').map(idOf);
  const closure: Closure = { dependencies: new Set(imported), dependents: new Set(importing) };

  return closure;
};

/** A card's state: as `nodeStateOf` for a node target; for a link target, `highlighted` on its two cards, else `dimmed`. */
const leafStateOf = (id: string, target: ModuleSelection | null, neighbours: Closure | null): ProbeState => {
  if (target === null) return 'normal';

  if (target.kind === 'node') return nodeStateOf(id, target.id, neighbours);

  const isEnd = id === target.source || id === target.target;

  return isEnd ? 'highlighted' : 'dimmed';
};

/** A link's state: as `edgeStateOf` for a node target; for a link target, `selected` on that link, else `dimmed`. */
const linkStateOf = (edge: EdgeSingular, target: ModuleSelection | null, neighbours: Closure | null): ProbeState => {
  const ends = endsOf(edge);

  if (target === null) return 'normal';

  if (target.kind === 'node') return edgeStateOf(ends, target.id, neighbours);

  const chosenId = edgeIdOf(target);
  const isChosen = edge.id() === chosenId;

  return isChosen ? 'selected' : 'dimmed';
};

/**
 * Gives each card and link one state class for `target`: a node and its 1-hop neighbours, or a link and its two cards;
 * and `dimmed-box` to a box with no lit card inside. `null` paints every card and link `normal`. An element already
 * right is not touched.
 */
export const paintModules = (cy: Core, target: ModuleSelection | null): void => {
  const neighbours = neighboursOf(cy, target);
  const classLeaf = (node: NodeSingular): void => {
    const state = leafStateOf(node.id(), target, neighbours);

    setClassesAmong(node, STATE_CLASS_NAMES, [state]);
  };
  const classLink = (edge: EdgeSingular): void => {
    const state = linkStateOf(edge, target, neighbours);

    setClassesAmong(edge, STATE_CLASS_NAMES, [state]);
  };
  const classBox = (box: NodeSingular): void => {
    const lit = box.descendants('.selected, .highlighted');
    const isDimmed = target !== null && lit.empty();
    const wanted = isDimmed ? DIMMED_BOX_CLASSES : NO_CLASSES;

    setClassesAmong(box, BOX_STATE_CLASS_NAMES, wanted);
  };

  cy.batch((): void => {
    cy.nodes(LEAVES_SELECTOR).forEach(classLeaf);
    cy.edges(`.${MODULE_LINK_CLASS}`).forEach(classLink);
    cy.nodes(`.${MODULE_BOX_CLASS}`).forEach(classBox);
  });
};
