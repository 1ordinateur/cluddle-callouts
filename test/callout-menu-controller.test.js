const test = require("node:test");
const assert = require("node:assert/strict");

const { resolvePlaceCursorOnNextLine } = require("../src/insertion-mode");

test("alternate insertion mode inverts a default header-line insert", () => {
    assert.equal(resolvePlaceCursorOnNextLine(false, false), false);
    assert.equal(resolvePlaceCursorOnNextLine(false, true), true);
});

test("alternate insertion mode inverts a default next-line insert", () => {
    assert.equal(resolvePlaceCursorOnNextLine(true, false), true);
    assert.equal(resolvePlaceCursorOnNextLine(true, true), false);
});
