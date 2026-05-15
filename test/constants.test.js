const test = require("node:test");
const assert = require("node:assert/strict");

const {
    BUNDLED_CALLOUTS,
    BUILTIN_CALLOUT_ICONS,
    DEFAULT_CALLOUT_ICON,
    DEFAULT_SETTINGS
} = require("../src/constants");

test("defaults edited callout title color to black", () => {
    assert.equal(DEFAULT_SETTINGS.nonDefaultCalloutTitleColor, "#000000");
});

test("shows the bundled Cluddle callout by default", () => {
    assert.equal(DEFAULT_SETTINGS.showBundledCluddleCallout, true);
    assert.deepEqual(BUNDLED_CALLOUTS[0], {
        id: "cluddle",
        group: "default",
        concept: "default",
        icon: "cloud"
    });
});

test("defines default and built-in callout picker icons", () => {
    assert.equal(DEFAULT_CALLOUT_ICON, "message-square");
    assert.equal(BUILTIN_CALLOUT_ICONS.note, "pencil");
    assert.equal(BUILTIN_CALLOUT_ICONS.important, "flame");
    assert.equal(BUILTIN_CALLOUT_ICONS.warning, "triangle-alert");
    assert.equal(BUILTIN_CALLOUT_ICONS.cite, "quote");
});
