import { describe, expect, it } from 'vitest';

import { packageGraphSchema } from './package-graph.schema.ts';
import { PACKAGE_GRAPH_QUERY } from './turbo-query.const.ts';

const NO_ITEMS = { items: [] };

const ROOT = { name: '//', path: '', tags: [], directDependencies: NO_ITEMS, tasks: NO_ITEMS };

const GRAPH = { nodes: NO_ITEMS, edges: NO_ITEMS };

const outputOf = (root: unknown): unknown => {
  const data = { packageGraph: GRAPH, root };
  const output = { data };

  return output;
};

const DATA_WITHOUT_ROOT = { packageGraph: GRAPH };

const OUTPUT_WITHOUT_ROOT = { data: DATA_WITHOUT_ROOT };

describe('FEATURE: package graph schema root package', () => {
  describe('GIVEN output whose root is null', () => {
    it('WHEN parsed THEN it parses and keeps the null', () => {
      const parsed = packageGraphSchema.parse(outputOf(null));

      expect(parsed.data.root).toBeNull();
    });
  });

  describe('GIVEN output whose root is a package', () => {
    it('WHEN parsed THEN it parses with its tasks', () => {
      const parsed = packageGraphSchema.parse(outputOf(ROOT));

      expect(parsed.data.root?.name).toBe('//');
    });
  });

  describe('GIVEN output without the root key', () => {
    it('WHEN parsed THEN it fails: root is nullable, never optional', () => {
      const parsed = packageGraphSchema.safeParse(OUTPUT_WITHOUT_ROOT);

      expect(parsed.success).toBe(false);
    });
  });

  describe('GIVEN the package graph query', () => {
    it('WHEN read THEN it asks for the root package', () => {
      expect(PACKAGE_GRAPH_QUERY).toContain('root: package(name: "//")');
    });
  });
});
