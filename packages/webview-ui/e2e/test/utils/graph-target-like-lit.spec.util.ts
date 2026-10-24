import type { NodeStates } from '../../common/graph.type.ts';

/** The own tasks of `lib-3#build` in the shown set; each needs only `lib-3#build`, which needs `hub#build`. */
const OWN_TASKS = ['lib-3#docs', 'lib-3#pack', 'lib-3#test', 'lib-3#typecheck'];

const SHOWN_IDS = ['feat-2#build', 'feat-3#build', 'hub#build', 'lib-3#build', ...OWN_TASKS];

const COMPOUND_IDS = ['pkg:feat-2', 'pkg:feat-3', 'pkg:hub', 'pkg:lib-3'];

export const allNormal = (ids: string[]): NodeStates => Object.fromEntries(ids.map((id): [string, 'normal'] => [id, 'normal']));

/** The target-like set with `lib-3#build` chosen: `leaf` selected, its two dependencies highlighted, the other own tasks and both dependents dimmed. */
export const targetLikeLitStatesOf = (leaf: string): NodeStates => {
  const own = Object.fromEntries(OWN_TASKS.map((id): [string, 'selected' | 'dimmed'] => [id, id === leaf ? 'selected' : 'dimmed']));
  const states: NodeStates = {
    ...own,
    'feat-2#build': 'dimmed',
    'feat-3#build': 'dimmed',
    'hub#build': 'highlighted',
    'lib-3#build': 'highlighted',
    'pkg:feat-2': 'dimmed',
    'pkg:feat-3': 'dimmed',
    'pkg:hub': 'normal',
    'pkg:lib-3': 'normal'
  };

  return states;
};

/** The target-like set with `lib-3#build` chosen and nothing lit. */
export const TARGET_LIKE_NORMAL_SHOWN = allNormal([...SHOWN_IDS, ...COMPOUND_IDS]);

/** The target-like set with `lib-3#build` itself the lit task: `lib-3#build` selected, `hub#build` and the six dependents highlighted. */
export const targetLikeBuildLitStates = (): NodeStates => {
  const dependents = [...OWN_TASKS, 'feat-2#build', 'feat-3#build'];
  const lit = Object.fromEntries(dependents.map((id): [string, 'highlighted'] => [id, 'highlighted']));
  const states: NodeStates = {
    ...lit,
    'hub#build': 'highlighted',
    'lib-3#build': 'selected',
    'pkg:feat-2': 'normal',
    'pkg:feat-3': 'normal',
    'pkg:hub': 'normal',
    'pkg:lib-3': 'normal'
  };

  return states;
};
