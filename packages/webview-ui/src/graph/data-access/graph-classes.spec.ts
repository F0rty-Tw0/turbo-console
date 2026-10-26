import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setClassesAmong } from './graph-classes.ts';

const STATES = ['selected', 'highlighted', 'dimmed', 'normal'];

const PASS = ['folder-hidden', 'box-collapsed'];

const NODE_DATA = { id: 'a' };

describe('FEATURE: setClassesAmong', () => {
  let cy: Core;
  let node: NodeSingular;
  let classEvents: number;

  beforeEach(() => {
    cy = cytoscape({ headless: true, styleEnabled: true });
    node = cy.add({ data: NODE_DATA, classes: 'normal ghost' });
    classEvents = 0;
    cy.on('class', (): void => {
      classEvents += 1;
    });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a node classed normal and ghost', () => {
    it('WHEN it is set to dimmed among the states THEN it keeps ghost and has dimmed in place of normal', () => {
      setClassesAmong(node, STATES, ['dimmed']);

      expect(node.classes()).toStrictEqual(['ghost', 'dimmed']);
    });

    it('WHEN it is set to normal among the states THEN no class event fires, so Cytoscape does not restyle it', () => {
      setClassesAmong(node, STATES, ['normal']);

      expect(classEvents).toBe(0);
    });

    it('WHEN it is set to none of the states THEN only ghost stays', () => {
      setClassesAmong(node, STATES, []);

      expect(node.classes()).toStrictEqual(['ghost']);
    });
  });

  describe('GIVEN a node classed folder-hidden', () => {
    beforeEach(() => {
      node.classes('folder-hidden');
      classEvents = 0;
    });

    it('WHEN it is set to both pass classes THEN it has both', () => {
      setClassesAmong(node, PASS, PASS);

      expect(node.classes()).toStrictEqual(PASS);
    });

    it('WHEN it is set to folder-hidden alone THEN no class event fires', () => {
      setClassesAmong(node, PASS, ['folder-hidden']);

      expect(classEvents).toBe(0);
    });
  });
});
