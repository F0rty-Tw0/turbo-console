import type { ClassHolder, FakeClassList } from '../common/fake-document.type.ts';

/** A fake element's `classList`, read from and written to its `className`. */
export const fakeClassListMock = (holder: ClassHolder): FakeClassList => {
  const classList: FakeClassList = {
    add: (...names: string[]): void => {
      const all = [holder.className, ...names];
      const joined = all.join(' ');

      holder.className = joined.trim();
    },
    remove: (...names: string[]): void => {
      const all = holder.className.split(' ');
      const kept = all.filter((each) => each !== '' && !names.includes(each));

      holder.className = kept.join(' ');
    },
    toggle: (name: string, force: boolean): void => {
      const names = holder.className.split(' ');
      const others = names.filter((each) => each !== '' && each !== name);
      const withName = [...others, name];
      const kept = force ? withName : others;

      holder.className = kept.join(' ');
    },
    contains: (name: string): boolean => {
      const names = holder.className.split(' ');

      return names.includes(name);
    }
  };

  return classList;
};
