import type { BodyRecord } from '../../common/graph-widgets.type.ts';

/** A mutation record of an element whose parent is `parent`. */
export const bodyRecordIn = (parent: unknown): BodyRecord => {
  const target = { parentNode: parent };
  const record: BodyRecord = { target };

  return record;
};
