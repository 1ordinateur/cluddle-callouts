const test = require("node:test");
const assert = require("node:assert/strict");

const { getRelativeIndex } = require("../src/navigation-utils");

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
