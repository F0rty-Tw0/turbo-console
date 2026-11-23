import type { ModuleSelection } from '../../../bridge/common/graph-view-state.type.ts';

export const node = (id: string): ModuleSelection => {
  const selection: ModuleSelection = { kind: 'node', id };

  return selection;
};

export const link = (source: string, target: string): ModuleSelection => {
  const selection: ModuleSelection = { kind: 'link', source, target };

  return selection;
};
