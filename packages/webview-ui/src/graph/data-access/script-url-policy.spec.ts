import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createScriptUrlPolicy } from './script-url-policy.ts';
import { createPolicyMock } from '../test/mocks/elk.mock.ts';

const ORIGIN = 'https://webview-ui.test';

const BLOB_A = `blob:${ORIGIN}/a`;

const BLOB_B = `blob:${ORIGIN}/b`;

describe('FEATURE: createScriptUrlPolicy', () => {
  let createPolicy: Mock<TrustedTypePolicyFactory['createPolicy']>;
  let factory: TrustedTypePolicyFactory;

  beforeEach((): void => {
    createPolicy = createPolicyMock();
    factory = { createPolicy };
  });

  const givenScriptUrl = (): TrustedTypePolicyOptions['createScriptURL'] => {
    const [, options] = createPolicy.mock.calls[0] ?? [];

    if (options === undefined) throw new Error('createPolicy was not called');

    return options.createScriptURL;
  };

  describe('GIVEN a Trusted Types factory', () => {
    it('WHEN the policy is created THEN createPolicy is called once with tc-elk', () => {
      createScriptUrlPolicy(factory, ORIGIN);

      expect(createPolicy).toHaveBeenCalledExactlyOnceWith('tc-elk', expect.any(Object));
    });

    it('WHEN the policy is created THEN it defines createScriptURL only', () => {
      createScriptUrlPolicy(factory, ORIGIN);

      const [, options] = createPolicy.mock.calls[0] ?? [];

      expect(Object.keys(options ?? {})).toStrictEqual(['createScriptURL']);
    });

    it('WHEN a URL is asked for THEN the policy hands back that URL', () => {
      const policy = createScriptUrlPolicy(factory, ORIGIN);

      const url = policy.urlFor(BLOB_A);

      expect(url).toBe(BLOB_A);
    });

    it('WHEN urlFor has returned THEN createScriptURL refuses that same URL', () => {
      createScriptUrlPolicy(factory, ORIGIN).urlFor(BLOB_A);

      const createScriptURL = givenScriptUrl();

      expect((): string => createScriptURL(BLOB_A)).toThrow('tc-elk');
    });

    it('WHEN urlFor has returned THEN createScriptURL refuses any other URL', () => {
      createScriptUrlPolicy(factory, ORIGIN).urlFor(BLOB_A);

      const createScriptURL = givenScriptUrl();

      expect((): string => createScriptURL(BLOB_B)).toThrow('tc-elk');
    });

    it('WHEN urlFor was never called THEN createScriptURL refuses every URL', () => {
      createScriptUrlPolicy(factory, ORIGIN);

      const createScriptURL = givenScriptUrl();

      expect((): string => createScriptURL(BLOB_A)).toThrow('tc-elk');
    });

    it('WHEN two URLs are asked for THEN createPolicy is not called again', () => {
      const policy = createScriptUrlPolicy(factory, ORIGIN);

      policy.urlFor(BLOB_A);
      policy.urlFor(BLOB_B);

      expect(createPolicy).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a URL that is not a blob URL of the page origin', () => {
    it.each([
      { kind: 'an https URL', url: `${ORIGIN}/main.js` },
      { kind: 'a blob URL of another origin', url: 'blob:https://evil.test/a' },
      { kind: 'a blob URL whose origin only starts like the page origin', url: `blob:${ORIGIN}.evil.test/a` },
      { kind: 'a data URL', url: 'data:text/javascript,1' }
    ])('WHEN urlFor is asked for $kind THEN the policy refuses it', ({ url }) => {
      const policy = createScriptUrlPolicy(factory, ORIGIN);

      expect((): string => policy.urlFor(url)).toThrow('tc-elk');
    });
  });
});
