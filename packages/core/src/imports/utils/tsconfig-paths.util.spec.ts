import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { tsconfigPathsOf } from './tsconfig-paths.util.ts';
import type { TsconfigPaths } from '../common/import-scan.type.ts';
import type { TsconfigFile, TsconfigLink } from '../common/tsconfig.type.ts';

type PathsRow = {
  readonly label: string;
  readonly links: TsconfigLink[];
  readonly expected: TsconfigPaths | null;
};

const WS = resolve('/ws');

const A_DIR = resolve('/ws/packages/a');

const PATHS_1: Record<string, string[]> = { '@b/*': ['packages/b/src/*'] };

const PATHS_2: Record<string, string[]> = { '@c': ['packages/c/index.ts'] };

const linkOf = (dir: string, patch: Partial<TsconfigFile>): TsconfigLink => {
  const file: TsconfigFile = { extends: [], paths: undefined, baseUrl: undefined, ...patch };
  const link: TsconfigLink = { dir, file };

  return link;
};

const effectiveOf = (baseUrl: string, paths: Record<string, string[]>): TsconfigPaths => {
  const effective: TsconfigPaths = { baseUrl, paths };

  return effective;
};

const rows: PathsRow[] = [
  { label: 'no links', links: [], expected: null },
  {
    label: 'A sets paths',
    links: [linkOf(A_DIR, { paths: PATHS_1 })],
    expected: effectiveOf(A_DIR, PATHS_1)
  },
  {
    label: 'A and its base both set paths',
    links: [linkOf(A_DIR, { paths: PATHS_1 }), linkOf(WS, { paths: PATHS_2 })],
    expected: effectiveOf(A_DIR, PATHS_1)
  },
  {
    label: 'only the base sets paths',
    links: [linkOf(A_DIR, {}), linkOf(WS, { paths: PATHS_2 })],
    expected: effectiveOf(WS, PATHS_2)
  },
  {
    label: 'A sets paths and the base sets baseUrl',
    links: [linkOf(A_DIR, { paths: PATHS_1 }), linkOf(WS, { baseUrl: './src' })],
    expected: effectiveOf(resolve(WS, 'src'), PATHS_1)
  },
  {
    label: 'A sets baseUrl and the base sets paths',
    links: [linkOf(A_DIR, { baseUrl: '.' }), linkOf(WS, { paths: PATHS_2 })],
    expected: effectiveOf(A_DIR, PATHS_2)
  },
  {
    label: 'A sets paths to null and the base sets paths',
    links: [linkOf(A_DIR, { paths: null }), linkOf(WS, { paths: PATHS_2 })],
    expected: null
  },
  {
    label: 'A sets paths to an empty record and the base sets paths',
    links: [linkOf(A_DIR, { paths: {} }), linkOf(WS, { paths: PATHS_2 })],
    expected: null
  },
  {
    label: 'A sets a baseUrl above itself beside its paths',
    links: [linkOf(A_DIR, { baseUrl: '../..', paths: PATHS_1 })],
    expected: effectiveOf(resolve(A_DIR, '../..'), PATHS_1)
  }
];

describe('FEATURE: effective tsconfig paths of a chain', () => {
  describe('GIVEN a chain of links, nearest first', () => {
    it.each(rows)('WHEN $label THEN the effective paths are $expected', ({ links, expected }) => {
      const effective = tsconfigPathsOf(links);

      expect(effective).toStrictEqual(expected);
    });
  });
});
