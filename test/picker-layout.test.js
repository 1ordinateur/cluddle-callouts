const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildPickerColumnBlocks,
    buildPickerSections,
    getSectionDescriptor
} = require("../src/picker-layout");

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
            { key: "custom:alpha", ids: ["alpha-one", "alpha-two"] },
            { key: "custom:beta", ids: ["beta-one"] },
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

test("custom groups do not collide with reserved builtin or utility sections", () => {
    const sections = buildPickerSections([
        { id: "custom-builtin", isCustom: true, group: "builtin" },
        { id: "custom-utility", isCustom: true, group: "utility" },
        { id: "note", isCustom: false }
    ]);

    assert.deepEqual(
        sections.map((section) => ({
            key: section.key,
            label: section.label,
            ids: section.options.map((option) => option.id)
        })),
        [
            { key: "custom:builtin", label: "builtin", ids: ["custom-builtin"] },
            { key: "custom:utility", label: "utility", ids: ["custom-utility"] },
            { key: "builtin", label: "builtin", ids: ["note"] },
            { key: "utility", label: "utility", ids: [] }
        ]
    );
});

test("column blocks split one data type into new columns at maxRowsPerColumn", () => {
    const blocks = buildPickerColumnBlocks([
        { id: "alpha-one", isCustom: true, group: "alpha" },
        { id: "alpha-two", isCustom: true, group: "alpha" },
        { id: "alpha-three", isCustom: true, group: "alpha" },
        { id: "note", isCustom: false }
    ], 2);

    assert.deepEqual(
        blocks.map((block) => ({
            key: block.key,
            label: block.label,
            ids: block.options.map((option) => option.id)
        })),
        [
            { key: "custom:alpha:column:0", label: "alpha", ids: ["alpha-one", "alpha-two"] },
            { key: "custom:alpha:column:1", label: "alpha", ids: ["alpha-three"] },
            { key: "builtin:column:0", label: "builtin", ids: ["note"] },
            { key: "utility:column:0", label: "utility", ids: [] }
        ]
    );
});

test("built-in callouts also spill into separate labeled columns", () => {
    const blocks = buildPickerColumnBlocks([
        { id: "note", isCustom: false },
        { id: "abstract", isCustom: false },
        { id: "info", isCustom: false }
    ], 2);

    assert.deepEqual(
        blocks.map((block) => ({
            key: block.key,
            label: block.label,
            ids: block.options.map((option) => option.id)
        })),
        [
            { key: "builtin:column:0", label: "builtin", ids: ["note", "abstract"] },
            { key: "builtin:column:1", label: "builtin", ids: ["info"] },
            { key: "utility:column:0", label: "utility", ids: [] }
        ]
    );
});
