import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import { TASK_CARD_CLASS } from '../common/graph-card.const.ts';
import { PACKAGE_RUN_CLASS, RUN_CLASS_PREFIX, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { FOLDER_NODE_CLASS, NODE_BORDER_PX } from '../common/graph.const.ts';
import { CANVAS_COLORS, CANVAS_FRAME_RGB, CANVAS_SELECTION_FILL_RGB } from '../test/utils/canvas-elements.spec.util.ts';
import { SELECTED_RING, classedNodeOf, ringOf } from '../test/utils/task-ring.spec.util.ts';

const TASK_ID = 'web#build';
const RUNNING = `${RUN_CLASS_PREFIX}running`;
const RUN_RING = [2, NODE_BORDER_PX, CANVAS_FRAME_RGB];

describe('FEATURE: a selected package or collapsed folder with a run state draws one ring in graphStyleOf', () => {
  let cy: Core;
  let web: NodeSingular;
  let apps: NodeSingular;
  let task: NodeSingular;

  beforeEach(() => {
    const webNode = classedNodeOf('web', 'web', '');
    const appsNode = classedNodeOf('apps', 'apps', FOLDER_NODE_CLASS);
    const taskNode = classedNodeOf(TASK_ID, 'build', `${TASK_NODE_CLASS} ${TASK_CARD_CLASS}`);

    cy = cytoscape({ headless: true, styleEnabled: true, elements: [webNode, appsNode, taskNode] });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', true));
    web = cy.getElementById('web');
    apps = cy.getElementById('apps');
    task = cy.getElementById(TASK_ID);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a package node web and a collapsed folder node apps', () => {
    it.each(RUN_STATES)(
      'WHEN web is selected with run-%s and package-run THEN its outline is 2 and its border is the frame',
      (state) => {
        web.addClass(`selected ${RUN_CLASS_PREFIX}${state} ${PACKAGE_RUN_CLASS}`);

        expect(ringOf(web)).toStrictEqual(RUN_RING);
      }
    );

    it('WHEN apps is selected with run-running and package-run THEN the same holds', () => {
      apps.addClass(`selected ${RUNNING} ${PACKAGE_RUN_CLASS}`);

      expect(ringOf(apps)).toStrictEqual(RUN_RING);
    });

    it('WHEN web is selected with no run class THEN the border is the selected ring', () => {
      web.addClass('selected');

      expect(ringOf(web)).toStrictEqual(SELECTED_RING);
    });

    it('WHEN web has run-running and package-run but is not selected THEN outline 2 and the plain border', () => {
      web.addClass(`${RUNNING} ${PACKAGE_RUN_CLASS}`);

      expect(ringOf(web)).toStrictEqual(RUN_RING);
    });

    it('WHEN web is selected with run-running and package-run THEN the selection fill still applies', () => {
      web.addClass(`selected ${RUNNING} ${PACKAGE_RUN_CLASS}`);

      expect(web.style('background-color')).toBe(CANVAS_SELECTION_FILL_RGB);
    });
  });

  describe('GIVEN a task node web#build', () => {
    it('WHEN it is selected with run-running THEN its outline is 0, its border is the selected ring and its bar is running', () => {
      task.addClass(`selected ${RUNNING}`);

      expect(ringOf(task)).toStrictEqual(SELECTED_RING);
      expect(task.style('background-gradient-stop-colors')).toContain('rgb(255,255,0)');
    });
  });
});
