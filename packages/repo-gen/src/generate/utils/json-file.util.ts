import type { FixtureFile } from '../common/fixture.type.ts';

/** Every JSON file the generator writes: two-space `JSON.stringify` plus one trailing LF. */
export const toJsonFile = (path: string, value: unknown): FixtureFile => {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const file: FixtureFile = { path, content };

  return file;
};
