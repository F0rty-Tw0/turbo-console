import { describe, expect, it } from 'vitest';

import { channelOf, guardProblems, isNotAncestorError, isOnMaster, releaseNotes } from './release.util.ts';
import type { CiRun, GuardInput } from '../common/release.type.ts';

const CHANGELOG = '# Changelog\n\n## 0.1.0 (pre-release)\n\n- a\n- b\n\n## 0.0.9\n\n- old\n';

const CI_RUNS: CiRun[] = [{ conclusion: 'failure' }, { conclusion: 'success' }];

const GUARD_STUB: GuardInput = { tag: 'v0.1.0', version: '0.1.0', isAncestor: true, ciRuns: CI_RUNS };

describe('FEATURE: release util', () => {
  describe('GIVEN a version for the release channel', () => {
    describe('GIVEN an odd minor version', () => {
      it('WHEN the channel is read THEN it is pre-release', () => {
        expect(channelOf('0.1.0')).toBe('pre-release');
        expect(channelOf('1.3.5')).toBe('pre-release');
      });
    });

    describe('GIVEN an even minor version', () => {
      it('WHEN the channel is read THEN it is stable', () => {
        expect(channelOf('0.2.0')).toBe('stable');
        expect(channelOf('1.0.0')).toBe('stable');
      });
    });
  });

  describe('GIVEN a changelog for the release notes', () => {
    describe('GIVEN a changelog whose heading carries a suffix', () => {
      it('WHEN the notes are read THEN they hold the body up to the next heading', () => {
        const notes = releaseNotes(CHANGELOG, '0.1.0');

        expect(notes).toBe('- a\n- b');
      });
    });

    describe('GIVEN a changelog without the version heading', () => {
      it('WHEN the notes are read THEN it throws', () => {
        const read = (): string => releaseNotes(CHANGELOG, '0.1.1');

        expect(read).toThrow(/no CHANGELOG section for 0\.1\.1/);
      });
    });

    describe('GIVEN a changelog whose section is empty', () => {
      it('WHEN the notes are read THEN it throws', () => {
        const read = (): string => releaseNotes('## 0.1.0\n\n## 0.0.9\n\n- old\n', '0.1.0');

        expect(read).toThrow(/empty CHANGELOG section for 0\.1\.0/);
      });
    });

    describe('GIVEN a changelog whose heading only starts with the version', () => {
      it('WHEN the notes are read THEN it throws', () => {
        const read = (): string => releaseNotes('## 0.1.01\n- x\n', '0.1.0');

        expect(read).toThrow(/no CHANGELOG section for 0\.1\.0/);
      });
    });

    describe('GIVEN a heading that ends the line with the version', () => {
      it('WHEN the notes are read THEN they hold the body to the end of the file', () => {
        const notes = releaseNotes('## 0.1.0\n- x\n', '0.1.0');

        expect(notes).toBe('- x');
      });
    });
  });

  describe('GIVEN a guard input for the release guard', () => {
    describe('GIVEN a matching tag, a commit on master and one green CI push run', () => {
      it('WHEN the problems are listed THEN there are none', () => {
        const problems = guardProblems(GUARD_STUB);

        expect(problems).toStrictEqual([]);
      });
    });

    describe('GIVEN a tag that differs from the manifest version', () => {
      it('WHEN the problems are listed THEN the mismatch is named', () => {
        const problems = guardProblems({ ...GUARD_STUB, tag: 'v0.1.1' });

        expect(problems).toStrictEqual(['tag v0.1.1 does not match version 0.1.0']);
      });
    });

    describe('GIVEN a commit that is not on master', () => {
      it('WHEN the problems are listed THEN the branch is named', () => {
        const problems = guardProblems({ ...GUARD_STUB, isAncestor: false });

        expect(problems).toStrictEqual(['commit is not on master']);
      });
    });

    describe('GIVEN CI runs without a success', () => {
      it('WHEN the problems are listed THEN the missing run is named', () => {
        const ciRuns: CiRun[] = [{ conclusion: 'failure' }, { conclusion: 'cancelled' }];

        const problems = guardProblems({ ...GUARD_STUB, ciRuns });

        expect(problems).toStrictEqual(['no successful CI push run for this commit']);
      });
    });

    describe('GIVEN no CI runs', () => {
      it('WHEN the problems are listed THEN the missing run is named', () => {
        const problems = guardProblems({ ...GUARD_STUB, ciRuns: [] });

        expect(problems).toStrictEqual(['no successful CI push run for this commit']);
      });
    });

    describe('GIVEN a wrong tag, a foreign commit and no CI runs', () => {
      it('WHEN the problems are listed THEN all three come in order', () => {
        const problems = guardProblems({ tag: 'v0.1.1', version: '0.1.0', isAncestor: false, ciRuns: [] });

        expect(problems).toStrictEqual([
          'tag v0.1.1 does not match version 0.1.0',
          'commit is not on master',
          'no successful CI push run for this commit'
        ]);
      });
    });
  });

  describe('GIVEN an ancestry check failure', () => {
    describe('GIVEN git exited 1', () => {
      it('WHEN the failure is read THEN it means not an ancestor', () => {
        const error = Object.assign(new Error('Command failed'), { status: 1 });

        const result = isNotAncestorError(error);

        expect(result).toBe(true);
      });
    });

    describe('GIVEN git exited 128 because origin/master is missing', () => {
      it('WHEN the failure is read THEN it is not an answer', () => {
        const error = Object.assign(new Error('Command failed'), { status: 128 });

        const result = isNotAncestorError(error);

        expect(result).toBe(false);
      });
    });

    describe('GIVEN git never started', () => {
      it('WHEN the failure is read THEN it is not an answer', () => {
        const error = Object.assign(new Error('spawn git ENOENT'), { status: null });

        const result = isNotAncestorError(error);

        expect(result).toBe(false);
      });
    });

    describe('GIVEN a thrown value that is not an error', () => {
      it('WHEN the failure is read THEN it is not an answer', () => {
        const result = isNotAncestorError({ status: 1 });

        expect(result).toBe(false);
      });
    });
  });

  const failingWith = (status: number): (() => void) => {
    const fail = (): void => {
      throw Object.assign(new Error('Command failed'), { status });
    };

    return fail;
  };

  describe('GIVEN an ancestry check for master ancestry', () => {
    describe('GIVEN the ancestry check passes', () => {
      it('WHEN the commit is checked THEN it is on master', () => {
        const result = isOnMaster(() => undefined);

        expect(result).toBe(true);
      });
    });

    describe('GIVEN the ancestry check exits 1', () => {
      it('WHEN the commit is checked THEN it is not on master', () => {
        const result = isOnMaster(failingWith(1));

        expect(result).toBe(false);
      });
    });

    describe('GIVEN the ancestry check exits 128', () => {
      it('WHEN the commit is checked THEN the failure is rethrown', () => {
        const check = (): boolean => isOnMaster(failingWith(128));

        expect(check).toThrow('Command failed');
      });
    });
  });
});
