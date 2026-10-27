import type { ToolGlyph, ToolSpec } from './tool.type.ts';

const ANGULAR_ATTRIBUTION =
  '"Angular" logo by Google, from https://angular.dev/press-kit (via Simple Icons), licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Modified: single-colour version, converted to a font glyph.';
const STORYBOOK_ATTRIBUTION = '"Storybook" logo, Copyright (c) 2017 Storybooks (https://github.com/storybookjs/brand), MIT License';

const ANGULAR_GLYPH: ToolGlyph = { slug: 'angular', char: 0xe001, attribution: ANGULAR_ATTRIBUTION };
const ASTRO_GLYPH: ToolGlyph = { slug: 'astro', char: 0xe002, attribution: null };
const BIOME_GLYPH: ToolGlyph = { slug: 'biome', char: 0xe003, attribution: null };
const CYPRESS_GLYPH: ToolGlyph = { slug: 'cypress', char: 0xe004, attribution: null };
const DOCKER_GLYPH: ToolGlyph = { slug: 'docker', char: 0xe005, attribution: null };
const ESBUILD_GLYPH: ToolGlyph = { slug: 'esbuild', char: 0xe006, attribution: null };
const ESLINT_GLYPH: ToolGlyph = { slug: 'eslint', char: 0xe007, attribution: null };
const JEST_GLYPH: ToolGlyph = { slug: 'jest', char: 0xe008, attribution: null };
const MOCHA_GLYPH: ToolGlyph = { slug: 'mocha', char: 0xe009, attribution: null };
const NEXT_GLYPH: ToolGlyph = { slug: 'nextdotjs', char: 0xe00a, attribution: null };
const NUXT_GLYPH: ToolGlyph = { slug: 'nuxt', char: 0xe00b, attribution: null };
const PRETTIER_GLYPH: ToolGlyph = { slug: 'prettier', char: 0xe00c, attribution: null };
const ROLLUP_GLYPH: ToolGlyph = { slug: 'rollupdotjs', char: 0xe00d, attribution: null };
const STORYBOOK_GLYPH: ToolGlyph = { slug: 'storybook', char: 0xe00e, attribution: STORYBOOK_ATTRIBUTION };
const SVELTE_GLYPH: ToolGlyph = { slug: 'svelte', char: 0xe00f, attribution: null };
const TYPESCRIPT_GLYPH: ToolGlyph = { slug: 'typescript', char: 0xe010, attribution: null };
const VITE_GLYPH: ToolGlyph = { slug: 'vite', char: 0xe011, attribution: null };
const VITEST_GLYPH: ToolGlyph = { slug: 'vitest', char: 0xe012, attribution: null };
const NODE_GLYPH: ToolGlyph = { slug: 'nodedotjs', char: 0xe013, attribution: null };
const NPM_GLYPH: ToolGlyph = { slug: 'npm', char: 0xe014, attribution: null };

const KNOWN_TOOLS: ToolSpec[] = [
  { id: 'angular', title: 'Angular', bins: ['ng'], glyph: ANGULAR_GLYPH },
  { id: 'astro', title: 'Astro', bins: ['astro'], glyph: ASTRO_GLYPH },
  { id: 'biome', title: 'Biome', bins: ['biome'], glyph: BIOME_GLYPH },
  { id: 'cypress', title: 'Cypress', bins: ['cypress'], glyph: CYPRESS_GLYPH },
  { id: 'docker', title: 'Docker', bins: ['docker', 'docker-compose'], glyph: DOCKER_GLYPH },
  { id: 'esbuild', title: 'esbuild', bins: ['esbuild'], glyph: ESBUILD_GLYPH },
  { id: 'eslint', title: 'ESLint', bins: ['eslint'], glyph: ESLINT_GLYPH },
  { id: 'jest', title: 'Jest', bins: ['jest'], glyph: JEST_GLYPH },
  { id: 'mocha', title: 'Mocha', bins: ['mocha'], glyph: MOCHA_GLYPH },
  { id: 'next', title: 'Next.js', bins: ['next'], glyph: NEXT_GLYPH },
  { id: 'nuxt', title: 'Nuxt', bins: ['nuxt', 'nuxi'], glyph: NUXT_GLYPH },
  { id: 'prettier', title: 'Prettier', bins: ['prettier'], glyph: PRETTIER_GLYPH },
  { id: 'rollup', title: 'Rollup', bins: ['rollup'], glyph: ROLLUP_GLYPH },
  { id: 'storybook', title: 'Storybook', bins: ['storybook', 'start-storybook', 'build-storybook'], glyph: STORYBOOK_GLYPH },
  { id: 'svelte', title: 'Svelte', bins: ['svelte-kit', 'svelte-check'], glyph: SVELTE_GLYPH },
  { id: 'typescript', title: 'TypeScript', bins: ['tsc', 'vue-tsc'], glyph: TYPESCRIPT_GLYPH },
  { id: 'vite', title: 'Vite', bins: ['vite'], glyph: VITE_GLYPH },
  { id: 'vitest', title: 'Vitest', bins: ['vitest'], glyph: VITEST_GLYPH },
  { id: 'playwright', title: 'Playwright', bins: ['playwright'], glyph: null }
];

/** The runtime and the manager that run other tools: a command shows one only when it reaches no known tool. */
const FALLBACK_TOOLS: ToolSpec[] = [
  { id: 'node', title: 'Node.js', bins: ['node'], glyph: NODE_GLYPH },
  { id: 'npm', title: 'npm', bins: ['npm'], glyph: NPM_GLYPH }
];

/**
 * Spec 1c-c §4.1: the single source for detection, the icon font, `contributes.icons` and the notice. Ids and code
 * points are append-only (a removed tool leaves a gap); every bin appears once.
 */
export const TOOLS: ToolSpec[] = [...KNOWN_TOOLS, ...FALLBACK_TOOLS];

const TOOL_BIN_ENTRIES: [string, ToolSpec][] = KNOWN_TOOLS.flatMap((tool) => tool.bins.map((bin): [string, ToolSpec] => [bin, tool]));
const FALLBACK_BIN_ENTRIES: [string, ToolSpec][] = FALLBACK_TOOLS.flatMap((tool) =>
  tool.bins.map((bin): [string, ToolSpec] => [bin, tool])
);

/** A binary name → its known tool row. */
export const TOOL_BY_BIN: ReadonlyMap<string, ToolSpec> = new Map(TOOL_BIN_ENTRIES);

/** A binary name → its fallback tool row (`node`, `npm`). */
export const FALLBACK_TOOL_BY_BIN: ReadonlyMap<string, ToolSpec> = new Map(FALLBACK_BIN_ENTRIES);
