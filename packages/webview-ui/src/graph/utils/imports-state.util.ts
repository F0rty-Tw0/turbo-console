import type { EdgeImportsResult } from '../../bridge/common/graph-imports.type.ts';
import type { ImportsState } from '../common/imports-state.type.ts';

const SCANNING: ImportsState = { kind: 'scanning' };

const FAILED: ImportsState = { kind: 'failed' };

/** The state after the page asks for the imports of the shown link: nothing or a failed scan starts a scan, a held list turns stale, a held scan stays (spec D14, T1). */
export const askedImportsOf = (state: ImportsState | null): ImportsState => {
  if (state === null) return SCANNING;

  switch (state.kind) {
    case 'scanning':
      return state;
    case 'failed':
      return SCANNING;
    case 'found':
    case 'none': {
      const stale: ImportsState = { ...state, isRefreshing: true };

      return stale;
    }
  }
};

/** The state after the host answers: a list or an empty answer is fresh, a failed scan is failed (spec D14, T1). */
export const repliedImportsOf = (result: EdgeImportsResult): ImportsState => {
  switch (result.kind) {
    case 'failed':
      return FAILED;
    case 'found':
    case 'none': {
      const fresh: ImportsState = { ...result, isRefreshing: false };

      return fresh;
    }
  }
};
