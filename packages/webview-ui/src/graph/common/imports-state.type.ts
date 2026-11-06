import type { EdgeImportsResult } from '../../bridge/common/graph-imports.type.ts';

type ResultOf<TKind extends EdgeImportsResult['kind']> = Extract<EdgeImportsResult, Record<'kind', TKind>>;

type ImportsScanning = { readonly kind: 'scanning' };

type ImportsRefresh = { readonly isRefreshing: boolean };

/** The imports of the shown link (spec D14, T1): asked and not yet answered, an answer, or a failed scan; `isRefreshing` marks a list asked for again. */
export type ImportsState =
  ImportsScanning | (ResultOf<'found'> & ImportsRefresh) | (ResultOf<'none'> & ImportsRefresh) | ResultOf<'failed'>;
