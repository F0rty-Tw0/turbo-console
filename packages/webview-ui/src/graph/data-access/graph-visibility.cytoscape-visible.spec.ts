import cytoscape from 'cytoscape';
import type { Collection, Core, Css, ElementDefinition, NodeCollection, SingularElementArgument, StylesheetJson } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The prototype every Cytoscape collection shares, where `parents()` lives. */
type AncestorWalker = { parents: () => NodeCollection };

type ParentedNode = {
  readonly id: string;
  readonly parent?: string;
  readonly classes?: string;
};

const SIZED: Css.Node = { width: 20, height: 20 };

const GONE: Css.Node = { display: 'none' };

const GHOST: Css.Node = { visibility: 'hidden' };

const FADED: Css.Node = { opacity: 0 };

const HALF: Css.Node = { opacity: 0.5 };

const STYLE: StylesheetJson = [
  { selector: 'node', style: SIZED },
  { selector: '.gone', style: GONE },
  { selector: '.ghost', style: GHOST },
  { selector: '.faded', style: FADED },
  { selector: '.half', style: HALF }
];

/**
 * `a` and `b` two compounds deep under half-opaque boxes; `c`, `d` and `e` under a `display: none`, a
 * `visibility: hidden` and a transparent box; `h` under a box whose own parent is `display: none`; `f` top level; `g`
 * added with a parent that does not exist, so Cytoscape drops it. Every leaf but `a` links to `a`.
 */
const NODES: ParentedNode[] = [
  { id: 'outer', classes: 'half' },
  { id: 'mid', parent: 'outer', classes: 'half' },
  { id: 'a', parent: 'mid' },
  { id: 'b', parent: 'mid' },
  { id: 'hiddenBox', classes: 'gone' },
  { id: 'c', parent: 'hiddenBox' },
  { id: 'ghostBox', classes: 'ghost' },
  { id: 'd', parent: 'ghostBox' },
  { id: 'fadedBox', classes: 'faded' },
  { id: 'e', parent: 'fadedBox' },
  { id: 'farBox', classes: 'gone' },
  { id: 'nearBox', parent: 'farBox' },
  { id: 'h', parent: 'nearBox' },
  { id: 'f' },
  { id: 'g', parent: 'missing' }
];

const LINKED_TO_A = ['b', 'c', 'd', 'e', 'h', 'f', 'g'];

const nodeOf = ({ classes = '', ...data }: ParentedNode): ElementDefinition => {
  const definition: ElementDefinition = { data, classes };

  return definition;
};

const linkToA = (source: string): ElementDefinition => {
  const data = { id: `${source}-a`, source, target: 'a' };
  const definition: ElementDefinition = { data };

  return definition;
};

const isAncestorWalker = (value: unknown): value is AncestorWalker =>
  typeof value === 'object' && value !== null && 'parents' in value;

const collectionPrototypeOf = (cy: Core): AncestorWalker => {
  const prototype: unknown = Reflect.getPrototypeOf(cy.nodes());

  if (!isAncestorWalker(prototype)) throw new Error('Cytoscape collections have no parents()');

  return prototype;
};

const resolveStyle = (element: SingularElementArgument): void => void element.style('display');

const readOpacity = (element: SingularElementArgument): void => void element.effectiveOpacity();

const idsOf = (elements: Collection): string[] => {
  const ids = elements.map((element: SingularElementArgument): string => element.id());

  return ids.sort();
};

describe('FEATURE: Cytoscape :visible and opacity on nested compounds', () => {
  let cy: Core;

  beforeEach(() => {
    const nodes = NODES.map(nodeOf);
    const links = LINKED_TO_A.map(linkToA);
    const layout = { name: 'grid' };

    cy = cytoscape({ headless: true, styleEnabled: true, layout, style: STYLE, elements: [...nodes, ...links] });
  });

  afterEach(() => {
    cy.destroy();
    vi.restoreAllMocks();
  });

  describe('GIVEN boxes hidden by display, visibility and opacity, near and far up the chain', () => {
    it('WHEN :visible is read THEN it holds the shown boxes, their nodes and the links whose ends take up space', () => {
      const visible = idsOf(cy.elements(':visible'));

      expect(visible).toStrictEqual(['a', 'b', 'b-a', 'd-a', 'e-a', 'f', 'f-a', 'g', 'g-a', 'mid', 'outer']);
    });

    it('WHEN a node two half-opaque boxes deep is read THEN its effective opacity is the product of the chain', () => {
      const opacity = cy.$id('a').effectiveOpacity();

      expect(opacity).toBe(0.25);
    });

    it('WHEN a node under a transparent box is read THEN it is transparent', () => {
      const isTransparent = cy.$id('e').transparent();

      expect(isTransparent).toBe(true);
    });

    it('WHEN a node whose parent does not exist is read THEN no box above it counts', () => {
      const opacity = cy.$id('g').effectiveOpacity();

      expect(opacity).toBe(1);
    });
  });

  describe('GIVEN every style resolved', () => {
    beforeEach(() => {
      // The style flush itself walks ancestors; only the reads after it are the visibility checks' own.
      cy.elements().forEach(resolveStyle);
    });

    it('WHEN :visible is read THEN no element builds its ancestors collection', () => {
      const parents = vi.spyOn(collectionPrototypeOf(cy), 'parents');

      cy.elements(':visible');

      expect(parents).not.toHaveBeenCalled();
    });

    it('WHEN every effective opacity is read THEN no node builds its ancestors collection', () => {
      const parents = vi.spyOn(collectionPrototypeOf(cy), 'parents');

      cy.nodes().forEach(readOpacity);

      expect(parents).not.toHaveBeenCalled();
    });
  });
});
