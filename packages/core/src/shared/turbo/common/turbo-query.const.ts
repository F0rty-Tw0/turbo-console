const PACKAGE_FIELDS = `name
        path
        tags
        directDependencies { items { name } }
        tasks {
          items {
            fullName
            command
            script
            tags
            directDependencies { items { fullName } }
          }
        }`;

/**
 * Every package (root `//` excluded: turbo omits it from `nodes`) with its tasks, plus the package edges. `root` is the
 * `//` package: `null` when turbo has none.
 */
export const PACKAGE_GRAPH_QUERY = `query PackageGraph {
  packageGraph {
    nodes {
      items {
        ${PACKAGE_FIELDS}
      }
    }
    edges { items { source target kind { kind } } }
  }
  root: package(name: "//") {
    ${PACKAGE_FIELDS}
  }
}
`;

/** Tasks affected between two git refs; pass `base` and `head` as variables through `-V <file>`. */
export const AFFECTED_TASKS_QUERY = `query AffectedTasks($base: String, $head: String) {
  affectedTasks(base: $base, head: $head) {
    items { fullName reason { __typename } }
  }
}
`;
