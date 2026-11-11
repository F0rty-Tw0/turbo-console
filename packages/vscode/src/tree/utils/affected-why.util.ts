const joinedOf = (phrase: string, text: string): string => {
  if (text === '') return phrase;

  return `${phrase}, ${text}`;
};

const dependsOnOf = (text: string): string => {
  if (text === '') return 'depends on an affected task';

  return `depends on ${text}, which is affected`;
};

const dependencyOf = (text: string): string => {
  if (text === '') return 'a dependency changed';

  return `dependency ${text} changed`;
};

const allChangedOf = (text: string): string => {
  if (text === '') return 'all inputs changed';

  return text;
};

/** Why turbo lists a task as affected: its `reason` and `detail`, worded for the tooltip. */
export const affectedWhyOf = (reason: string, detail: string | null): string => {
  const text = detail ?? '';

  switch (reason) {
    case 'TaskFileChanged':
      return joinedOf('file changed', text);
    case 'TaskGlobalFileChanged':
      return joinedOf('global file changed', text);
    case 'TaskGlobalDepsChanged':
      return joinedOf('global dependencies changed', text);
    case 'TaskAllChanged':
      return allChangedOf(text);
    case 'TaskDependencyTaskChanged':
      return dependsOnOf(text);
    case 'TaskPackageDependencyChanged':
      return dependencyOf(text);
    default:
      return reason;
  }
};
