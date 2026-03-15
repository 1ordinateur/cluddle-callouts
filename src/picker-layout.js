function getSectionDescriptor(option) {
    if (!option) {
        return null;
    }

    if (option.id === "none") {
        return { key: "utility", label: "utility" };
    }

    if (option.isCustom) {
        const groupName = option.group || "custom";
        return { key: groupName, label: groupName };
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

module.exports = {
    buildPickerSections,
    getSectionDescriptor
};
