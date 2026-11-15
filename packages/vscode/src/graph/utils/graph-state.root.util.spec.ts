import { TurboException } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOfRoot } from './graph-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { GRAPH_MODEL_STUB, GRAPH_SHOWN_STUB, GRAPH_STATE_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const stateOf = (fields: Partial<RootState>): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, ...fields };

  return state;
};
const LOAD_FAILURE = loadFailureOf('load', new TurboException('failed', 'bad json'));
const LOADING: GraphState = { kind: 'loading' };

describe('FEATURE: graph state of a root', () => {
  describe('GIVEN no state', () => {
    it('WHEN built THEN it is loading', () => {
      expect(graphStateOfRoot(undefined, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB)).toStrictEqual(LOADING);
    });
  });

  describe('GIVEN no model and no error', () => {
    it('WHEN built THEN it is loading', () => {
      expect(graphStateOfRoot(stateOf({ model: null }), NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB)).toStrictEqual(LOADING);
    });
  });

  describe('GIVEN no model and a binary failure', () => {
    it('WHEN built THEN it is the binary text', () => {
      const state = graphStateOfRoot(stateOf({ model: null, error: LOAD_FAILURE_STUB }), NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toStrictEqual({ kind: 'error', message: MESSAGE_TEXTS['binary-not-found'] });
    });
  });

  describe('GIVEN no model and a load failure', () => {
    it('WHEN built THEN it is the load text', () => {
      const state = graphStateOfRoot(stateOf({ model: null, error: LOAD_FAILURE }), NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(state).toStrictEqual({ kind: 'error', message: MESSAGE_TEXTS['load-no-model'] });
    });
  });

  describe('GIVEN a model kept after a load failure', () => {
    it('WHEN built THEN it is that model graph', () => {
      const state = graphStateOfRoot(
        stateOf({ model: GRAPH_MODEL_STUB, error: LOAD_FAILURE }),
        NO_LAYOUT_CACHES_STUB,
        GRAPH_SHOWN_STUB
      );

      expect(state).toStrictEqual(GRAPH_STATE_STUB);
    });
  });

  describe('GIVEN a model with a binary failure', () => {
    it('WHEN built THEN it is the binary error', () => {
      const state = graphStateOfRoot(
        stateOf({ model: GRAPH_MODEL_STUB, error: LOAD_FAILURE_STUB }),
        NO_LAYOUT_CACHES_STUB,
        GRAPH_SHOWN_STUB
      );

      expect(state).toStrictEqual({ kind: 'error', message: MESSAGE_TEXTS['binary-not-found'] });
    });
  });
});
