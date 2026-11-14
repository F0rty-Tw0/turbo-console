import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import { HOST_GRAPH_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { stateMessageOf } from '../test/utils/graph-host-message.spec.util.ts';

const rootWithSizeName = (sizeName: unknown): unknown[] => {
  const root = { name: '//', bareName: '(root) savings', sizeName, path: '', tags: [], taskCount: 0 };

  return [root];
};

const rootWithoutSizeName: unknown[] = [{ name: '//', bareName: 'savings', path: '', tags: [], taskCount: 0 }];

describe('FEATURE: isGraphHostMessage sizeName', () => {
  it.each([
    ['a string sizeName', rootWithSizeName('(root) savings')],
    ['no sizeName', rootWithoutSizeName],
    ['an undefined sizeName', rootWithSizeName(undefined)]
  ])('GIVEN a root package with %s WHEN the state arrives THEN it is accepted', (_name, packages) => {
    const isMessage = isGraphHostMessage(stateMessageOf({ ...HOST_GRAPH_STUB, packages }));

    expect(isMessage).toBe(true);
  });

  it.each([
    ['a numeric sizeName', rootWithSizeName(3)],
    ['a null sizeName', rootWithSizeName(null)],
    ['an object sizeName', rootWithSizeName({})]
  ])('GIVEN a root package with %s WHEN the state arrives THEN it is rejected', (_name, packages) => {
    const isMessage = isGraphHostMessage(stateMessageOf({ ...HOST_GRAPH_STUB, packages }));

    expect(isMessage).toBe(false);
  });
});
