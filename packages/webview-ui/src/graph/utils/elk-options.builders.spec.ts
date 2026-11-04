import { describe, expect, it } from 'vitest';

import { elkGraphOf } from './elk-graph.util.ts';
import { groupedElkGraphOf } from './elk-grouped-graph.util.ts';
import {
  chainEdgesOf,
  foldersOfPackages,
  optionValuesOf,
  packageNamesOf,
  repeatedOf,
  sizeOf,
  taskGraphOf,
  wrapperOptionsOf
} from '../test/utils/elk-options.spec.util.ts';
import { wrapperIdOf, wrapperIdsOf } from '../test/utils/elk-pack.spec.util.ts';

const THOROUGHNESS = 'elk.layered.thoroughness';

const LAYERING = 'elk.layered.layering.strategy';

/** root, 3 wrappers (the 3 folders are unlinked), 3 folders, 3 packages, 3 Scripts boxes. */
const GROUPED_TASK_BOXES = 13;

/** root, 3 wrappers (the 3 packages are unlinked), 3 packages, 3 Scripts boxes. */
const UNGROUPED_TASK_BOXES = 10;

/** root, 3 wrappers, 3 folders, 3 packages, 1 Scripts box. */
const ONE_SCRIPT_BOXES = 11;

/** The unlinked folders (grouped) or packages (ungrouped) of the generated task graphs: one wrapper each. */
const WRAPPER_COUNT = 3;

describe('FEATURE: the ELK options of every builder (c8)', () => {
  describe('GIVEN packages WHEN elkGraphOf builds', () => {
    it.each([
      [150, '7'],
      [151, '1']
    ])('GIVEN %i packages THEN the root carries thoroughness %s and NETWORK_SIMPLEX', (count, thoroughness) => {
      const names = packageNamesOf(count);

      const graph = elkGraphOf(names, chainEdgesOf(names), sizeOf);

      expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual([thoroughness]);
      expect(optionValuesOf(graph, LAYERING)).toStrictEqual(['NETWORK_SIMPLEX']);
    });
  });

  describe('GIVEN packages in folders WHEN groupedElkGraphOf builds', () => {
    it.each([
      [150, '7'],
      [151, '1']
    ])('GIVEN %i packages THEN root and every folder carry %s and NETWORK_SIMPLEX', (count, thoroughness) => {
      const names = packageNamesOf(count);

      const graph = groupedElkGraphOf(foldersOfPackages(count), chainEdgesOf(names), sizeOf);

      expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(4, thoroughness));
      expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(4, 'NETWORK_SIMPLEX'));
    });
  });

  describe('GIVEN tasks WHEN elkTaskGraphOf builds', () => {
    it.each([
      [150, '7'],
      [151, '1']
    ])(
      'GIVEN %i tasks, grouped, with scripts THEN root, folder, package and Scripts boxes carry %s and LONGEST_PATH',
      (count, thoroughness) => {
        const graph = taskGraphOf(count - 3, 3, true);

        expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(GROUPED_TASK_BOXES, thoroughness));
        expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(GROUPED_TASK_BOXES, 'LONGEST_PATH'));
      }
    );

    it('GIVEN the same tasks ungrouped THEN root, package and Scripts boxes carry NETWORK_SIMPLEX', () => {
      const graph = taskGraphOf(147, 3, false);

      expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(UNGROUPED_TASK_BOXES, '7'));
      expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(UNGROUPED_TASK_BOXES, 'NETWORK_SIMPLEX'));
    });

    it('GIVEN 150 tasks plus one script WHEN built THEN every box carries 1 (the count is the whole graph)', () => {
      const graph = taskGraphOf(150, 1, true);

      expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(ONE_SCRIPT_BOXES, '1'));
    });
  });

  describe('GIVEN unlinked tasks WHEN elkTaskGraphOf packs them into wrappers', () => {
    it.each([
      [150, '7'],
      [151, '1']
    ])('GIVEN %i tasks THEN every wrapper carries thoroughness %s', (count, thoroughness) => {
      const graph = taskGraphOf(count - 3, 3, true);

      expect(wrapperOptionsOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(WRAPPER_COUNT, thoroughness));
    });

    it.each([
      [true, 'LONGEST_PATH', GROUPED_TASK_BOXES],
      [false, 'NETWORK_SIMPLEX', UNGROUPED_TASK_BOXES]
    ])('GIVEN grouped %s THEN the wrappers are numbered and every box carries %s', (grouped, layering, boxes) => {
      const graph = taskGraphOf(147, 3, grouped);

      expect(wrapperIdsOf(graph)).toStrictEqual([wrapperIdOf(0), wrapperIdOf(1), wrapperIdOf(2)]);
      expect(wrapperOptionsOf(graph, LAYERING)).toStrictEqual(repeatedOf(WRAPPER_COUNT, layering));
      expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(boxes, layering));
    });
  });
});
