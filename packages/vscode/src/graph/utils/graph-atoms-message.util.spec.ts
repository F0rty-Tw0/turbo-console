import type { GraphReady, GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { atomsMessageOf } from './graph-atoms-message.util.ts';
import { graphStateOf } from './graph-state.util.ts';
import type { AtomLookup } from '../../tree/common/atom-view.type.ts';
import { NO_ATOMS } from '../../tree/common/atom.const.ts';
import { umbrellaCounts } from '../../tree/utils/atom-text.util.ts';
import {
  ATOM_FILE_A_TASK_STUB,
  ATOM_FILE_B_TASK_STUB,
  ATOM_UMBRELLA_TASK_STUB,
  GRAPH_ATOM_GROUP_STUB,
  GRAPH_ATOM_LOOKUP_STUB,
  GRAPH_ATOM_MODEL_STUB,
  GRAPH_ATOM_UNLOADED_VIEW_STUB,
  GRAPH_ATOM_VIEW_STUB
} from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_STATE_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const ROOT = '/ws';
const UMBRELLA_ID = ATOM_UMBRELLA_TASK_STUB.id;
const FILE_A = ATOM_FILE_A_TASK_STUB.id;
const FILE_B = ATOM_FILE_B_TASK_STUB.id;
const readyOf = (state: GraphState): GraphReady => {
  if (state.kind !== 'graph') throw new Error(`state is ${state.kind}, not graph`);

  return state;
};
const ATOM_STATE = readyOf(graphStateOf(GRAPH_ATOM_MODEL_STUB, NO_LAYOUT_CACHES_STUB));
const UNLOADED_LOOKUP: AtomLookup = () => GRAPH_ATOM_UNLOADED_VIEW_STUB;
const NO_GROUP_LOOKUP: AtomLookup = () => NO_ATOMS;
const UNLOADED_FILES = { [FILE_A]: 'none', [FILE_B]: 'none' };
const UNLOADED_GROUP = { counts: '2 files', files: UNLOADED_FILES };
const UNLOADED_GROUPS = { [UMBRELLA_ID]: UNLOADED_GROUP };
const UNLOADED_MESSAGE = { type: 'atoms', groups: UNLOADED_GROUPS };
const LOADED_FILES = { [FILE_A]: 'passed', [FILE_B]: 'none' };

describe('FEATURE: atoms message of a graph state', () => {
  describe('GIVEN a state without atom groups', () => {
    it('WHEN the message is built THEN there is none', () => {
      expect(atomsMessageOf(ROOT, GRAPH_STATE_STUB, GRAPH_ATOM_LOOKUP_STUB)).toBeNull();
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN the message is built THEN there is none', () => {
      expect(atomsMessageOf(ROOT, { kind: 'loading' }, GRAPH_ATOM_LOOKUP_STUB)).toBeNull();
    });
  });

  describe('GIVEN a state with an atom group and a settled load', () => {
    it('WHEN the message is built THEN counts are umbrellaCounts verbatim and files map to outcome or none', () => {
      const counts = umbrellaCounts(GRAPH_ATOM_GROUP_STUB, GRAPH_ATOM_VIEW_STUB);

      const group = { counts, files: LOADED_FILES };
      const groups = { [UMBRELLA_ID]: group };

      const message = atomsMessageOf(ROOT, ATOM_STATE, GRAPH_ATOM_LOOKUP_STUB);

      expect(message).toStrictEqual({ type: 'atoms', groups });
    });
  });

  describe('GIVEN a state with an atom group and no load', () => {
    it('WHEN the message is built THEN counts is "2 files" and every file is none', () => {
      expect(atomsMessageOf(ROOT, ATOM_STATE, UNLOADED_LOOKUP)).toStrictEqual(UNLOADED_MESSAGE);
    });
  });

  describe('GIVEN a view that does not know the group', () => {
    it('WHEN the message is built THEN counts is "2 files" and every file is none', () => {
      expect(atomsMessageOf(ROOT, ATOM_STATE, NO_GROUP_LOOKUP)).toStrictEqual(UNLOADED_MESSAGE);
    });
  });

  describe('GIVEN an atom group whose umbrella is not a listed task', () => {
    it('WHEN the message is built THEN that group is left out', () => {
      const unlisted = { ...ATOM_STATE, tasks: GRAPH_STATE_STUB.tasks };

      const noGroups = {};

      expect(atomsMessageOf(ROOT, unlisted, GRAPH_ATOM_LOOKUP_STUB)).toStrictEqual({ type: 'atoms', groups: noGroups });
    });
  });
});
