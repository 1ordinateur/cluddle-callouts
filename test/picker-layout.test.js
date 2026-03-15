const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPickerSections, getSectionDescriptor } = require("../src/picker-layout");

test("custom metadata groups become separate outer sections", () => {
    const sections = buildPickerSections([
        { id: "alpha-one", isCustom: true, group: "alpha" },
        { id: "alpha-two", isCustom: true, group: "alpha" },
        { id: "beta-one", isCustom: true, group: "beta" },
        { id: "note", isCustom: false }
    ]);

    assert.deepEqual(
        sections.map((section) => ({
            key: section.key,
            ids: section.options.map((option) => option.id)
        })),
        [
            { key: "alpha", ids: ["alpha-one", "alpha-two"] },
            { key: "beta", ids: ["beta-one"] },
            { key: "builtin", ids: ["note"] },
            { key: "utility", ids: [] }
        ]
    );
});

test("utility section stays separate from metadata groups", () => {
    assert.deepEqual(
        getSectionDescriptor({ id: "none", isCustom: false }),
        { key: "utility", label: "utility" }
    );
});
