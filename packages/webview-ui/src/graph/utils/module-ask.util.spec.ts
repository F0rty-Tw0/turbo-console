import { describe, expect, it } from 'vitest';

import { askOf, isSameAsk, isSameSelection, lastStateOf, scanningStateOf, sitesStateOf } from './module-ask.util.ts';
import type { ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';
import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleSitesState } from '../common/module-details.type.ts';
import type { ModuleAsk, ModuleShownLookup } from '../common/module-selection.type.ts';
import { MODULE_SITES_FOUND_STUB } from '../test/stubs/graph-host-message.stub.ts';
import { link, node } from '../test/utils/module-selections.spec.util.ts';

const A_FILE: ModuleEnd = { kind: 'file', path: 'src/a.ts' };

const A_DIR: ModuleEnd = { kind: 'dir', path: 'src/a.ts' };

const A_STUB: ModuleEnd = { kind: 'stub', name: 'src/a.ts' };

const B_FILE: ModuleEnd = { kind: 'file', path: 'src/lib/b.ts' };

const OTHER_FILE: ModuleEnd = { kind: 'file', path: 'src/b.ts' };

const LIB_DIR: ModuleEnd = { kind: 'dir', path: 'src/lib' };

const LIB_FILE: ModuleEnd = { kind: 'file', path: 'src/lib' };

const UI_DIR: ModuleEnd = { kind: 'dir', path: 'src/ui' };

const X_STUB: ModuleEnd = { kind: 'stub', name: '@s/x' };

const A_TO_LIB: ModuleAsk = { packageName: 'web', from: A_FILE, to: LIB_DIR };

const FOUND: ModuleSitesState = { kind: 'found', result: MODULE_SITES_FOUND_STUB };

const A_TO_LIB_LINK: ModuleSelection = link('file:src/a.ts', 'dir:src/lib');

const A_TO_LIB_SHOWN: ModuleShownLookup = { sel: A_TO_LIB_LINK, ask: A_TO_LIB, state: FOUND };

describe('FEATURE: module asks', () => {
  describe('GIVEN package web', () => {
    it('WHEN b.ts is asked about THEN the ask is (file src/lib/b.ts, null)', () => {
      expect(askOf('web', node('file:src/lib/b.ts'))).toStrictEqual({ packageName: 'web', from: B_FILE, to: null });
    });

    it('WHEN the stub @s/x is asked about THEN the ask is (stub @s/x, null)', () => {
      expect(askOf('web', node('pkg:@s/x'))).toStrictEqual({ packageName: 'web', from: X_STUB, to: null });
    });

    it('WHEN the link dir:src/ui → dir:src/lib is asked about THEN the ask holds both dir ends', () => {
      expect(askOf('web', link('dir:src/ui', 'dir:src/lib'))).toStrictEqual({ packageName: 'web', from: UI_DIR, to: LIB_DIR });
    });
  });

  describe('GIVEN the ask (file src/a.ts, dir src/lib) of web', () => {
    it.each<[string, ModuleAsk, boolean]>([
      ['the same ask', { ...A_TO_LIB }, true],
      ['another package', { ...A_TO_LIB, packageName: 'ui' }, false],
      ['to null', { ...A_TO_LIB, to: null }, false],
      ['to the file src/lib', { ...A_TO_LIB, to: LIB_FILE }, false],
      ['from the dir src/a.ts', { ...A_TO_LIB, from: A_DIR }, false],
      ['from the file src/b.ts', { ...A_TO_LIB, from: OTHER_FILE }, false],
      ['from the stub src/a.ts', { ...A_TO_LIB, from: A_STUB }, false]
    ])('WHEN it is compared with %s THEN it reads %j', (_name, other, expected) => {
      expect(isSameAsk(A_TO_LIB, other)).toBe(expected);
    });
  });

  describe('GIVEN the ask (file src/a.ts, null) of web', () => {
    it('WHEN it is compared with the same ask THEN it reads true', () => {
      expect(isSameAsk({ ...A_TO_LIB, to: null }, { ...A_TO_LIB, to: null })).toBe(true);
    });

    it('WHEN it is compared with the ask to dir src/lib THEN it reads false', () => {
      expect(isSameAsk({ ...A_TO_LIB, to: null }, A_TO_LIB)).toBe(false);
    });
  });

  describe('GIVEN the link file:src/a.ts → dir:src/lib', () => {
    it.each<[string, ModuleSelection | null, boolean]>([
      ['nothing', null, false],
      ['the same link', link('file:src/a.ts', 'dir:src/lib'), true],
      ['the reversed link', link('dir:src/lib', 'file:src/a.ts'), false],
      ['a link from the same file elsewhere', link('file:src/a.ts', 'dir:src/ui'), false],
      ['the node src/a.ts', node('file:src/a.ts'), false]
    ])('WHEN %s is the saved selection THEN it reads %j', (_name, saved, expected) => {
      expect(isSameSelection(saved, link('file:src/a.ts', 'dir:src/lib'))).toBe(expected);
    });
  });

  describe('GIVEN the node file:src/a.ts', () => {
    it.each<[string, ModuleSelection, boolean]>([
      ['the same node', node('file:src/a.ts'), true],
      ['another node', node('file:src/b.ts'), false],
      ['a link', link('file:src/a.ts', 'dir:src/lib'), false]
    ])('WHEN %s is the saved selection THEN it reads %j', (_name, saved, expected) => {
      expect(isSameSelection(saved, node('file:src/a.ts'))).toBe(expected);
    });
  });

  describe('GIVEN a host answer', () => {
    it('WHEN it is found THEN the lookup is found with its result', () => {
      expect(sitesStateOf(MODULE_SITES_FOUND_STUB)).toStrictEqual(FOUND);
    });

    it('WHEN it failed THEN the lookup failed', () => {
      expect(sitesStateOf({ kind: 'failed' })).toStrictEqual({ kind: 'failed' });
    });
  });

  describe('GIVEN a lookup asked', () => {
    it.each<[string, ModuleSitesState | null, ModuleSitesState]>([
      ['for the first time', null, { kind: 'scanning', previous: null }],
      ['again over a found answer', FOUND, { kind: 'scanning', previous: MODULE_SITES_FOUND_STUB }],
      ['again over a failure', { kind: 'failed' }, { kind: 'scanning', previous: null }]
    ])('WHEN it is %s THEN it scans as %j', (_name, last, expected) => {
      expect(scanningStateOf(last)).toStrictEqual(expected);
    });
  });

  describe('GIVEN the src/a.ts → src/lib lookup shown, found', () => {
    it.each<[string, ModuleShownLookup | null, ModuleAsk, ModuleSitesState | null]>([
      ['the same lookup asked again', A_TO_LIB_SHOWN, { ...A_TO_LIB }, FOUND],
      ['another lookup asked', A_TO_LIB_SHOWN, { ...A_TO_LIB, to: null }, null],
      ['a lookup asked with nothing shown', null, A_TO_LIB, null]
    ])('WHEN %s THEN its last state reads %j', (_name, last, next, expected) => {
      expect(lastStateOf(last, next)).toStrictEqual(expected);
    });
  });
});
