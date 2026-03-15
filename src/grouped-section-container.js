class GroupedSectionContainer {
    constructor(contentEl, createWrapper, createSection) {
        this.contentEl = contentEl;
        this.createWrapper = createWrapper;
        this.createSection = createSection;
        this.entries = new Map();
    }

    getSectionEntry(sectionKey, label) {
        if (this.entries.has(sectionKey)) {
            return this.entries.get(sectionKey);
        }

        const wrapper = this.createWrapper(this.contentEl, sectionKey, label);
        const section = this.createSection(wrapper, sectionKey);
        const entry = { wrapper, section };
        this.entries.set(sectionKey, entry);
        return entry;
    }

    toggleEmptySections(querySelector, hiddenClassName) {
        for (const entry of this.entries.values()) {
            const visibleItems = Array.from(entry.section.querySelectorAll(querySelector))
                .filter((itemNode) => !itemNode.classList.contains(hiddenClassName) && !itemNode.hasClass?.(hiddenClassName));
            entry.wrapper.classList?.toggle("is-empty", visibleItems.length === 0);
            entry.wrapper.toggleClass?.("is-empty", visibleItems.length === 0);
        }
    }

    values() {
        return this.entries.values();
    }
}

module.exports = {
    GroupedSectionContainer
};
