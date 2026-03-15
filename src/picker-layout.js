function getSectionDescriptor(option) {
    if (!option) {
        return null;
    }

    if (option.id === "none") {
        return { key: "utility", label: "utility" };
    }

    if (option.isCustom) {
        const groupName = option.group || "custom";
        return { key: `custom:${groupName}`, label: groupName };
    }

    return { key: "builtin", label: "builtin" };
}

function buildPickerSections(options, includeUtility = true) {
    const sections = [];
    const sectionMap = new Map();

    const ensureSection = (descriptor) => {
        if (!descriptor) {
            return null;
        }

        if (!sectionMap.has(descriptor.key)) {
            const section = {
                key: descriptor.key,
                label: descriptor.label,
                options: []
            };
            sectionMap.set(descriptor.key, section);
            sections.push(section);
        }

        return sectionMap.get(descriptor.key);
    };

    for (const option of options || []) {
        const section = ensureSection(getSectionDescriptor(option));
        if (section) {
            section.options.push(option);
        }
    }

    if (includeUtility) {
        ensureSection({ key: "utility", label: "utility" });
    }

    return sections;
}

function chunkOptions(options, maxItemsPerColumn) {
    const normalizedMax = Math.max(1, Number(maxItemsPerColumn) || 1);
    const chunks = [];

    for (let index = 0; index < options.length; index += normalizedMax) {
        chunks.push(options.slice(index, index + normalizedMax));
    }

    return chunks;
}

function buildPickerColumnBlocks(options, maxItemsPerColumn, includeUtility = true) {
    const columnBlocks = [];

    for (const section of buildPickerSections(options, includeUtility)) {
        const chunks = section.options.length > 0
            ? chunkOptions(section.options, maxItemsPerColumn)
            : [[]];

        chunks.forEach((chunk, chunkIndex) => {
            columnBlocks.push({
                key: `${section.key}:column:${chunkIndex}`,
                sectionKey: section.key,
                label: section.label,
                options: chunk,
                columnIndex: chunkIndex,
                showLabel: chunkIndex === 0
            });
        });
    }

    return columnBlocks;
}

function chunkBlocks(blocks, maxColumns) {
    const normalizedMax = Math.max(1, Number(maxColumns) || 1);
    const rows = [];

    for (let index = 0; index < blocks.length; index += normalizedMax) {
        rows.push(blocks.slice(index, index + normalizedMax));
    }

    return rows;
}

function buildPickerRows(options, maxItemsPerColumn, maxColumns, includeUtility = true) {
    const customBlocks = [];
    const builtinBlocks = [];
    const utilityBlocks = [];

    for (const block of buildPickerColumnBlocks(options, maxItemsPerColumn, includeUtility)) {
        if (block.sectionKey === "builtin") {
            builtinBlocks.push(block);
            continue;
        }

        if (block.sectionKey === "utility") {
            utilityBlocks.push(block);
            continue;
        }

        customBlocks.push(block);
    }

    const rows = [];
    chunkBlocks(customBlocks, maxColumns).forEach((blocks, rowIndex) => {
        rows.push({
            key: `custom-row:${rowIndex}`,
            kind: "custom",
            blocks
        });
    });

    const systemBlocks = [...builtinBlocks, ...utilityBlocks];
    chunkBlocks(systemBlocks, maxColumns).forEach((blocks, rowIndex) => {
        rows.push({
            key: `system-row:${rowIndex}`,
            kind: blocks.some((block) => block.sectionKey === "builtin") ? "builtin" : "utility",
            blocks
        });
    });

    return rows;
}

module.exports = {
    buildPickerRows,
    buildPickerColumnBlocks,
    buildPickerSections,
    chunkBlocks,
    chunkOptions,
    getSectionDescriptor
};
