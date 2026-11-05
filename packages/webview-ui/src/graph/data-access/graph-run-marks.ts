import type { Core, NodeSingular } from 'cytoscape';

import { packageNodes } from './graph-boxes.ts';
import { setClassesAmong } from './graph-classes.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { PackageRuns } from '../common/graph-page.type.ts';
import { PACKAGE_RUN_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { folderOfElementId } from '../utils/folder-id.util.ts';
import { folderRunOf, runClassOf, runMarkClassesOf } from '../utils/package-run.util.ts';

const RUN_CLASS_NAMES: string[] = RUN_STATES.map(runClassOf);

const MARK_CLASSES: string[] = [...RUN_CLASS_NAMES, PACKAGE_RUN_CLASS];

/** Gives each package node the run class of its package and takes it from the rest; a repeated map writes nothing (spec D13). */
export const markPackageRuns = (cy: Core, runs: PackageRuns): void => {
  const mark = (node: NodeSingular): void => {
    const state = runs.get(node.id()) ?? null;

    setClassesAmong(node, MARK_CLASSES, runMarkClassesOf(state));
  };

  cy.batch((): void => void packageNodes(cy).forEach(mark));
};

/** Gives each collapsed folder node the strongest run class among its members; expanded boxes are never marked. */
export const markFolderRuns = (cy: Core, members: ReadonlyMap<string, string[]>, runs: PackageRuns): void => {
  const mark = (node: NodeSingular): void => {
    const folder = folderOfElementId(node.id());

    if (folder === null) return;

    const state = folderRunOf(runs, members.get(folder) ?? []);

    setClassesAmong(node, MARK_CLASSES, runMarkClassesOf(state));
  };

  cy.batch((): void => void cy.nodes(`.${FOLDER_NODE_CLASS}`).forEach(mark));
};
