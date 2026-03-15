usable_now:
  - metadata groups tile across outer columns as independent group blocks
  - inner per-group spill still follows maxRowsPerColumn
  - metadata group columns clamp to 1..3
  - reserved custom group names no longer collide with builtin or utility sections
final_commit: 610d4ad
validation:
  - npm test
  - npm run build
notes:
  - docs/group-tiling-review is local-only and intentionally uncommitted
