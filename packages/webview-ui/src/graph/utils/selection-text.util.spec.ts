import { describe, expect, it } from 'vitest';

import { selectionText } from './selection-text.util.ts';
import type { Closure } from '../common/closure.type.ts';

const THREE = new Set(['a', 'b', 'c']);

const FIVE = new Set(['d', 'e', 'f', 'g', 'h']);

const EMPTY = new Set<string>();

describe('FEATURE: selectionText', () => {
  describe('GIVEN a selected package', () => {
    it('WHEN its closure has 3 dependencies and 5 dependents THEN the text names both counts', () => {
      const closure: Closure = { dependencies: THREE, dependents: FIVE };

      const text = selectionText('web', closure);

      expect(text).toBe('web: 3 dependencies, 5 dependents');
    });

    it('WHEN its closure is empty THEN the counts are 0 with no pluralisation change', () => {
      const closure: Closure = { dependencies: EMPTY, dependents: EMPTY };

      const text = selectionText('web', closure);

      expect(text).toBe('web: 0 dependencies, 0 dependents');
    });
  });

  it('GIVEN no selection WHEN the text is built THEN it is empty', () => {
    const text = selectionText(null, null);

    expect(text).toBe('');
  });
});
