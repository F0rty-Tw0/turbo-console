import { expect, test } from './details.fixture.ts';
import { MISSING_PACKAGE_STUB } from './test/stubs/details-state.stub.ts';
import type { MissingPackage } from '../src/bridge/common/details-state.type.ts';

const LABELLED: MissingPackage = { ...MISSING_PACKAGE_STUB, packageName: '//', label: 'single-app' };

test.describe('FEATURE: package details page, a package that left the model', () => {
  test('GIVEN a missing package with a last known label, the heading reads the label', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the missing state', async (): Promise<void> => detailsPage.open(LABELLED));

    await test.step('THEN the heading is the label', async (): Promise<void> => expect(detailsPage.heading).toHaveText('single-app'));
  });

  test('GIVEN a missing package with no label, the heading reads the package name', async ({ detailsPage }): Promise<void> => {
    await test.step('WHEN the page shows the missing state', async (): Promise<void> => detailsPage.open(MISSING_PACKAGE_STUB));

    await test.step('THEN the heading is the package name', async (): Promise<void> => expect(detailsPage.heading).toHaveText('web'));
  });
});
