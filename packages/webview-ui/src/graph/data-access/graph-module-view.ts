import type { Core, ElementDefinition, EventObjectNode, NodeSingular } from 'cytoscape';

import { moduleLinkDefinitionOf, unrouteDragged } from './graph-module-links.ts';
import { paintModules } from './graph-module-paint.ts';
import { positionOf } from './graph-place.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { MODULE_BOX_CLASS, MODULE_DIR_CLASS, MODULE_FILE_CLASS, MODULE_STUB_CLASS } from '../common/graph-module.const.ts';
import { TASK_FOLDER_CLASS } from '../common/graph-task.const.ts';
import type { ModuleCanvas, ModuleDrawing, ModuleElementKind } from '../common/module-canvas.type.ts';
import type { ModuleBox, ModuleLeaf, ModuleScene } from '../common/module-scene.type.ts';
import { paintTargetOf } from '../utils/module-painted.util.ts';
import { moduleLeafLabelOf } from '../utils/module-text.util.ts';

type KindClass = [ModuleElementKind, string];

/** A box takes the task folder box's titled solid frame, since modules mode has no DOM header rows. */
const BOX_CLASSES = `${MODULE_BOX_CLASS} ${TASK_FOLDER_CLASS}`;

const LEAF_CLASSES: Record<ModuleLeaf['kind'], string> = { file: MODULE_FILE_CLASS, dir: MODULE_DIR_CLASS, stub: MODULE_STUB_CLASS };

const KIND_CLASSES: KindClass[] = [
  ['box', MODULE_BOX_CLASS],
  ['file', MODULE_FILE_CLASS],
  ['dir', MODULE_DIR_CLASS],
  ['stub', MODULE_STUB_CLASS]
];

/** A box titled with its folder name, at least as wide as that title; the root box has no parent. */
const boxDefinitionOf = (box: ModuleBox, drawing: ModuleDrawing): ElementDefinition => {
  const minWidth = drawing.measures.titleWidthOf(box);
  const own = { id: box.id, label: box.name, title: box.name, minWidth };
  const nested = { ...own, parent: box.parent };
  const data = box.parent === null ? own : nested;
  const definition: ElementDefinition = { data, classes: BOX_CLASSES };

  return definition;
};

const leafDefinitionOf = (leaf: ModuleLeaf, drawing: ModuleDrawing): ElementDefinition => {
  const { width, height } = drawing.measures.sizeOf(leaf);
  const own = { id: leaf.id, label: moduleLeafLabelOf(leaf), width, height };
  const nested = { ...own, parent: leaf.parent };
  const data = leaf.parent === null ? own : nested;
  const position = positionOf(drawing.positions, leaf.id);
  const definition: ElementDefinition = { data, position, classes: LEAF_CLASSES[leaf.kind] };

  return definition;
};

/** Boxes first in pre-order, so each child's parent exists as it is added, then the leaves, then the links. */
const elementsOf = (drawing: ModuleDrawing): ElementDefinition[] => {
  const { boxes, leaves, links } = drawing.scene;
  const boxNodes = boxes.map((box) => boxDefinitionOf(box, drawing));
  const leafNodes = leaves.map((leaf) => leafDefinitionOf(leaf, drawing));
  const edges = links.map((link) => moduleLinkDefinitionOf(link, drawing));

  return [...boxNodes, ...leafNodes, ...edges];
};

const kindOfNode = (node: NodeSingular): ModuleElementKind | null => {
  const hasKindClass = ([, name]: KindClass): boolean => node.hasClass(name);
  const found = KIND_CLASSES.find(hasKindClass);

  return found?.[0] ?? null;
};

const renderedCentreOf = (cy: Core, id: string): Position | null => {
  const node = cy.getElementById(id);
  const isDrawn = node.nonempty();

  if (!isDrawn) return null;

  const { x, y } = node.renderedPosition();
  const centre: Position = { x, y };

  return centre;
};

/** Replaces every element with the scene: its boxes as compounds, its leaves at their laid-out centres, its links on their routes. */
const drawModules = (cy: Core, drawing: ModuleDrawing): void => {
  const elements = elementsOf(drawing);

  cy.resize();
  cy.elements().remove();
  cy.add(elements);
};

/**
 * The card to paint for `chosen` in `scene`: the card that holds it, or `null` when none does or nothing is chosen. With
 * no scene drawn yet, `chosen` itself, which paints nothing on the empty core.
 */
const paintedOf = (chosen: string | null, scene: ModuleScene | null): string | null => {
  if (chosen === null || scene === null) return chosen;

  const target = paintTargetOf(chosen, scene);

  return target;
};

/**
 * The modules graph on `cy`, the core the package and task graphs share; showing it removes what they drew. A drag
 * unroutes module links only while a modules scene is drawn, so the other modes' drags do no work. It keeps the chosen card apart from what
 * it paints, the card that holds it in the scene drawn last: a redraw keeps the choice while a card holds it and paints
 * that card, the folder collapsed over it or the card itself once the folder opens again, so a folder tap never changes
 * the choice; `clear` forgets it and the scene.
 */
export const createModuleCanvas = (cy: Core): ModuleCanvas => {
  let chosen: string | null = null;
  let scene: ModuleScene | null = null;
  const unroute = (event: EventObjectNode): void => {
    if (scene !== null) unrouteDragged(event);
  };

  cy.on('drag', 'node', unroute);

  const paint = (id: string | null): void => {
    const target = paintedOf(id, scene);

    chosen = id;
    paintModules(cy, target);
  };
  const show = (drawing: ModuleDrawing): void => {
    const target = paintedOf(chosen, drawing.scene);

    drawModules(cy, drawing);
    scene = drawing.scene;

    if (target === null) {
      chosen = null;

      return;
    }

    paintModules(cy, target);
  };
  const clear = (): void => {
    chosen = null;
    scene = null;
    cy.elements().remove();
  };
  const kindOf = (id: string): ModuleElementKind | null => kindOfNode(cy.getElementById(id));
  const renderedCentre = (id: string): Position | null => renderedCentreOf(cy, id);
  const canvas: ModuleCanvas = { show, clear, paint, kindOf, renderedCentre };

  return canvas;
};
