/** Every package (root `//` excluded: turbo omits it from `nodes`) with its tasks, plus the package edges. */
export const PACKAGE_GRAPH_QUERY = `query PackageGraph {
  packageGraph {
    nodes {
      items {
        name
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
        }
      }
    }
    edges { items { source target kind { kind } } }
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
