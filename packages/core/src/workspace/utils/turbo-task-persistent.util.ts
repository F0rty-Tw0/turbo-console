import { ROOT_DIR, ROOT_NAME, dirOfName, rootKeyTaskOf } from './turbo-task-lookup.util.ts';
import type { TurboConfigOk, TurboTaskFacts, TurboTaskLookup, TurboTaskTarget } from '../common/turbo-config.type.ts';
import { NOT_PERSISTENT_FACTS, PERSISTENT_FACTS } from '../common/turbo-task.const.ts';

/** What one entry, or a whole sequence of entries, does to the `persistent` value so far: `unset` means no value. */
type FieldEffect = boolean | 'keep' | 'unset';

/**
 * One task's walk for one target package: the root entry's effect for that target, the dirs on the current `extends`
 * path, and each parent dir's sequence effect, valid for this target and task only.
 */
type FieldWalk = {
  readonly lookup: TurboTaskLookup;
  readonly task: string;
  readonly rootEffect: FieldEffect;
  readonly path: Set<string>;
  readonly memo: Map<string, FieldEffect>;
};

/** `undefined` for a key the record does not own, so a task named `constructor` never reads `Object.prototype`. */
const ownValue = <TValue>(record: Record<string, TValue>, key: string): TValue | undefined => {
  const isOwn = Object.hasOwn(record, key);

  if (!isOwn) return undefined;

  return record[key];
};

/** Spec §4.2 step 2: `defined` sets its value or keeps, `fresh` resets then sets its value, `excluded` resets. */
const entryEffectOf = (config: TurboConfigOk, key: string): FieldEffect => {
  const presence = ownValue(config.tasks, key);
  const value = ownValue(config.persistent, key);

  switch (presence) {
    case undefined:
      return 'keep';
    case 'defined':
      return value ?? 'keep';
    case 'fresh':
      return value ?? 'unset';
    case 'excluded':
      return 'unset';
  }
};

/** Spec §4.2 step 3: the target's `<pkg>#<task>` root key replaces the bare key as a whole; `//` reads only its own. */
const rootEffectOf = (root: TurboConfigOk, packageName: string, task: string): FieldEffect => {
  const ownKey = `${packageName}#${task}`;
  const hasOwnKey = Object.hasOwn(root.tasks, ownKey);

  if (hasOwnKey) return entryEffectOf(root, ownKey);

  if (packageName === ROOT_NAME) return 'keep';

  return entryEffectOf(root, task);
};

const applied = (before: FieldEffect, after: FieldEffect): FieldEffect => (after === 'keep' ? before : after);

const factsOf = (effect: FieldEffect): TurboTaskFacts => (effect === true ? PERSISTENT_FACTS : NOT_PERSISTENT_FACTS);

/**
 * The effect of `dir`'s whole sequence (spec §4.2 step 1): the root entry for the target, each `extends` parent's
 * sequence in listed order, then its own entry. A parent with no config contributes nothing: turbo 2.11.7 rejects
 * extending one at load. A dir already on the path is cut, only as a recursion guard: turbo rejects a cyclic `extends`
 * at load too, so every memo entry matches the literal walk, and a shared parent costs one visit, not one per path.
 */
const dirEffectOf = (walk: FieldWalk, dir: string): FieldEffect => {
  const known = walk.memo.get(dir);

  if (known !== undefined) return known;

  const config = walk.lookup.configsByDir.get(dir);

  if (config === undefined || 'error' in config) return 'keep';

  const [, ...parentNames] = config.extends;
  let effect = walk.rootEffect;

  walk.path.add(dir);

  for (const name of parentNames) {
    const parentDir = dirOfName(walk.lookup, name);

    if (parentDir === undefined) continue;

    const isOnPath = walk.path.has(parentDir);

    if (isOnPath) continue;

    effect = applied(effect, dirEffectOf(walk, parentDir));
  }

  walk.path.delete(dir);

  const ownEffect = entryEffectOf(config, walk.task);
  const sequence = applied(effect, ownEffect);

  walk.memo.set(dir, sequence);

  return sequence;
};

/** The target's own sequence: just the root entry when it has no config, or is the root package (its config is the root's). */
const targetEffectOf = (walk: FieldWalk, dir: string): FieldEffect => {
  const hasConfig = walk.lookup.configsByDir.has(dir);

  if (dir === ROOT_DIR || !hasConfig) return walk.rootEffect;

  return dirEffectOf(walk, dir);
};

const addRootSettable = (settable: Set<string>, root: TurboConfigOk, packageName: string): void => {
  for (const key of Object.keys(root.persistent)) {
    const task = rootKeyTaskOf(key, packageName);

    if (task !== null) settable.add(task);
  }
};

/**
 * The tasks some entry of the target's sequence sets `persistent` for: any other task ends with no value, so `false`,
 * without a walk. Most repos set it for a few tasks only, so most tasks skip the walk.
 */
const settableTasksOf = (root: TurboConfigOk, target: TurboTaskTarget): Set<string> => {
  const settable = new Set<string>();

  addRootSettable(settable, root, target.name);

  for (const config of target.chain) {
    for (const task of Object.keys(config.persistent)) settable.add(task);
  }

  return settable;
};

/**
 * Sets turbo 2.11.7's resolved `persistent` on `tasks` (the tasks the presence rule keeps for `target`, each still
 * `NOT_PERSISTENT_FACTS`): the last value an entry of the target's sequence sets, `false` when none sets one (spec
 * §4.2 steps 1–4). Only a task some entry sets a value for is walked; the map keeps its order.
 */
export const applyPersistent = (
  tasks: Map<string, TurboTaskFacts>,
  lookup: TurboTaskLookup,
  root: TurboConfigOk,
  target: TurboTaskTarget
): void => {
  const settable = settableTasksOf(root, target);
  const path = new Set<string>();
  const memo = new Map<string, FieldEffect>();

  for (const task of settable) {
    const isKept = tasks.has(task);

    if (!isKept) continue;

    const rootEffect = rootEffectOf(root, target.name, task);
    const walk: FieldWalk = { lookup, task, rootEffect, path, memo };

    memo.clear();
    tasks.set(task, factsOf(targetEffectOf(walk, target.dir)));
  }
};

/** The bare root keys turbo keeps, in key order, with the facts their own entry gives: no other entry applies to them. */
export const bareTasksOf = (root: TurboConfigOk): Map<string, TurboTaskFacts> => {
  const tasks = new Map<string, TurboTaskFacts>();

  for (const [key, presence] of Object.entries(root.tasks)) {
    const isQualified = key.includes('#');

    if (isQualified || presence === 'excluded') continue;

    const effect = entryEffectOf(root, key);

    tasks.set(key, factsOf(effect));
  }

  return tasks;
};
