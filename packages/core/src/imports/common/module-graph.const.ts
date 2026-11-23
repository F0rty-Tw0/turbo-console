/** Extensions of non-source files an import can name; a miss with one of these lands in the `assets` bucket. */
export const ASSET_SUFFIXES: string[] = [
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.html',
  '.md',
  '.txt',
  '.wasm',
  '.woff',
  '.woff2'
];

/** The TS sources a JS import extension stands for, tried in order before the specifier as written. */
export const JS_EXTENSION_SWAPS: ReadonlyMap<string, string[]> = new Map([
  ['.js', ['.ts', '.tsx']],
  ['.jsx', ['.tsx']],
  ['.mjs', ['.mts']],
  ['.cjs', ['.cts']]
]);
