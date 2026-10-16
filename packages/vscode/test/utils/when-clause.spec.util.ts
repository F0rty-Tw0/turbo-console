/** `key =~ /body/flags`. */
const REGEX_TERM = /^([\w.]+) =~ \/(.+)\/([a-z]*)$/u;

/** `key == value` or `key != value`. */
const COMPARE_TERM = /^([\w.]+) (==|!=) (\S+)$/u;

const NEGATED_TERM = /^!([\w.]+)$/u;

const KEY_TERM = /^[\w.]+$/u;

type ContextKeys = Readonly<Record<string, string | boolean>>;

const isSet = (value: string | boolean | undefined): boolean => value !== undefined && value !== false && value !== '';

const regexMatches = (match: RegExpExecArray, keys: ContextKeys): boolean => {
  const [, key = '', body = '', flags = ''] = match;
  const value = keys[key];

  if (typeof value !== 'string') return false;

  const pattern = new RegExp(body, flags);

  return pattern.test(value);
};

/** A key that is not set equals nothing, so `!=` holds for it. */
const compareMatches = (match: RegExpExecArray, keys: ContextKeys): boolean => {
  const [, key = '', operator = '', expected = ''] = match;
  const value = keys[key];

  if (value === undefined) return operator === '!=';

  const isEqual = String(value) === expected;
  const wantsEqual = operator === '==';

  return isEqual === wantsEqual;
};

const termMatches = (term: string, keys: ContextKeys): boolean => {
  if (term === 'true' || term === 'false') return term === 'true';

  const regex = REGEX_TERM.exec(term);

  if (regex !== null) return regexMatches(regex, keys);

  const compare = COMPARE_TERM.exec(term);

  if (compare !== null) return compareMatches(compare, keys);

  const negated = NEGATED_TERM.exec(term);

  if (negated !== null) return !isSet(keys[negated[1] ?? '']);

  const isKey = KEY_TERM.test(term);

  if (isKey) return isSet(keys[term]);

  throw new Error(`unsupported when clause term: '${term}'`);
};

/**
 * Whether a manifest `when` clause holds for `keys`, as VS Code reads it: `||` binds looser than `&&`; terms are
 * `key`, `!key`, `key == value`, `key != value`, `key =~ /regex/flags` (a JS `RegExp`) and the constants `true` and
 * `false`. Any other form throws, so a clause this cannot read never passes by accident.
 */
export const whenMatches = (clause: string, keys: ContextKeys): boolean => {
  const allHold = (part: string): boolean => {
    const terms = part.split(' && ');

    return terms.every((term) => termMatches(term.trim(), keys));
  };
  const alternatives = clause.split(' || ');

  return alternatives.some(allHold);
};
