import type { Mocked } from 'vitest';
import { beforeEach, describe, expect, it } from 'vitest';

import { GraphPredictionPosts } from './graph-prediction-posts.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphShownTaskPackagesMessage } from '../../bridge/common/graph-message.type.ts';
import { bridgeMock } from '../test/mocks/bridge.mock.ts';
import { API_BUILD_STUB, TASK_CHAIN_STUB, WEB_BUILD_STUB } from '../test/stubs/graph-task.stub.ts';

const NAMES: GraphShownTaskPackagesMessage = { type: 'shownTaskPackages', packageNames: ['api', 'web'] };

const WEB_NAMES: GraphShownTaskPackagesMessage = { type: 'shownTaskPackages', packageNames: ['web'] };

describe('FEATURE: GraphPredictionPosts', () => {
  let bridge: Mocked<Bridge>;
  let posts: GraphPredictionPosts;

  beforeEach(() => {
    bridge = bridgeMock();
    posts = new GraphPredictionPosts(bridge);
  });

  describe('GIVEN the toggle on', () => {
    beforeEach(() => {
      posts.shown(true);
    });

    it('WHEN tasks are placed THEN one post names the sorted distinct packages', () => {
      posts.placed([WEB_BUILD_STUB, ...TASK_CHAIN_STUB]);

      expect(bridge.post.mock.calls).toStrictEqual([[NAMES]]);
    });

    it('WHEN no tasks are placed THEN nothing is posted', () => {
      posts.placed([]);

      expect(bridge.post).not.toHaveBeenCalled();
    });

    it('WHEN the same set is placed again THEN nothing more is posted', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.placed([API_BUILD_STUB, WEB_BUILD_STUB]);

      expect(bridge.post).toHaveBeenCalledOnce();
    });

    it('WHEN shown(true) repeats after a post THEN nothing more is posted', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.shown(true);

      expect(bridge.post).toHaveBeenCalledOnce();
    });

    it('WHEN a different package set is placed THEN it posts the new set', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.placed([WEB_BUILD_STUB]);

      expect(bridge.post.mock.calls).toStrictEqual([[NAMES], [WEB_NAMES]]);
    });

    it('WHEN shown(false) then shown(true) follow a post THEN it posts again', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.shown(false);
      posts.shown(true);

      expect(bridge.post.mock.calls).toStrictEqual([[NAMES], [NAMES]]);
    });

    it('WHEN clear() then placed follow a post THEN it posts again', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.clear();
      posts.placed(TASK_CHAIN_STUB);

      expect(bridge.post.mock.calls).toStrictEqual([[NAMES], [NAMES]]);
    });

    it('WHEN clear() follows a post and then shown(true) repeats THEN nothing more is posted', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.clear();
      posts.shown(true);

      expect(bridge.post).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN the toggle off', () => {
    it('WHEN tasks are placed THEN nothing is posted', () => {
      posts.placed(TASK_CHAIN_STUB);

      expect(bridge.post).not.toHaveBeenCalled();
    });

    it('WHEN tasks are placed and then shown(true) arrives THEN the post comes at shown(true)', () => {
      posts.placed(TASK_CHAIN_STUB);
      posts.shown(true);

      expect(bridge.post.mock.calls).toStrictEqual([[NAMES]]);
    });
  });

  describe('GIVEN no placement', () => {
    it('WHEN shown(true) arrives THEN nothing is posted', () => {
      posts.shown(true);

      expect(bridge.post).not.toHaveBeenCalled();
    });
  });
});
