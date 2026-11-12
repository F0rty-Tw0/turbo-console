import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { labelPackages, packageWritersOf } from './graph-package-nodes.ts';
import { FOLDER_NODE_CLASS } from '../common/graph.const.ts';
import { lengthSizeOf } from '../test/utils/length-size.spec.util.ts';
import { collapsedIdOf } from '../utils/folder-id.util.ts';

const APPS_NODE = collapsedIdOf('apps');

const ROOT_DATA = { id: '//', label: '//', width: 20, height: 32 };

const ROOT: ElementDefinition = { data: ROOT_DATA };

const PACKAGE_DATA = { id: '@org/x', label: '@org/x', width: 0, height: 32 };

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
        labelPackages(cy, new Map([['@org/x', 'x']]), lengthSizeOf);
      });

      it('THEN the package reads x', () => {
        const label: unknown = cy.getElementById('@org/x').data('label');

        expect(label).toBe('x');
      });

      it('THEN the package is as wide as its name, not as x', () => {
        const width: unknown = cy.getElementById('@org/x').data('width');

        expect(width).toBe(60);
      });

      it('THEN the folder still reads apps', () => {
        const label: unknown = cy.getElementById(APPS_NODE).data('label');

        expect(label).toBe('apps');
      });
    });

    it('WHEN the labels name a package not drawn THEN no node is added', () => {
      labelPackages(cy, new Map([['ghost', 'g']]), lengthSizeOf);

      expect(cy.nodes()).toHaveLength(2);
    });
  });

  describe('GIVEN the drawn root // node', () => {
    beforeEach(() => {
      cy.add(ROOT);
    });

    it('WHEN the labels map // to root-fixture THEN its box is as wide as root-fixture', () => {
      labelPackages(cy, new Map([['//', 'root-fixture']]), lengthSizeOf);

      const width: unknown = cy.getElementById('//').data('width');

      expect(width).toBe(120);
    });
  });
});

describe('FEATURE: packageWritersOf', () => {
  let cy: Core;

  beforeEach(() => {
    cy = cytoscape({ headless: true });
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the root // drawn by setGraph with a sizer 10 px per character', () => {
    it('WHEN its label root-fixture is set THEN the node reads root-fixture 120 px wide', () => {
      const writers = packageWritersOf(cy);

      writers.setGraph(['//'], [], {}, lengthSizeOf);

      writers.setLabels(new Map([['//', 'root-fixture']]));

      const data: unknown = cy.getElementById('//').data();

      expect(data).toMatchObject({ label: 'root-fixture', width: 120 });
    });
  });

  it('GIVEN no graph drawn WHEN labels are set THEN no node is added', () => {
    const writers = packageWritersOf(cy);

    writers.setLabels(new Map([['//', 'root-fixture']]));

    expect(cy.nodes()).toHaveLength(0);
  });
});
