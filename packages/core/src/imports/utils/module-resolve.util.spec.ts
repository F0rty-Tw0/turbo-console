import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveSpecifierOf } from './module-resolve.util.ts';
import type { TsconfigPaths } from '../common/import-scan.type.ts';
import type { ModuleResolveContext, ModuleTarget, WorkspaceTarget } from '../common/module-graph.type.ts';
import { A_DIR, Y_DIR } from '../test/common/module-dirs.const.ts';
import { contextOf, targetOf } from '../test/utils/module-context.spec.util.ts';

type ResolveRow = {
  readonly label: string;
  readonly walked: string[];
  readonly specifier: string;
  readonly fromDir: string;
  readonly patch: Partial<ModuleResolveContext>;
  readonly target: ModuleTarget;
};

const SRC_DIR = join(A_DIR, 'src');
const LIB_DIR = join(A_DIR, 'src/lib');
const UNRESOLVED: ModuleTarget = { kind: 'unresolved' };
const EXTERNAL: ModuleTarget = { kind: 'external' };
const ASSETS: ModuleTarget = { kind: 'assets' };
const SELF: ModuleTarget = { kind: 'self' };
const B_TARGET: WorkspaceTarget = { name: '@s/b', names: ['@s/b', 'b-alias'], dir: Y_DIR };

const fileOf = (file: string): ModuleTarget => {
  const target: ModuleTarget = { kind: 'file', file };

  return target;
};

const stubOf = (name: string): ModuleTarget => {
  const target: ModuleTarget = { kind: 'stub', name };

  return target;
};

const aliasedBy = (paths: Record<string, string[]>): Partial<ModuleResolveContext> => {
  const tsconfigPaths: TsconfigPaths = { baseUrl: A_DIR, paths };
  const patch: Partial<ModuleResolveContext> = { tsconfigPaths };

  return patch;
};

const SIBLING_Y: Partial<ModuleResolveContext> = { others: [targetOf(Y_DIR, 'y')] };
const TILDE = aliasedBy({ '~/*': ['src/*'] });
const TILDE_SRC_LIB = aliasedBy({ '~/*': ['src/*', 'lib/*'] });
const TILDE_LIB_SRC = aliasedBy({ '~/*': ['lib/*', 'src/*'] });
const TILDE_CSS_SRC = aliasedBy({ '~/*': ['styles/*.css', 'src/*'] });
const AT_Y = aliasedBy({ '@y/*': ['../../y/src/*'] });
const ALIAS_INTO_Y: Partial<ModuleResolveContext> = { ...AT_Y, ...SIBLING_Y };
const WORKSPACE_B: Partial<ModuleResolveContext> = { others: [B_TARGET] };
const NO_SELF: Partial<ModuleResolveContext> = { selfName: '' };
const STAR = aliasedBy({ '*': ['types/*'] });
const STAR_WORKSPACE_B: Partial<ModuleResolveContext> = { ...STAR, ...WORKSPACE_B };
const AT_S = aliasedBy({ '@s/*': ['src/*'] });
const AT_S_WORKSPACE_B: Partial<ModuleResolveContext> = { ...AT_S, ...WORKSPACE_B };

const ROWS: ResolveRow[] = [
  { label: 'a `./` path', walked: ['src/b.ts'], specifier: './b.js', fromDir: SRC_DIR, patch: {}, target: fileOf('src/b.ts') },
  {
    label: '`.` (PATHS_SKIPPED)',
    walked: ['src/index.ts'],
    specifier: '.',
    fromDir: SRC_DIR,
    patch: {},
    target: fileOf('src/index.ts')
  },
  {
    label: '`..` from `src/lib` (PATHS_SKIPPED)',
    walked: ['src/index.ts'],
    specifier: '..',
    fromDir: LIB_DIR,
    patch: {},
    target: fileOf('src/index.ts')
  },
  {
    label: 'a `/`-absolute path',
    walked: ['src/b.ts'],
    specifier: '/ws/x/a/src/b',
    fromDir: SRC_DIR,
    patch: {},
    target: fileOf('src/b.ts')
  },
  {
    label: 'a relative path into a sibling',
    walked: [],
    specifier: '../../../y/src/i',
    fromDir: SRC_DIR,
    patch: SIBLING_Y,
    target: stubOf('y')
  },
  { label: 'an alias hit', walked: ['src/b.ts'], specifier: '~/b', fromDir: SRC_DIR, patch: TILDE, target: fileOf('src/b.ts') },
  { label: 'an alias miss', walked: [], specifier: '~/zz', fromDir: SRC_DIR, patch: TILDE, target: UNRESOLVED },
  {
    label: 'an alias that only reaches a `.css` file',
    walked: [],
    specifier: '~/s.css',
    fromDir: SRC_DIR,
    patch: TILDE,
    target: ASSETS
  },
  {
    label: 'two alias targets that both exist',
    walked: ['src/b.ts', 'lib/b.ts'],
    specifier: '~/b',
    fromDir: SRC_DIR,
    patch: TILDE_SRC_LIB,
    target: fileOf('src/b.ts')
  },
  {
    label: 'a first target that misses, a second that places',
    walked: ['src/b.ts'],
    specifier: '~/b',
    fromDir: SRC_DIR,
    patch: TILDE_LIB_SRC,
    target: fileOf('src/b.ts')
  },
  {
    label: "no target places; the first target's bucket wins",
    walked: [],
    specifier: '~/x',
    fromDir: SRC_DIR,
    patch: TILDE_CSS_SRC,
    target: ASSETS
  },
  {
    label: 'an alias into a workspace package',
    walked: [],
    specifier: '@y/i',
    fromDir: SRC_DIR,
    patch: ALIAS_INTO_Y,
    target: stubOf('y')
  },
  {
    label: 'a `*` catch-all that misses on a workspace name',
    walked: [],
    specifier: '@s/b/sub',
    fromDir: SRC_DIR,
    patch: STAR_WORKSPACE_B,
    target: stubOf('@s/b')
  },
  {
    label: 'a `*` catch-all that misses on an npm name',
    walked: [],
    specifier: 'react',
    fromDir: SRC_DIR,
    patch: STAR,
    target: EXTERNAL
  },
  {
    label: "a `*` catch-all that misses on the package's own name",
    walked: [],
    specifier: '@s/a/x',
    fromDir: SRC_DIR,
    patch: STAR,
    target: SELF
  },
  {
    label: 'a `*` catch-all that hits',
    walked: ['types/react.ts'],
    specifier: 'react',
    fromDir: SRC_DIR,
    patch: STAR,
    target: fileOf('types/react.ts')
  },
  {
    label: 'a prefixed alias that misses on a workspace name',
    walked: [],
    specifier: '@s/b',
    fromDir: SRC_DIR,
    patch: AT_S_WORKSPACE_B,
    target: stubOf('@s/b')
  },
  {
    label: 'no tsconfig paths, so the alias step is skipped',
    walked: ['src/b.ts'],
    specifier: '~/b',
    fromDir: SRC_DIR,
    patch: {},
    target: EXTERNAL
  },
  { label: 'a workspace name', walked: [], specifier: '@s/b', fromDir: SRC_DIR, patch: WORKSPACE_B, target: stubOf('@s/b') },
  { label: 'a workspace subpath', walked: [], specifier: '@s/b/sub', fromDir: SRC_DIR, patch: WORKSPACE_B, target: stubOf('@s/b') },
  { label: 'a manifest alias key', walked: [], specifier: 'b-alias/x', fromDir: SRC_DIR, patch: WORKSPACE_B, target: stubOf('@s/b') },
  { label: 'a longer name', walked: [], specifier: '@s/bx', fromDir: SRC_DIR, patch: WORKSPACE_B, target: EXTERNAL },
  { label: "the package's own name", walked: [], specifier: '@s/a/x', fromDir: SRC_DIR, patch: {}, target: SELF },
  { label: 'an empty self name', walked: [], specifier: 'react', fromDir: SRC_DIR, patch: NO_SELF, target: EXTERNAL },
  { label: 'an npm name', walked: [], specifier: 'react', fromDir: SRC_DIR, patch: {}, target: EXTERNAL }
];

describe('FEATURE: resolve an import specifier', () => {
  describe('GIVEN package @s/a at /ws/x/a importing from src', () => {
    it.each(ROWS)('WHEN $label THEN the specifier resolves', ({ walked, specifier, fromDir, patch, target }) => {
      const context = contextOf(walked, patch);

      const resolved = resolveSpecifierOf(specifier, fromDir, context);

      expect(resolved).toStrictEqual(target);
    });
  });
});
