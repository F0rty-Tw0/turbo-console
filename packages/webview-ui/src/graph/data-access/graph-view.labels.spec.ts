import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { labelPackages } from './graph-view.ts';
import { FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const APPS_NODE = collapsedIdOf('apps');

const PACKAGE_DATA = { id: '@org/x', label: '@org/x' };

const PACKAGE: ElementDefinition = { data: PACKAGE_DATA };

const FOLDER_DATA = { id: APPS_NODE, label: 'apps' };

const FOLDER: ElementDefinition = { data: FOLDER_DATA, classes: FOLDER_NODE_CLASS };

describe('FEATURE: labelPackages', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true, elements: [PACKAGE, FOLDER] });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a drawn package node and a collapsed folder node labelled apps', () => {
    describe('WHEN the labels map @org/x to x', () => {
      beforeEach(() => {
        labelPackages(cy, new Map([['@org/x', 'x']]));
      });

      it('THEN the package reads x', () => {
        const label: unknown = cy.getElementById('@org/x').data('label');

        expect(label).toBe('x');
      });

      it('THEN the folder still reads apps', () => {
        const label: unknown = cy.getElementById(APPS_NODE).data('label');

        expect(label).toBe('apps');
      });
    });

    it('WHEN the labels name a package not drawn THEN no node is added', () => {
      labelPackages(cy, new Map([['ghost', 'g']]));

      expect(cy.nodes()).toHaveLength(2);
    });
  });
});
