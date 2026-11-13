import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { selectedCardRunRulesOf } from './graph-task-card-style.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { TASK_CARD_CLASS } from '../common/graph-card.const.ts';
import { TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import {
  CANVAS_CARD_FILL_RGB,
  CANVAS_CARD_FRAME_RGB,
  CANVAS_COLORS,
  CANVAS_SELECTED_RGB,
  CANVAS_SELECTION_FILL_RGB
} from '../test/utils/canvas-elements.spec.util.ts';
import { classedNodeOf, outlineWidthOf } from '../test/utils/task-ring.spec.util.ts';

const CARD_CLASSES = `${TASK_NODE_CLASS} ${TASK_CARD_CLASS}`;

const RUNNING_RGB = 'rgb(255,255,0)';

const FAILED_RGB = 'rgb(255,0,17)';

/** Each run state and its `CANVAS_RUN_COLORS` entry as Cytoscape reports it. */
const RUN_COLOURS: [GraphRunState, string][] = [
  ['running', RUNNING_RGB],
  ['continuous', 'rgb(0,255,34)'],
  ['passed', 'rgb(0,255,17)'],
  ['failed', FAILED_RGB],
  ['stopped', 'rgb(119,119,119)'],
  ['failed-to-start', 'rgb(255,0,34)']
];

const stopsOf = (bar: string, fill: string): string => `${bar} ${bar} ${fill} ${fill}`;

const barOf = (node: NodeSingular): unknown[] => {
  const bar: unknown[] = [
    node.style('background-fill'),
    node.style('background-gradient-direction'),
    node.style('background-gradient-stop-colors'),
    node.style('background-gradient-stop-positions'),
    outlineWidthOf(node)
  ];

  return bar;
};

describe('FEATURE: card colour rules in graphStyleOf', () => {
  let cy: Core;

  const openWith = (colors: ThemeColors): void => {
    const card = classedNodeOf('web#build', 'build', CARD_CLASSES);
    const umbrella = classedNodeOf('web#lint', 'lint', 'task atom-umbrella');
    const webPackage = classedNodeOf('web', 'web', '');

    cy = cytoscape({ headless: true, styleEnabled: true, elements: [card, umbrella, webPackage] });
    cy.style(graphStyleOf(colors, 'sans-serif', false));
  };

  const cardOf = (): NodeSingular => cy.getElementById('web#build');

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the task canvas', () => {
    it('WHEN a card has no run state THEN it is the solid input fill and frame with no outline', () => {
      openWith(CANVAS_COLORS);

      const card = cardOf();
      const look = [card.style('background-fill'), card.style('background-color'), card.style('border-color'), outlineWidthOf(card)];

      expect(look).toStrictEqual(['solid', CANVAS_CARD_FILL_RGB, CANVAS_CARD_FRAME_RGB, 0]);
    });

    it.each(RUN_COLOURS)('WHEN a card is classed run-%s THEN a 3 px top bar of %s over the card fill, no outline', (state, rgb) => {
      openWith(CANVAS_COLORS);
      cardOf().addClass(`run-${state}`);

      expect(barOf(cardOf())).toStrictEqual(['linear-gradient', 'to-bottom', stopsOf(rgb, CANVAS_CARD_FILL_RGB), '0% 5% 5% 100%', 0]);
    });

    it('WHEN a running card is selected THEN the bar stays and the lower part takes the selection fill', () => {
      openWith(CANVAS_COLORS);
      cardOf().addClass('selected run-running');

      expect(cardOf().style('background-gradient-stop-colors')).toBe(stopsOf(RUNNING_RGB, CANVAS_SELECTION_FILL_RGB));
    });

    it('WHEN a selected running card is deselected THEN the lower part is the card fill again', () => {
      openWith(CANVAS_COLORS);
      cardOf().addClass('selected run-running');
      cardOf().removeClass('selected');

      expect(cardOf().style('background-gradient-stop-colors')).toBe(stopsOf(RUNNING_RGB, CANVAS_CARD_FILL_RGB));
    });

    it('WHEN an idle card is selected THEN it is the solid selection fill and the selected border', () => {
      openWith(CANVAS_COLORS);
      cardOf().addClass('selected');

      const card = cardOf();
      const look = [card.style('background-fill'), card.style('background-color'), card.style('border-color')];

      expect(look).toStrictEqual(['solid', CANVAS_SELECTION_FILL_RGB, CANVAS_SELECTED_RGB]);
    });

    it('WHEN an umbrella is failed and a package is failed with its package-run class THEN each keeps the 2 px outline and a solid fill', () => {
      openWith(CANVAS_COLORS);
      cy.getElementById('web#lint').addClass('run-failed');
      cy.getElementById('web').addClass('run-failed package-run');

      const lookOf = (id: string): unknown[] => {
        const node = cy.getElementById(id);
        const look = [outlineWidthOf(node), node.style('outline-color'), node.style('background-fill')];

        return look;
      };
      const looks = [lookOf('web#lint'), lookOf('web')];

      expect(looks).toStrictEqual([
        [2, FAILED_RGB, 'solid'],
        [2, FAILED_RGB, 'solid']
      ]);
    });
  });

  describe('GIVEN a theme with no selection colours', () => {
    const noSelection: ThemeColors = { ...CANVAS_COLORS, selection: null };

    it('WHEN the selected card rules are built THEN there are none', () => {
      expect(selectedCardRunRulesOf(noSelection)).toStrictEqual([]);
    });

    it('WHEN a selected running card is read THEN the lower part is the card fill', () => {
      openWith(noSelection);
      cardOf().addClass('selected run-running');

      expect(cardOf().style('background-gradient-stop-colors')).toBe(stopsOf(RUNNING_RGB, CANVAS_CARD_FILL_RGB));
    });
  });
});
