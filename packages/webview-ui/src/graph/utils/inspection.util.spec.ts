import { describe, expect, it } from 'vitest';

import { nextInspection } from './inspection.util.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { EscapeWhere, Inspection, InspectionInput, SelectVia } from '../common/inspection.type.ts';

const NONE: Inspection = NO_INSPECTION;

const PKG: Inspection = { kind: 'package', name: 'web' };

const LINK: Inspection = { kind: 'link', source: 'web', target: 'ui' };

const PICKING: Inspection = { kind: 'picking', start: 'web', isNudged: false };

const NUDGED: Inspection = { kind: 'picking', start: 'web', isNudged: true };

const TRACE: Inspection = { kind: 'trace', start: 'web', end: 'core' };

const FOLDER_APPS: Inspection = { kind: 'folder', folder: 'apps' };

const PROTO_PKG: Inspection = { kind: 'package', name: '__proto__' };

const PROTO_PICKING: Inspection = { kind: 'picking', start: '__proto__', isNudged: false };

const PROTO_TRACE: Inspection = { kind: 'trace', start: '__proto__', end: 'constructor' };

const EVERY_STATE: [string, Inspection][] = [
  ['none', NONE],
  ['a package', PKG],
  ['a link', LINK],
  ['picking', PICKING],
  ['picking, nudged', NUDGED],
  ['a trace', TRACE],
  ['a folder', FOLDER_APPS]
];

const select = (name: string, via: SelectVia): InspectionInput => {
  const built: InspectionInput = { kind: 'select', name, via };

  return built;
};

const pick = (name: string): InspectionInput => {
  const built: InspectionInput = { kind: 'pick', name };

  return built;
};

const tapLink = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'tapLink', source, target };

  return built;
};

const explain = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'explain', source, target };

  return built;
};

const escape = (where: EscapeWhere): InspectionInput => {
  const built: InspectionInput = { kind: 'escape', where };

  return built;
};

const selectFolder = (folder: string): InspectionInput => {
  const built: InspectionInput = { kind: 'selectFolder', folder };

  return built;
};

const BACKGROUND: InspectionInput = { kind: 'background' };

const CLEAR: InspectionInput = { kind: 'clear' };

const START_TRACE: InspectionInput = { kind: 'startTrace' };

const CANCEL: InspectionInput = { kind: 'cancel' };

const CLEAR_TRACE: InspectionInput = { kind: 'clearTrace' };

const SWAP_ENDS: InspectionInput = { kind: 'swapEnds' };

const pkg = (name: string): Inspection => {
  const built: Inspection = { kind: 'package', name };

  return built;
};

const link = (source: string, target: string): Inspection => {
  const built: Inspection = { kind: 'link', source, target };

  return built;
};

const folderOf = (folder: string): Inspection => {
  const built: Inspection = { kind: 'folder', folder };

  return built;
};

const trace = (start: string, end: string): Inspection => {
  const built: Inspection = { kind: 'trace', start, end };

  return built;
};

describe('FEATURE: nextInspection', () => {
  describe('GIVEN a package is selected outside picking', () => {
    it.each([
      ['none, ui via canvas', NONE, select('ui', 'canvas'), pkg('ui')],
      ['a package, ui via list', PKG, select('ui', 'list'), pkg('ui')],
      ['a package, web via a list Focus', PKG, select('web', 'focus'), pkg('web')],
      ['a link, ui via panel', LINK, select('ui', 'panel'), pkg('ui')],
      ['a trace, ui via canvas', TRACE, select('ui', 'canvas'), pkg('ui')],
      ['none, __proto__ via list', NONE, select('__proto__', 'list'), pkg('__proto__')]
    ])('WHEN from %s THEN it becomes the package', (_title, from, input, to) => {
      const next = nextInspection(from, input);

      expect(next).toStrictEqual(to);
    });
  });

  describe('GIVEN a package is selected while picking', () => {
    it.each([
      ['ui via canvas', PICKING, select('ui', 'canvas'), trace('web', 'ui')],
      ['ui via list', PICKING, select('ui', 'list'), trace('web', 'ui')],
      ['ui via panel', PICKING, select('ui', 'panel'), PICKING],
      ['the start via canvas', PICKING, select('web', 'canvas'), PICKING],
      ['the start via list', PICKING, select('web', 'list'), PICKING],
      ['ui via canvas, nudged', NUDGED, select('ui', 'canvas'), trace('web', 'ui')],
      ['constructor via list, __proto__ start', PROTO_PICKING, select('constructor', 'list'), PROTO_TRACE]
    ])('WHEN %s THEN the trace is made or nothing changes', (_title, from, input, to) => {
      const next = nextInspection(from, input);

      expect(next).toStrictEqual(to);
    });
  });

  describe('GIVEN a candidate is picked', () => {
    it.each([
      ['ui from picking', PICKING, pick('ui'), trace('web', 'ui')],
      ['ui from nudged picking', NUDGED, pick('ui'), trace('web', 'ui')],
      ['the start from picking', PICKING, pick('web'), PICKING],
      ['the start from nudged picking', NUDGED, pick('web'), NUDGED],
      ['__proto__ from picking', PICKING, pick('__proto__'), trace('web', '__proto__')],
      ['lonely, a no-path candidate', PICKING, pick('lonely'), trace('web', 'lonely')],
      ['ui from none', NONE, pick('ui'), NONE],
      ['ui from a package', PKG, pick('ui'), PKG],
      ['ui from a link', LINK, pick('ui'), LINK],
      ['ui from a trace', TRACE, pick('ui'), TRACE]
    ])('WHEN %s THEN the trace is made or nothing changes', (_title, from, input, to) => {
      const next = nextInspection(from, input);

      expect(next).toStrictEqual(to);
    });
  });

  describe('GIVEN a link is tapped', () => {
    it.each([
      ['from none', NONE, tapLink('web', 'ui'), link('web', 'ui')],
      ['from a package', PKG, tapLink('web', 'ui'), link('web', 'ui')],
      ['from a trace', TRACE, tapLink('web', 'ui'), link('web', 'ui')],
      ['from another link', LINK, tapLink('ui', 'core'), link('ui', 'core')],
      ['from picking', PICKING, tapLink('web', 'ui'), NUDGED],
      ['a second time from nudged picking', NUDGED, tapLink('web', 'ui'), NUDGED],
      ['__proto__ to constructor from none', NONE, tapLink('__proto__', 'constructor'), link('__proto__', 'constructor')]
    ])('WHEN %s THEN the link is shown or picking is nudged', (_title, from, input, to) => {
      const next = nextInspection(from, input);

      expect(next).toStrictEqual(to);
    });
  });

  describe('GIVEN a link is explained', () => {
    it.each([
      ['ui to web from a package', PKG, explain('ui', 'web'), link('ui', 'web')],
      ['web to ui from a package', PKG, explain('web', 'ui'), link('web', 'ui')],
      ['ui to core from picking', PICKING, explain('ui', 'core'), NUDGED]
    ])('WHEN %s THEN it acts as a tap', (_title, from, input, to) => {
      const next = nextInspection(from, input);

      expect(next).toStrictEqual(to);
    });
  });

  describe('GIVEN the background is clicked or the inspection is cleared', () => {
    it.each(EVERY_STATE)('WHEN background from %s THEN nothing is inspected', (_title, from) => {
      const next = nextInspection(from, BACKGROUND);

      expect(next).toStrictEqual(NONE);
    });

    it.each(EVERY_STATE)('WHEN clear from %s THEN nothing is inspected', (_title, from) => {
      const next = nextInspection(from, CLEAR);

      expect(next).toStrictEqual(NONE);
    });
  });

  describe('GIVEN picking is escaped or cancelled', () => {
    it.each([
      ['escape on the canvas from picking', PICKING, escape('canvas')],
      ['escape in the panel from picking', PICKING, escape('panel')],
      ['cancel from picking', PICKING, CANCEL],
      ['escape on the canvas from nudged picking', NUDGED, escape('canvas')],
      ['cancel from nudged picking', NUDGED, CANCEL]
    ])('WHEN %s THEN the start package is shown', (_title, from, input) => {
      const next = nextInspection(from, input);

      expect(next).toStrictEqual(PKG);
    });
  });

  describe('GIVEN escape outside picking', () => {
    it.each([
      ['none', NONE],
      ['a package', PKG],
      ['a link', LINK],
      ['a trace', TRACE]
    ])('WHEN escape on the canvas from %s THEN nothing is inspected', (_title, from) => {
      const next = nextInspection(from, escape('canvas'));

      expect(next).toStrictEqual(NONE);
    });

    it.each([
      ['none', NONE],
      ['a package', PKG],
      ['a link', LINK],
      ['a trace', TRACE]
    ])('WHEN escape in the panel from %s THEN nothing changes', (_title, from) => {
      const next = nextInspection(from, escape('panel'));

      expect(next).toStrictEqual(from);
    });
  });

  describe('GIVEN a trace is started', () => {
    it.each([
      ['a package', PKG, PICKING],
      ['a __proto__ package', PROTO_PKG, PROTO_PICKING]
    ])('WHEN from %s THEN picking starts un-nudged', (_title, from, to) => {
      const next = nextInspection(from, START_TRACE);

      expect(next).toStrictEqual(to);
    });

    it.each([
      ['none', NONE],
      ['a link', LINK],
      ['picking', PICKING],
      ['picking, nudged', NUDGED],
      ['a trace', TRACE]
    ])('WHEN from %s THEN nothing changes', (_title, from) => {
      const next = nextInspection(from, START_TRACE);

      expect(next).toStrictEqual(from);
    });
  });

  describe('GIVEN the trace is cleared', () => {
    it('WHEN from a trace THEN its start package is shown', () => {
      const next = nextInspection(TRACE, CLEAR_TRACE);

      expect(next).toStrictEqual(PKG);
    });

    it.each([
      ['none', NONE],
      ['a package', PKG],
      ['a link', LINK],
      ['picking', PICKING],
      ['picking, nudged', NUDGED]
    ])('WHEN from %s THEN nothing changes', (_title, from) => {
      const next = nextInspection(from, CLEAR_TRACE);

      expect(next).toStrictEqual(from);
    });
  });

  describe('GIVEN cancel outside picking', () => {
    it.each([
      ['none', NONE],
      ['a package', PKG],
      ['a link', LINK],
      ['a trace', TRACE]
    ])('WHEN from %s THEN nothing changes', (_title, from) => {
      const next = nextInspection(from, CANCEL);

      expect(next).toStrictEqual(from);
    });
  });

  describe('GIVEN the ends are swapped', () => {
    it('WHEN from a trace THEN start and end trade places', () => {
      const next = nextInspection(TRACE, SWAP_ENDS);

      expect(next).toStrictEqual(trace('core', 'web'));
    });

    it('WHEN swapped twice THEN the trace is as it began', () => {
      const once = nextInspection(TRACE, SWAP_ENDS);
      const twice = nextInspection(once, SWAP_ENDS);

      expect(twice).toStrictEqual(TRACE);
    });

    it('WHEN from a __proto__ trace THEN start and end trade places', () => {
      const next = nextInspection(PROTO_TRACE, SWAP_ENDS);

      expect(next).toStrictEqual(trace('constructor', '__proto__'));
    });

    it.each([
      ['none', NONE],
      ['a package', PKG],
      ['a link', LINK],
      ['picking', PICKING],
      ['picking, nudged', NUDGED]
    ])('WHEN from %s THEN nothing changes', (_title, from) => {
      const next = nextInspection(from, SWAP_ENDS);

      expect(next).toStrictEqual(from);
    });
  });

  describe('GIVEN a folder is selected', () => {
    it.each([
      ['none', NONE, 'apps', folderOf('apps')],
      ['a package', PKG, 'apps', folderOf('apps')],
      ['a link', LINK, 'apps', folderOf('apps')],
      ['a trace', TRACE, 'apps', folderOf('apps')],
      ['a folder, packages', FOLDER_APPS, 'packages', folderOf('packages')],
      ['a folder, the root', FOLDER_APPS, '', folderOf('')]
    ])('WHEN from %s THEN the folder %s is inspected', (_title, from, folder, to) => {
      const next = nextInspection(from, selectFolder(folder));

      expect(next).toStrictEqual(to);
    });

    it.each([
      ['picking', PICKING],
      ['picking, nudged', NUDGED]
    ])('WHEN from %s THEN the same picking stays', (_title, from) => {
      const next = nextInspection(from, selectFolder('apps'));

      expect(next).toBe(from);
    });
  });

  describe('GIVEN a folder is inspected', () => {
    it.each([
      ['background', BACKGROUND, NONE],
      ['escape on the canvas', escape('canvas'), NONE],
      ['select web via canvas', select('web', 'canvas'), PKG],
      ['tapLink web to ui', tapLink('web', 'ui'), LINK]
    ])('WHEN %s THEN the inspection becomes the next one', (_title, input, to) => {
      const next = nextInspection(FOLDER_APPS, input);

      expect(next).toStrictEqual(to);
    });

    it.each([
      ['escape in the panel', escape('panel')],
      ['startTrace', START_TRACE],
      ['clearTrace', CLEAR_TRACE],
      ['swapEnds', SWAP_ENDS],
      ['cancel', CANCEL],
      ['pick web', pick('web')]
    ])('WHEN %s THEN the same folder stays', (_title, input) => {
      const next = nextInspection(FOLDER_APPS, input);

      expect(next).toBe(FOLDER_APPS);
    });
  });
});
