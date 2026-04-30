const test = require("node:test");
const assert = require("node:assert/strict");

const {
    extractCalloutId,
    formatDefaultCalloutTitle,
    normalizeRenderedCalloutTitle,
    hasNonDefaultCalloutTitle
} = require("../src/callout-title-style");

test("formats default callout titles from the callout id", () => {
    assert.equal(formatDefaultCalloutTitle("note"), "Note");
    assert.equal(formatDefaultCalloutTitle("my-callout"), "My callout");
    assert.equal(formatDefaultCalloutTitle("my_callout"), "My callout");
});

test("normalizes rendered callout title whitespace", () => {
    assert.equal(normalizeRenderedCalloutTitle("  My   custom   title  "), "My custom title");
});

test("extracts a callout id from rendered callout metadata", () => {
    assert.equal(extractCalloutId("note"), "note");
    assert.equal(extractCalloutId("my-callout"), "my-callout");
    assert.equal(extractCalloutId("my-callout fold"), "my-callout");
    assert.equal(extractCalloutId(""), "");
});

test("detects when a callout title differs from the default title", () => {
    assert.equal(hasNonDefaultCalloutTitle("note", "Note"), false);
    assert.equal(hasNonDefaultCalloutTitle("my-callout", "My callout"), false);
    assert.equal(hasNonDefaultCalloutTitle("note", "Plan for today"), true);
    assert.equal(hasNonDefaultCalloutTitle("note", "  Plan   for today "), true);
});
