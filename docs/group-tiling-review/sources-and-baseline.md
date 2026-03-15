repo_path: /mnt/d/github_remotes/cluddle-callouts
base_branch: main
target_branch: main
work_branch: main
feature_name: group-tiling-review
preflight:
  multi_agent_available: true
  role_strategy: native codex reviewer agents
baseline:
  scope:
    - make metadata groups tile across outer columns in the picker
    - add configurable metadata group column count capped at 3
    - preserve inner per-group spill behavior controlled by maxRowsPerColumn
    - keep runtime artifact generation and shipped root files coherent
  constraints:
    - do not commit docs/group-tiling-review artifacts
    - keep live artifact shape as manifest.json + main.js + styles.css
