import type { Core } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { createFoldersView } from './graph-folders-view.ts';
import { setGhosts } from './graph-ghosts.ts';
import { showOnly } from './graph-visibility.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { FoldersView } from '../common/graph-page.type.ts';
import type { ElementSnapshot, FolderStep } from '../test/common/folder-history.type.ts';
import { boardsCyMock } from '../test/mocks/folder-boards.mock.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { elementSnapshotsOf, folderStepsOf } from '../test/utils/folder-history.spec.util.ts';

const STEP_COUNT = 60;

const SEEDS = [{ seed: 1234 }, { seed: 98765 }];

/** Each seed builds 61 styled Cytoscapes: under 1 s alone, but over the 5 s default on a CI runner busy with the whole suite. */
const SEED_TIMEOUT_MS = 30_000;

const labelOf = (folder: string): string => `L:${folder}`;

/** Places the packages, shows only the visible ones, draws the ghosts and runs the folder pass, as the page does. */
const runStep = (cy: Core, view: FoldersView, step: FolderStep): void => {
  const visible = new Set(step.visible);
  const marks: GhostMarks = { nodes: step.ghosts, edges: [] };
  const scene = boardsSceneOf(step.collapsed, step.visible, step.ghosts);
  const place = ([name, position]: [string, Position]): void => void cy.getElementById(name).position(position);

  Object.entries(step.positions).forEach(place);
  showOnly(cy, visible);
  setGhosts(cy, marks, visible);
  view.show(scene, labelOf);
};

const freshSnapshotOf = (step: FolderStep): ElementSnapshot[] => {
  const cy = boardsCyMock();

  runStep(cy, createFoldersView(cy), step);

  const snapshot = elementSnapshotsOf(cy);

  cy.destroy();

  return snapshot;
};

const liveSnapshotsOf = (steps: FolderStep[]): ElementSnapshot[][] => {
  const cy = boardsCyMock();
  const view = createFoldersView(cy);
  const runAndSnapshot = (step: FolderStep): ElementSnapshot[] => {
    runStep(cy, view, step);

    return elementSnapshotsOf(cy);
  };
  const snapshots = steps.map(runAndSnapshot);

  cy.destroy();

  return snapshots;
};

describe('FEATURE: createFoldersView history', () => {
  describe('GIVEN 60 seeded random steps that move packages, then filter, ghost and collapse', () => {
    it.each(SEEDS)(
      'WHEN the steps of seed $seed run on one Cytoscape THEN each leaves it as a fresh Cytoscape given only that step',
      ({ seed }) => {
        const steps = folderStepsOf(seed, STEP_COUNT);
        const fresh = steps.map(freshSnapshotOf);

        const live = liveSnapshotsOf(steps);

        expect(live).toStrictEqual(fresh);
      },
      SEED_TIMEOUT_MS
    );
  });
});
