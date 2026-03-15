const { Modal, setIcon } = require("obsidian");
const { GroupedSectionContainer } = require("./grouped-section-container");

class CalloutPickerModal extends Modal {
    constructor(app, options) {
        super(app);
        this.controller = options.controller;
        this.options = options.options;
        this.activeType = options.activeType || "";
        this.onChoose = options.onChoose;
        this.onClear = options.onClear;
    }

    onOpen() {
        this.modalEl.addClass("custom-callout-picker-modal");
        this.contentEl.empty();

        const shell = this.contentEl.createDiv({ cls: "custom-callout-context-menu-shell custom-callout-picker-shell" });
        const searchWrap = shell.createDiv({ cls: "custom-callout-context-menu-search" });
        const searchInput = searchWrap.createEl("input", {
            cls: "custom-callout-context-menu-search-input",
            attr: {
                type: "text",
                placeholder: "Search callouts"
            }
        });

        const content = shell.createDiv({ cls: "custom-callout-context-menu-content" });
        const sections = new GroupedSectionContainer(
            content,
            (parent, sectionKey, label) => {
                const wrapper = parent.createDiv({ cls: "custom-callout-context-menu-group", attr: { "data-section": sectionKey } });
                wrapper.createDiv({ cls: "custom-callout-context-menu-group-label", text: this.controller.formatTitle(label || sectionKey) });
                return wrapper;
            },
            (wrapper, sectionKey) => wrapper.createDiv({ cls: "custom-callout-context-menu-section", attr: { "data-section": sectionKey } })
        );

        this.modalEl.style.setProperty("--custom-callout-max-rows", String(this.controller.getMaxRowsPerColumn()));
        this.modalEl.style.setProperty("--custom-callout-group-columns", String(this.controller.getMaxGroupColumns()));

        let itemIndex = 0;
        for (const option of this.options) {
            const itemNode = this.createItemNode(option, itemIndex);
            itemIndex += 1;
            if (option.isCustom) {
                sections.getSectionEntry(option.group || "custom", option.group || "custom").section.appendChild(itemNode);
            } else {
                sections.getSectionEntry("builtin", "builtin").section.appendChild(itemNode);
            }
        }

        sections.getSectionEntry("utility", "utility").section.appendChild(this.createUtilityNode(itemIndex));

        const applyFilter = () => {
            const query = searchInput.value.trim().toLowerCase();
            const menuItems = Array.from(this.contentEl.querySelectorAll(".custom-callout-context-menu-item"));
            let bestMatch = null;

            for (const itemNode of menuItems) {
                itemNode.removeClass("is-search-top-result");
                const score = this.controller.getMenuItemSearchScore(itemNode, query);
                const isVisible = score > 0;
                itemNode.toggleClass("is-search-hidden", !isVisible);
                itemNode.style.order = query.length === 0
                    ? itemNode.getAttribute("data-default-order") || "0"
                    : String(100000 - score);

                if (!isVisible) {
                    continue;
                }

                if (
                    bestMatch === null ||
                    score > bestMatch.score ||
                    (score === bestMatch.score && this.controller.compareMenuItems(itemNode, bestMatch.itemNode) < 0)
                ) {
                    bestMatch = { itemNode, score };
                }
            }

            sections.toggleEmptySections(".custom-callout-context-menu-item", "is-search-hidden");

            if (bestMatch) {
                bestMatch.itemNode.addClass("is-search-top-result");
            }
        };

        searchInput.addEventListener("input", applyFilter);
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                const bestMatch = this.contentEl.querySelector(".custom-callout-context-menu-item.is-search-top-result");
                if (bestMatch) {
                    event.preventDefault();
                    bestMatch.click();
                }
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                this.close();
            }
        });

        window.setTimeout(() => {
            searchInput.focus();
            searchInput.select();
        }, 0);

        applyFilter();
    }

    createItemNode(option, defaultOrder) {
        const itemNode = this.contentEl.createDiv({ cls: "menu-item custom-callout-context-menu-item" });
        itemNode.setAttribute("data-callout-id", option.id);
        itemNode.setAttribute("data-callout-custom", String(option.isCustom));
        itemNode.setAttribute("data-callout-group", option.group || "");
        itemNode.setAttribute("data-callout-concept", option.concept || "");
        itemNode.setAttribute("data-callout-search", this.controller.buildSearchText(option));
        itemNode.setAttribute("data-default-order", String(defaultOrder));
        itemNode.style.setProperty("--custom-callout-context-color", option.color);

        const iconEl = itemNode.createDiv({ cls: "menu-item-icon" });
        if (option.icon) {
            setIcon(iconEl, option.icon);
        }

        itemNode.createDiv({
            cls: "menu-item-title",
            text: this.controller.formatTitle(option.id)
        });

        if (this.controller.isOptionActive(option, this.activeType)) {
            const checkEl = itemNode.createDiv({ cls: "menu-item-icon menu-item-icon-end" });
            setIcon(checkEl, "check");
        }

        itemNode.addEventListener("click", () => {
            this.onChoose(option);
            this.close();
        });

        return itemNode;
    }

    createUtilityNode(defaultOrder) {
        const itemNode = this.contentEl.createDiv({ cls: "menu-item custom-callout-context-menu-item" });
        itemNode.setAttribute("data-callout-id", "none");
        itemNode.setAttribute("data-callout-custom", "false");
        itemNode.setAttribute("data-callout-search", "none clear remove");
        itemNode.setAttribute("data-default-order", String(defaultOrder));
        itemNode.style.setProperty("--custom-callout-context-color", "128, 128, 128");

        const iconEl = itemNode.createDiv({ cls: "menu-item-icon" });
        setIcon(iconEl, "eraser");
        itemNode.createDiv({ cls: "menu-item-title", text: "None" });

        itemNode.addEventListener("click", () => {
            this.onClear();
            this.close();
        });

        return itemNode;
    }
}

module.exports = {
    CalloutPickerModal
};
