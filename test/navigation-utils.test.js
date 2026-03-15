const test = require("node:test");
const assert = require("node:assert/strict");

const { getRelativeIndex, moveGridSelection } = require("../src/navigation-utils");
const { clampModalHeightVh, clampModalWidthRem } = require("../src/layout-settings");

test("getRelativeIndex moves forward with wraparound", () => {
    assert.equal(getRelativeIndex(-1, 4, 1), 0);
    assert.equal(getRelativeIndex(0, 4, 1), 1);
    assert.equal(getRelativeIndex(3, 4, 1), 0);
});

test("getRelativeIndex moves backward with wraparound", () => {
    assert.equal(getRelativeIndex(-1, 4, -1), 3);
    assert.equal(getRelativeIndex(3, 4, -1), 2);
    assert.equal(getRelativeIndex(0, 4, -1), 3);
});

test("getRelativeIndex handles empty item sets", () => {
    assert.equal(getRelativeIndex(0, 0, 1), -1);
});

test("moveGridSelection moves down within a column before spilling to the next column", () => {
    assert.deepEqual(moveGridSelection([3, 2, 1], 0, 0, "down"), { columnIndex: 0, rowIndex: 1 });
    assert.deepEqual(moveGridSelection([3, 2, 1], 0, 2, "down"), { columnIndex: 1, rowIndex: 0 });
    assert.deepEqual(moveGridSelection([3, 2, 1], 2, 0, "down"), { columnIndex: 0, rowIndex: 0 });
});

test("moveGridSelection moves up within a column before spilling to the previous column", () => {
    assert.deepEqual(moveGridSelection([3, 2, 1], 1, 1, "up"), { columnIndex: 1, rowIndex: 0 });
    assert.deepEqual(moveGridSelection([3, 2, 1], 1, 0, "up"), { columnIndex: 0, rowIndex: 2 });
    assert.deepEqual(moveGridSelection([3, 2, 1], 0, 0, "up"), { columnIndex: 2, rowIndex: 0 });
});

test("moveGridSelection moves left and right across columns while preserving row where possible", () => {
    assert.deepEqual(moveGridSelection([3, 2, 1], 0, 1, "right"), { columnIndex: 1, rowIndex: 1 });
    assert.deepEqual(moveGridSelection([3, 2, 2], 1, 1, "right"), { columnIndex: 2, rowIndex: 1 });
    assert.deepEqual(moveGridSelection([3, 1, 2], 0, 2, "right"), { columnIndex: 1, rowIndex: 0 });
    assert.deepEqual(moveGridSelection([3, 2, 1], 0, 1, "left"), { columnIndex: 2, rowIndex: 0 });
});

test("moveGridSelection falls back to the first or last visible item when there is no current selection", () => {
    assert.deepEqual(moveGridSelection([2, 2], -1, -1, "down"), { columnIndex: 0, rowIndex: 0 });
    assert.deepEqual(moveGridSelection([2, 2], -1, -1, "right"), { columnIndex: 0, rowIndex: 0 });
    assert.deepEqual(moveGridSelection([2, 2], -1, -1, "up"), { columnIndex: 1, rowIndex: 1 });
    assert.deepEqual(moveGridSelection([2, 2], -1, -1, "left"), { columnIndex: 1, rowIndex: 1 });
});

test("clampModalWidthRem enforces width bounds", () => {
    assert.equal(clampModalWidthRem("foo", 42), 42);
    assert.equal(clampModalWidthRem(12, 42), 24);
    assert.equal(clampModalWidthRem(48, 42), 48);
    assert.equal(clampModalWidthRem(120, 42), 72);
});

test("clampModalHeightVh enforces height bounds", () => {
    assert.equal(clampModalHeightVh("foo", 82), 82);
    assert.equal(clampModalHeightVh(20, 82), 40);
    assert.equal(clampModalHeightVh(75, 82), 75);
    assert.equal(clampModalHeightVh(120, 82), 95);
});
