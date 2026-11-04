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
  wrapperOptionValuesOf
} from '../test/utils/elk-options.spec.util.ts';
import { wrapperIdOf } from '../test/utils/elk-pack.spec.util.ts';
import { childrenOf, idsOf } from '../test/utils/folder-boards.spec.util.ts';

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

const THOROUGHNESS_ROWS: [number, string][] = [
  [100, '7'],
  [101, '1']
];

describe('FEATURE: the ELK options of every builder (c8)', () => {
  describe('GIVEN packages', () => {
    it.each(THOROUGHNESS_ROWS)(
      'WHEN %i packages are built by elkGraphOf THEN the root carries thoroughness %s and NETWORK_SIMPLEX',
      (count, thoroughness) => {
        const names = packageNamesOf(count);

        const graph = elkGraphOf(names, chainEdgesOf(names), sizeOf);

        expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual([thoroughness]);
        expect(optionValuesOf(graph, LAYERING)).toStrictEqual(['NETWORK_SIMPLEX']);
      }
    );
  });

  describe('GIVEN packages in folders', () => {
    it.each(THOROUGHNESS_ROWS)(
      'WHEN %i packages are built by groupedElkGraphOf THEN root and every folder carry %s and NETWORK_SIMPLEX',
      (count, thoroughness) => {
        const names = packageNamesOf(count);

        const graph = groupedElkGraphOf(foldersOfPackages(count), chainEdgesOf(names), sizeOf);

        expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(4, thoroughness));
        expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(4, 'NETWORK_SIMPLEX'));
      }
    );
  });

  describe('GIVEN grouped tasks with 3 scripts', () => {
    it.each(THOROUGHNESS_ROWS)(
      'WHEN %i tasks are built by elkTaskGraphOf THEN root, folder, package and Scripts boxes carry %s and LONGEST_PATH',
      (count, thoroughness) => {
        const graph = taskGraphOf(count - 3, 3, true);

        expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(GROUPED_TASK_BOXES, thoroughness));
        expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(GROUPED_TASK_BOXES, 'LONGEST_PATH'));
      }
    );

    it.each(THOROUGHNESS_ROWS)(
      'WHEN %i tasks are packed into wrappers THEN every wrapper carries thoroughness %s',
      (count, thoroughness) => {
        const graph = taskGraphOf(count - 3, 3, true);

        expect(wrapperOptionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(WRAPPER_COUNT, thoroughness));
      }
    );
  });

  describe('GIVEN 97 ungrouped tasks with 3 scripts', () => {
    it('WHEN built THEN root, package and Scripts boxes carry thoroughness 7 and NETWORK_SIMPLEX', () => {
      const graph = taskGraphOf(97, 3, false);

      expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(UNGROUPED_TASK_BOXES, '7'));
      expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(UNGROUPED_TASK_BOXES, 'NETWORK_SIMPLEX'));
    });
  });

  describe('GIVEN 100 grouped tasks with 1 script', () => {
    it('WHEN built THEN every box carries thoroughness 1 (the count is the whole graph)', () => {
      const graph = taskGraphOf(100, 1, true);

      expect(optionValuesOf(graph, THOROUGHNESS)).toStrictEqual(repeatedOf(ONE_SCRIPT_BOXES, '1'));
    });
  });

  describe('GIVEN 97 tasks with 3 scripts, unlinked', () => {
    it.each([
      [true, 'LONGEST_PATH', GROUPED_TASK_BOXES],
      [false, 'NETWORK_SIMPLEX', UNGROUPED_TASK_BOXES]
    ])('WHEN grouped is %s THEN the wrappers are numbered and every box carries %s', (grouped, layering, boxes) => {
      const graph = taskGraphOf(97, 3, grouped);

      expect(idsOf(childrenOf(graph))).toStrictEqual([wrapperIdOf(0), wrapperIdOf(1), wrapperIdOf(2)]);
      expect(wrapperOptionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(WRAPPER_COUNT, layering));
      expect(optionValuesOf(graph, LAYERING)).toStrictEqual(repeatedOf(boxes, layering));
    });
  });
});
