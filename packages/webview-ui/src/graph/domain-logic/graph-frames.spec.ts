import { beforeEach, describe, expect, it } from 'vitest';

import { GraphFrames } from './graph-frames.ts';

describe('FEATURE: GraphFrames', () => {
  let clock = 0;
  let frames: GraphFrames;

  beforeEach(() => {
    clock = 0;
    frames = new GraphFrames((): number => clock);
  });

  describe('GIVEN a graph received at 10 with no draw pending', () => {
    it('WHEN a frame renders at 20 THEN no first frame is recorded', () => {
      frames.start(10);
      clock = 20;

      frames.mark();

      expect(frames.firstFrameMs()).toBeNull();
    });
  });

  describe('GIVEN a graph received at 10 with a draw pending', () => {
    beforeEach(() => {
      frames.start(10);
      frames.arm();
    });

    it('WHEN a frame renders at 25 THEN the first frame took 15', () => {
      clock = 25;

      frames.mark();

      expect(frames.firstFrameMs()).toBe(15);
    });

    it('WHEN a second frame renders at 40 THEN the first frame still took 15', () => {
      clock = 25;
      frames.mark();
      clock = 40;

      frames.mark();

      expect(frames.firstFrameMs()).toBe(15);
    });
  });

  describe('GIVEN a graph with a draw pending and no frame yet', () => {
    it('WHEN a new graph is received at 50 and a frame renders at 60 THEN no first frame is recorded', () => {
      frames.start(10);
      frames.arm();
      frames.start(50);
      clock = 60;

      frames.mark();

      expect(frames.firstFrameMs()).toBeNull();
    });
  });

  describe('GIVEN a graph whose first frame was recorded', () => {
    beforeEach(() => {
      frames.start(10);
      frames.arm();
      clock = 25;
      frames.mark();
    });

    it('WHEN a new graph is received at 50 THEN no first frame is recorded', () => {
      frames.start(50);

      expect(frames.firstFrameMs()).toBeNull();
    });

    it('WHEN a new graph is received at 50 THEN it was received at 50', () => {
      frames.start(50);

      expect(frames.receivedAt()).toBe(50);
    });
  });
});
