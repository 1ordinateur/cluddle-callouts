const test = require("node:test");
const assert = require("node:assert/strict");

const { DEFAULT_SETTINGS } = require("../src/constants");

test("defaults edited callout title color to black", () => {
    assert.equal(DEFAULT_SETTINGS.nonDefaultCalloutTitleColor, "#000000");
});
