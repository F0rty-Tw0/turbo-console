import { resolve } from 'node:path';

import { runTests, runVSCodeCommand } from '@vscode/test-electron';

import { VSCODE_TEST_VERSION } from './integration.const.ts';

const packageRoot = resolve(import.meta.dirname, '..');
const vsixPath = resolve(packageRoot, '.vsix/turbo-console.vsix');
const extensionDevelopmentPath = resolve(import.meta.dirname, 'harness');
const extensionTestsPath = resolve(packageRoot, 'dist-test/suite.cjs');
const cachePath = resolve(packageRoot, '.vscode-test');
const installOptions = { cachePath, version: VSCODE_TEST_VERSION };
const testOptions = { cachePath, version: VSCODE_TEST_VERSION, extensionDevelopmentPath, extensionTestsPath };

await runVSCodeCommand(['--install-extension', vsixPath], installOptions);
await runTests(testOptions);
