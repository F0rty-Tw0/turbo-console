import { describe, expect, it } from 'vitest';

import { wheelInitOf } from './wheel-init.util.ts';

describe('FEATURE: wheelInitOf', () => {
  it('GIVEN a wheel over a widget WHEN its init is built THEN it copies the deltas, mode, points and modifiers and bubbles', () => {
    const event = {
      deltaX: 1,
      deltaY: -100,
      deltaZ: 2,
      deltaMode: 1,
      clientX: 30,
      clientY: 40,
      screenX: 130,
      screenY: 140,
      ctrlKey: true,
      shiftKey: false,
      altKey: true,
      metaKey: false
    };

    const init = wheelInitOf(event);

    expect(init).toStrictEqual({ ...event, bubbles: true, cancelable: true });
  });
});
