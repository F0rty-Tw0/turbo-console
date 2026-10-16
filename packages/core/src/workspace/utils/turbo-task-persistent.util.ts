import { ROOT_DIR, ROOT_NAME, dirOfName, packageDirOf } from './turbo-task-lookup.util.ts';
import type { TurboConfigOk, TurboTaskFacts, TurboTaskLookup, TurboTaskPackage } from '../common/turbo-config.type.ts';

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

const PERSISTENT: TurboTaskFacts = { persistent: true };

const NOT_PERSISTENT: TurboTaskFacts = { persistent: false };

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

const factsOf = (effect: FieldEffect): TurboTaskFacts => (effect === true ? PERSISTENT : NOT_PERSISTENT);

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

/**
 * Turbo 2.11.7's resolved `persistent` of each of `names` (the tasks the presence rule keeps for `pkg`), in their order:
 * the last value an entry of the target's sequence sets, `false` when none sets one (spec §4.2 steps 1–4).
 */
export const persistentOf = (
  lookup: TurboTaskLookup,
  root: TurboConfigOk,
  pkg: TurboTaskPackage,
  names: ReadonlySet<string>
): ReadonlyMap<string, TurboTaskFacts> => {
  const dir = packageDirOf(pkg);
  const path = new Set<string>();
  const memo = new Map<string, FieldEffect>();
  const tasks = new Map<string, TurboTaskFacts>();

  for (const task of names) {
    const rootEffect = rootEffectOf(root, pkg.name, task);
    const walk: FieldWalk = { lookup, task, rootEffect, path, memo };

    memo.clear();
    tasks.set(task, factsOf(targetEffectOf(walk, dir)));
  }

  return tasks;
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
