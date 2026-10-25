import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';

import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import {
  ATOM_BOX_CLASS,
  ATOM_BOX_PREFIX,
  ATOM_FILE_CLASS,
  ATOM_FILE_SIZE,
  ATOM_LIVE_CLASS,
  ATOM_OUTCOME_CLASSES,
  ATOM_UMBRELLA_CLASS
} from '../common/graph-atom.const.ts';
import { TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import type { AtomCanvas } from '../common/task-canvas.type.ts';

const OUTCOME_CLASSES = Object.values(ATOM_OUTCOME_CLASSES).join(' ');

/** A task's label: its name, over its counts line when it has one. */
export const labelOf = (name: string, counts: string | undefined): string => (counts === undefined ? name : `${name}\n${counts}`);

/** A task node's classes: `task`, and `atom-umbrella` too for an umbrella. */
export const taskClassesOf = (isUmbrella: boolean): string =>
  isUmbrella ? `${TASK_NODE_CLASS} ${ATOM_UMBRELLA_CLASS}` : TASK_NODE_CLASS;

/** Sets the label of each task in `labels` to its name over its counts; a task not drawn is skipped. */
export const setCountLabels = (cy: Core, labels: ReadonlyMap<string, string>): void => {
  const countNode = (counts: string, id: string): void => {
    const node = cy.getElementById(id);
    const name: unknown = node.data('name');

    node.data('label', labelOf(String(name), counts));
  };

  cy.batch((): void => labels.forEach(countNode));
};

const outcomeClassOf = (outcome: GraphAtomOutcome | undefined): string => {
  if (outcome === undefined || outcome === 'none') return '';

  return ATOM_OUTCOME_CLASSES[outcome];
};

const fileNameOf = (specPath: string): string => specPath.slice(specPath.lastIndexOf('/') + 1);

const fileDefinitionOf = (file: GraphAtomFile, boxId: string, outcomes: Record<string, GraphAtomOutcome>): ElementDefinition => {
  const { width, height } = ATOM_FILE_SIZE;
  const data = { id: file.id, label: fileNameOf(file.specPath), parent: boxId, width, height };
  const liveClass = file.isLive ? ATOM_LIVE_CLASS : '';
  const outcome = Object.hasOwn(outcomes, file.id) ? outcomes[file.id] : undefined;
  const classNames = [ATOM_FILE_CLASS, outcomeClassOf(outcome), liveClass];
  const classes = classNames.filter(Boolean).join(' ');
  const definition: ElementDefinition = { data, classes };

  return definition;
};

const boxDefinitionOf = (boxId: string, pkgBoxId: string): ElementDefinition => {
  const data = { id: boxId, parent: pkgBoxId };
  const definition: ElementDefinition = { data, classes: ATOM_BOX_CLASS };

  return definition;
};

/** Gives each drawn file in `outcomes` the class of its outcome in place of the one it had; any other id is skipped. */
const setFileOutcomes = (cy: Core, outcomes: Record<string, GraphAtomOutcome>): void => {
  const markFile = ([id, outcome]: [string, GraphAtomOutcome]): void => {
    const node: NodeSingular = cy.getElementById(id);
    const isFile = node.hasClass(ATOM_FILE_CLASS);

    if (!isFile) return;

    node.removeClass(OUTCOME_CLASSES).addClass(outcomeClassOf(outcome));
  };

  cy.batch((): void => Object.entries(outcomes).forEach(markFile));
};

/**
 * The Atomizer groups on `cy`, the core the task canvas shares. Elements are found by `getElementById`, never a `#id`
 * selector, since a file id holds spaces and slashes. `autoungrabify` is the core's own, so package mode shares it.
 */
export const createAtomCanvas = (cy: Core): AtomCanvas => {
  const expand = (
    spec: AtomBoxSpec,
    pkgBoxId: string,
    files: GraphAtomFile[],
    outcomes: Record<string, GraphAtomOutcome>
  ): boolean => {
    const umbrella = cy.getElementById(spec.umbrellaId);
    const boxId = `${ATOM_BOX_PREFIX}${spec.umbrellaId}`;
    const isMissing = umbrella.empty();
    const isTaken = cy.getElementById(boxId).nonempty();
    const isUnusable = isMissing || isTaken;

    if (isUnusable) return false;

    const fileNodes = files.map((file) => fileDefinitionOf(file, boxId, outcomes));

    cy.batch((): void => {
      cy.add(boxDefinitionOf(boxId, pkgBoxId));
      umbrella.move({ parent: boxId });
      cy.add(fileNodes);
    });

    return true;
  };
  const collapse = (umbrellaId: string, pkgBoxId: string): void => {
    const box = cy.getElementById(`${ATOM_BOX_PREFIX}${umbrellaId}`);
    const umbrella = cy.getElementById(umbrellaId);
    const isOpen = box.hasClass(ATOM_BOX_CLASS);

    if (!isOpen) return;

    cy.batch((): void => {
      umbrella.move({ parent: pkgBoxId });
      box.remove();
    });
  };
  const setPositions = (positions: Positions): void => {
    const moveNode = ([id, position]: [string, Position]): void => {
      const node = cy.getElementById(id);
      const isDrawn = node.nonempty();

      if (isDrawn) node.position(position);
    };

    cy.batch((): void => Object.entries(positions).forEach(moveNode));
  };
  const setOutcomes = (outcomes: Record<string, GraphAtomOutcome>): void => setFileOutcomes(cy, outcomes);
  const setGrabbable = (isGrabbable: boolean): void => void cy.autoungrabify(!isGrabbable);
  const isAtomNode = (id: string): boolean => {
    const node = cy.getElementById(id);

    return node.hasClass(ATOM_BOX_CLASS) || node.hasClass(ATOM_FILE_CLASS);
  };
  const canvas: AtomCanvas = { expand, collapse, setPositions, setOutcomes, setGrabbable, isAtomNode };

  return canvas;
};
