import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createScriptUrlPolicy } from './script-url-policy.ts';
import { createPolicyMock } from '../test/mocks/elk.mock.ts';

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
      createScriptUrlPolicy(factory);

      expect(createPolicy).toHaveBeenCalledExactlyOnceWith('tc-elk', expect.any(Object));
    });

    it('WHEN the policy is created THEN it defines createScriptURL only', () => {
      createScriptUrlPolicy(factory);

      const [, options] = createPolicy.mock.calls[0] ?? [];

      expect(Object.keys(options ?? {})).toStrictEqual(['createScriptURL']);
    });

    it('WHEN a URL is asked for THEN the policy hands back that URL', () => {
      const policy = createScriptUrlPolicy(factory);

      const url = policy.urlFor('blob:a');

      expect(url).toBe('blob:a');
    });

    it('WHEN urlFor has returned THEN createScriptURL refuses that same URL', () => {
      createScriptUrlPolicy(factory).urlFor('blob:a');

      const createScriptURL = givenScriptUrl();

      expect((): string => createScriptURL('blob:a')).toThrow('tc-elk');
    });

    it('WHEN urlFor has returned THEN createScriptURL refuses any other URL', () => {
      createScriptUrlPolicy(factory).urlFor('blob:a');

      const createScriptURL = givenScriptUrl();

      expect((): string => createScriptURL('blob:other')).toThrow('tc-elk');
    });

    it('WHEN urlFor was never called THEN createScriptURL refuses every URL', () => {
      createScriptUrlPolicy(factory);

      const createScriptURL = givenScriptUrl();

      expect((): string => createScriptURL('blob:a')).toThrow('tc-elk');
    });

    it('WHEN two URLs are asked for THEN createPolicy is not called again', () => {
      const policy = createScriptUrlPolicy(factory);

      policy.urlFor('blob:a');
      policy.urlFor('blob:b');

      expect(createPolicy).toHaveBeenCalledOnce();
    });
  });
});
