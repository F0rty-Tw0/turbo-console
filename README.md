# turbo-console

A VS Code extension for Turborepo workspaces: browse packages and tasks, see the task graph, and run tasks from the editor. Work in progress.

Unofficial. Not affiliated with or endorsed by Vercel or the Turborepo team.

`.vscode/settings.json` pins the editor to TypeScript 6 (`node_modules/typescript`): typescript-eslint and editors run on TS 6, while builds and typecheck use TS 7.

## Developer notes

- `engines.vscode`: `^1.139.0` (VS Code stable 1.141.0 minus two minors, checked 2026-10-11)
- `@types/vscode`: `1.138.0` (no 1.139.x release exists; 1.138.0 is the newest that does not exceed `engines.vscode`)
- `@types/vscode` is pinned literally (not via the catalog) because vsce 4.0.0 cannot parse `catalog:` and fails with "Failed to parse semver of @types/vscode".
