repo_path: /mnt/d/github_remotes/cluddle-callouts
base_branch: main
target_branch: main
work_branch: main
feature_name: group-tiling-review
scope_in:
  - outer metadata groups tile as separate blocks across configurable columns
  - groups never share the same outer column block
  - inner callout spill still uses maxRowsPerColumn within each group
  - two-agent review/fix cycles on concrete commits until both pass
scope_out:
  - GitHub Actions release automation
  - merge execution
success_criteria:
  - npm test passes
  - npm run build passes
  - two independent reviewer agents report PASS on the final commit
  - final commit excludes docs/group-tiling-review artifacts
unknown_fields: []
constraints:
  - metadata group columns must clamp to 1..3
