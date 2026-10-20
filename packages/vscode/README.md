# Turbo Console (unofficial)

Turbo Console is a VS Code extension for Turborepo workspaces. It lists each turbo root's packages and tasks in a sidebar and runs turbo tasks from the editor.

Unofficial. Not affiliated with or endorsed by Vercel or the Turborepo team.

## What it does

- **Packages view:** every package with its tasks, shown as folders or as a flat list (`turboConsole.treeMode`). Set `turboConsole.icons` to `theme` to draw folder and package rows with your file icon theme (one with folder icons, such as Material Icon Theme or vscode-icons).
- **Run and Stop:** run a task from its row. The row shows how it ended, plus the cache status and duration once turbo's run summary is found.
- **Palette:** Run Task… picks a task and then a package. Run Turbo Task… (also the play button on an open `package.json`) runs one of that package's tasks.
- **Common Commands view:** Run Task in All Packages…, Run Affected… and Refresh.
- **Package and task rows:** Copy Command puts `turbo run <task> --filter=<package>` on the clipboard, quoted for your terminal's shell. Open package.json, Reveal in Explorer and Copy Path are there too.
- **Help and Feedback view:** links to the project page on GitHub, the bug tracker and the Turborepo docs.

## Good to know

- A run from a task row or from Run Turbo Task… passes `--summarize`, so turbo adds one file per run to `.turbo/runs` in your workspace. Turbo never prunes that folder and the extension never deletes it. Run Task in All Packages… and Run Affected… do not write a summary.
- Run Affected… needs a git repository, because turbo works out what changed from git.
- `turboConsole.turboPath` is machine-scoped: set it in your user settings. A workspace's `.vscode/settings.json` cannot change which turbo binary runs.

## Compatibility

- `engines.vscode`: `^1.139.0` (VS Code stable 1.141.0 minus two minors, checked 2026-10-11)
- `@types/vscode`: `1.138.0` (no 1.139.x release exists; 1.138.0 is the newest that does not exceed `engines.vscode`)
- `@types/vscode` is pinned literally (not via the catalog) because vsce 4.0.0 cannot parse `catalog:` and fails with "Failed to parse semver of @types/vscode".
