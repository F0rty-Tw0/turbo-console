import type { EdgeImportsResult } from '../../bridge/common/graph-imports.type.ts';

type ResultOf<Kind extends EdgeImportsResult['kind']> = Extract<EdgeImportsResult, Record<'kind', Kind>>;

type ImportsScanning = { readonly kind: 'scanning' };

type ImportsStale = { readonly isRefreshing: boolean };

/** The imports of the shown link (spec D14, T1): asked and not yet answered, an answer, or a failed scan; `isRefreshing` marks a list asked for again. */
export type ImportsState =
  ImportsScanning | (ResultOf<'found'> & ImportsStale) | (ResultOf<'none'> & ImportsStale) | ResultOf<'failed'>;
