import type { ActionIconKey, GraphIconId } from '../../common/graph-icon.type.ts';

/** `graph-icon.const.ts` for `vi.doMock`, with `icons` as its action icon table. */
export const graphIconConstMock = (icons: Readonly<Record<ActionIconKey, GraphIconId>>): object => {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- the mocked module's export name
  const module = { ACTION_ICONS: icons };

  return module;
};
