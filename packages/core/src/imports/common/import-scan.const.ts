export const SOURCE_SUFFIXES: string[] = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

export const DECLARATION_SUFFIXES: string[] = ['.d.ts', '.d.mts', '.d.cts'];

/** Skipped directly under A's dir only; deeper dirs of these names are walked (T3). */
export const TOP_BUILD_DIRS = new Set(['dist', 'build', 'out', 'coverage', 'storybook-static']);

export const NODE_MODULES_DIR = 'node_modules';
