# Changelog

## 0.1.0 (pre-release)

This build is published as `turbo-console-dev.turbo-console`. A later Marketplace release may use a different publisher ID; uninstall this copy before installing that one.

- Packages view: every package with its tasks, shown as folders or as a flat list, with icons from your file icon theme.
- Show Scripts and Hide Scripts: list a package's `package.json` scripts next to its turbo tasks, or hide them.
- Show Package Scopes and Hide Package Scopes: show the `@scope/` prefix on package names, or hide it.
- Run and Stop a task from its row. The row shows how the run ended, its cache status and its duration.
- Run Task Without Cache: run one task with turbo's cache skipped.
- Run Without Turbo: run a task's `package.json` script through your package manager in a terminal, so you can type into it.
- Run with Options…: pick the options for one run from a checklist, such as without cache, only this task, keep going after a failure, a concurrency and extra arguments.
- Run Task… and Run Turbo Task…: pick a task and a package from the Command Palette, or use the play button on an open `package.json` to run one of its package's tasks.
- Common Commands view: Run Task in All Packages, Run Affected and Refresh.
- Package Details page: open a package to see its Turbo tasks and Scripts as cards, with cache status and run state.
- Package Graph and Task Graph: browse the package and task dependency graphs, grouped in folders. Task cards show run state and a live clock while a task runs.
- Show All Task Graphs: open the task graph with every task of the workspace.
- Focus on Graph: from a package or task row, open the graph on that package.
- Show Cache Prediction and Show Affected: overlays that mark which tasks turbo would replay from cache and which packages your changes affect.
- Copy Command puts the turbo command for a task on the clipboard, quoted for your terminal's shell.
- Help and Feedback view: links to the project page, the bug tracker and the Turborepo docs.
- Requires VS Code 1.144 or later.
