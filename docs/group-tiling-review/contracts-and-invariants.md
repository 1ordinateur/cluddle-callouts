contracts:
  - contract_id: CON-001
    statement: Metadata groups in the picker tile as outer layout blocks across configurable columns rather than stacking in a single vertical column.
    scope: picker layout
    enforced_in:
      - file: src/callout-picker-modal.js
        symbol: onOpen
      - file: styles.css
        symbol: .custom-callout-context-menu-content
  - contract_id: CON-002
    statement: The metadata group column count is configurable and clamped to the supported 1..3 range.
    scope: settings
    enforced_in:
      - file: src/main.js
        symbol: getMaxGroupColumns
      - file: src/settings-tab.js
        symbol: Metadata group columns setting
      - file: src/layout-settings.js
        symbol: clampGroupColumns
invariants:
  - invariant_id: INV-001
    contract_id: CON-001
    statement: A metadata group occupies its own outer grid block and never shares that block with another group.
    violation_signal: sections stack multiple metadata groups into the same outer block or column slot
    required_tests:
      - test_id: T-INV-001
        kind: invariant
        scenario: source/layout review confirms each group is rendered as an independent grid item
  - invariant_id: INV-002
    contract_id: CON-002
    statement: Group column settings cannot exceed the supported max of 3 or drop below 1.
    violation_signal: settings accept unsupported values and propagate them to the layout
    required_tests:
      - test_id: T-INV-002
        kind: invariant
        scenario: clampGroupColumns returns values only in the 1..3 range
feature_tests:
  - test_id: T-FEAT-001
    kind: behavior
    scenario: happy_path
    covers_contracts:
      - CON-002
    covers_invariants:
      - INV-002
  - test_id: T-FEAT-002
    kind: behavior
    scenario: edge_or_failure
    covers_contracts:
      - CON-002
    covers_invariants:
      - INV-002
