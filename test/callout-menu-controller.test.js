const test = require("node:test");
const assert = require("node:assert/strict");

const {
    resolveDefaultPlaceCursorOnNextLine,
    resolvePlaceCursorOnNextLine
} = require("../src/insertion-mode");

test("alternate insertion mode inverts a default header-line insert", () => {
    assert.equal(resolvePlaceCursorOnNextLine(false, false), false);
    assert.equal(resolvePlaceCursorOnNextLine(false, true), true);
});

test("alternate insertion mode inverts a default next-line insert", () => {
    assert.equal(resolvePlaceCursorOnNextLine(true, false), true);
    assert.equal(resolvePlaceCursorOnNextLine(true, true), false);
});

test("nested callout inserts default to the next content line", () => {
    assert.equal(resolveDefaultPlaceCursorOnNextLine(false, true, false), true);
});

test("top-level callout inserts keep the configured cursor placement default", () => {
    assert.equal(resolveDefaultPlaceCursorOnNextLine(false, false, false), false);
});

test("selection wrapping keeps the configured cursor placement default", () => {
    assert.equal(resolveDefaultPlaceCursorOnNextLine(false, true, true), false);
});
