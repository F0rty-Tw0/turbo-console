import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import { HOST_GRAPH_STUB, HOST_PACKAGES_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { ROUTES_STUB } from '../test/stubs/layout.stub.ts';
import { graphWithTaskOf, stateMessageOf, without } from '../test/utils/graph-host-message.spec.util.ts';

describe('FEATURE: graph host message, new state fields', () => {
  describe('GIVEN a state message with a script task', () => {
    it('WHEN checked THEN it is accepted', () => {
      expect(isGraphHostMessage(graphWithTaskOf({ isTurboTask: false }))).toBe(true);
    });
  });

  describe.each([
    ['a task with no isTurboTask', graphWithTaskOf({ isTurboTask: undefined })],
    ['a task with a numeric isTurboTask', graphWithTaskOf({ isTurboTask: 1 })]
  ])('GIVEN a state message with %s', (_label, message) => {
    it('WHEN checked THEN it is rejected', () => {
      expect(isGraphHostMessage(message)).toBe(false);
    });
  });
});

describe('FEATURE: graph host message, package bareName', () => {
  describe.each([
    ['a package with no bareName', [{ ...HOST_PACKAGES_STUB[0], bareName: undefined }]],
    ['a package with a numeric bareName', [{ ...HOST_PACKAGES_STUB[0], bareName: 5 }]]
  ])('GIVEN a state message with %s', (_label, packages) => {
    it('WHEN checked THEN it is rejected', () => {
      expect(isGraphHostMessage(stateMessageOf({ ...HOST_GRAPH_STUB, packages }))).toBe(false);
    });
  });
});

describe('FEATURE: graph host message, route fields', () => {
  describe.each([
    ['routes missing', without(HOST_GRAPH_STUB, 'routes')],
    ['folderRoutes missing', without(HOST_GRAPH_STUB, 'folderRoutes')],
    ['routes a string', { ...HOST_GRAPH_STUB, routes: 'x' }],
    ['folderRoutes a number', { ...HOST_GRAPH_STUB, folderRoutes: 1 }]
  ])('GIVEN a state with %s', (_label, state) => {
    it('WHEN checked THEN it is rejected', () => {
      expect(isGraphHostMessage(stateMessageOf(state))).toBe(false);
    });
  });

  describe.each([
    [null, null],
    [{}, null],
    [null, {}],
    [ROUTES_STUB, ROUTES_STUB]
  ])('GIVEN routes %j and folderRoutes %j', (routes, folderRoutes) => {
    it('WHEN checked THEN it is accepted', () => {
      expect(isGraphHostMessage(stateMessageOf({ ...HOST_GRAPH_STUB, routes, folderRoutes }))).toBe(true);
    });
  });
});

describe('FEATURE: graph host message, shown toggles', () => {
  describe.each([
    ['scopeShown missing', without(HOST_GRAPH_STUB, 'scopeShown')],
    ['scriptsShown missing', without(HOST_GRAPH_STUB, 'scriptsShown')],
    ['scopeShown a string', { ...HOST_GRAPH_STUB, scopeShown: 'yes' }],
    ['scriptsShown a number', { ...HOST_GRAPH_STUB, scriptsShown: 1 }],
    ['predictionShown missing', without(HOST_GRAPH_STUB, 'predictionShown')],
    ['predictionShown a string', { ...HOST_GRAPH_STUB, predictionShown: 'yes' }],
    ['affectedShown missing', without(HOST_GRAPH_STUB, 'affectedShown')],
    ['affectedShown a string', { ...HOST_GRAPH_STUB, affectedShown: 'yes' }]
  ])('GIVEN a state with %s', (_label, state) => {
    it('WHEN checked THEN it is rejected', () => {
      expect(isGraphHostMessage(stateMessageOf(state))).toBe(false);
    });
  });

  describe('GIVEN both flags false', () => {
    it('WHEN checked THEN it is accepted', () => {
      expect(
        isGraphHostMessage(
          stateMessageOf({ ...HOST_GRAPH_STUB, scopeShown: false, scriptsShown: false, predictionShown: false, affectedShown: false })
        )
      ).toBe(true);
    });
  });

  describe('GIVEN both flags true', () => {
    it('WHEN checked THEN it is accepted', () => {
      expect(
        isGraphHostMessage(
          stateMessageOf({ ...HOST_GRAPH_STUB, scopeShown: true, scriptsShown: true, predictionShown: true, affectedShown: true })
        )
      ).toBe(true);
    });
  });
});
