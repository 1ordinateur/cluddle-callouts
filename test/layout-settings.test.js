const test = require("node:test");
const assert = require("node:assert/strict");

const {
    MAX_GROUP_COLUMNS,
    MAX_ROWS_PER_COLUMN,
    clampGroupColumns,
    clampRowsPerColumn
} = require("../src/layout-settings");

test("clampRowsPerColumn enforces numeric bounds", () => {
    assert.equal(clampRowsPerColumn(undefined, 8), 8);
    assert.equal(clampRowsPerColumn("2", 8), 2);
    assert.equal(clampRowsPerColumn("0", 8), 1);
    assert.equal(clampRowsPerColumn("99", 8), MAX_ROWS_PER_COLUMN);
});

test("clampGroupColumns enforces the 1..3 metadata group column range", () => {
    assert.equal(clampGroupColumns(undefined, 3), 3);
    assert.equal(clampGroupColumns("2", 3), 2);
    assert.equal(clampGroupColumns("0", 3), 1);
    assert.equal(clampGroupColumns("9", 3), MAX_GROUP_COLUMNS);
});
