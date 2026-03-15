const { Modal, setIcon } = require("obsidian");
const { movePickerSelection } = require("./navigation-utils");
const { buildPickerRows } = require("./picker-layout");

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

        this.modalEl.style.setProperty("--custom-callout-max-rows", String(this.controller.getMaxRowsPerColumn()));
        this.modalEl.style.setProperty("--custom-callout-group-columns", String(this.controller.getMaxGroupColumns()));
        this.modalEl.style.setProperty("--custom-callout-modal-width", `${this.controller.getModalWidthRem()}rem`);
        this.modalEl.style.setProperty("--custom-callout-modal-height", `${this.controller.getModalHeightVh()}vh`);

        let itemIndex = 0;
        const columnBlocks = [];
        const rowEntries = [];
        for (const row of buildPickerRows(
            this.options,
            this.controller.getMaxRowsPerColumn(),
            this.controller.getMaxGroupColumns()
        )) {
            const rowEl = content.createDiv({
                cls: "custom-callout-context-menu-row",
                attr: { "data-row-kind": row.kind }
            });
            const rowEntry = { rowEl, blocks: [] };

            for (const block of row.blocks) {
                const wrapper = rowEl.createDiv({
                    cls: "custom-callout-context-menu-group",
                    attr: {
                        "data-section": block.sectionKey,
                        "data-column-index": String(block.columnIndex)
                    }
                });

                wrapper.toggleClass("is-label-hidden", !block.showLabel);
                if (block.showLabel) {
                    wrapper.createDiv({
                        cls: "custom-callout-context-menu-group-label",
                        text: this.controller.formatTitle(block.label || block.sectionKey)
                    });
                }

                const section = wrapper.createDiv({
                    cls: "custom-callout-context-menu-section",
                    attr: { "data-section": block.sectionKey }
                });

                if (block.sectionKey === "utility") {
                    const itemNode = this.createUtilityNode(itemIndex);
                    itemIndex += 1;
                    section.appendChild(itemNode);
                } else {
                    for (const option of block.options) {
                        const itemNode = this.createItemNode(option, itemIndex);
                        itemIndex += 1;
                        section.appendChild(itemNode);
                    }
                }

                const blockEntry = { wrapper, section };
                columnBlocks.push(blockEntry);
                rowEntry.blocks.push(blockEntry);
            }

            rowEntries.push(rowEntry);
        }

        let selectedItemNode = null;
        let lastAppliedQuery = null;
        const getVisibleMenuItems = () => Array.from(this.contentEl.querySelectorAll(".custom-callout-context-menu-item"))
            .filter((itemNode) => !itemNode.hasClass("is-search-hidden"));
            const compareVisibleItems = (a, b) => {
            const aOrder = Number(a.style.order || a.getAttribute("data-default-order") || "0");
            const bOrder = Number(b.style.order || b.getAttribute("data-default-order") || "0");
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return this.controller.compareMenuItems(a, b);
        };
        const getVisibleRows = () => rowEntries
            .map((rowEntry) => rowEntry.blocks
                .map((block) => Array.from(block.section.querySelectorAll(".custom-callout-context-menu-item"))
                    .filter((itemNode) => !itemNode.hasClass("is-search-hidden"))
                    .sort(compareVisibleItems))
                .filter((items) => items.length > 0))
            .filter((columns) => columns.length > 0);
        const setSelectedItem = (itemNode) => {
            const menuItems = Array.from(this.contentEl.querySelectorAll(".custom-callout-context-menu-item"));
            for (const currentItem of menuItems) {
                currentItem.removeClass("is-search-top-result");
            }

            selectedItemNode = itemNode || null;
            if (!selectedItemNode) {
                return;
            }

            selectedItemNode.addClass("is-search-top-result");
            selectedItemNode.scrollIntoView({ block: "nearest", inline: "nearest" });
        };
        const moveSelectionInGrid = (direction) => {
            const visibleRows = getVisibleRows();
            if (visibleRows.length === 0) {
                return;
            }

            let currentVisibleRowIndex = -1;
            let currentVisibleColumnIndex = -1;
            let currentItemIndex = -1;
            if (selectedItemNode) {
                visibleRows.some((columns, rowIndex) => {
                    return columns.some((columnItems, columnIndex) => {
                        const itemIndex = columnItems.indexOf(selectedItemNode);
                        if (itemIndex === -1) {
                            return false;
                        }

                        currentVisibleRowIndex = rowIndex;
                        currentVisibleColumnIndex = columnIndex;
                        currentItemIndex = itemIndex;
                        return true;
                    });
                });
            }

            const target = movePickerSelection(
                visibleRows.map((columns) => columns.map((items) => items.length)),
                currentVisibleRowIndex,
                currentVisibleColumnIndex,
                currentItemIndex,
                direction
            );
            if (target) {
                setSelectedItem(visibleRows[target.rowIndex][target.columnIndex][target.itemIndex]);
            }
        };

        const applyFilter = () => {
            const query = searchInput.value.trim().toLowerCase();
            const queryChanged = query !== lastAppliedQuery;
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

            for (const block of columnBlocks) {
                const visibleItems = Array.from(block.section.querySelectorAll(".custom-callout-context-menu-item"))
                    .filter((itemNode) => !itemNode.hasClass("is-search-hidden"));
                block.wrapper.toggleClass("is-empty", visibleItems.length === 0);
            }

            for (const rowEntry of rowEntries) {
                rowEntry.rowEl.toggleClass("is-empty", rowEntry.blocks.every((block) => block.wrapper.hasClass("is-empty")));
            }

            const visibleItems = getVisibleMenuItems();
            if (visibleItems.length === 0) {
                setSelectedItem(null);
                lastAppliedQuery = query;
                return;
            }

            if (!queryChanged && selectedItemNode && visibleItems.includes(selectedItemNode)) {
                setSelectedItem(selectedItemNode);
                lastAppliedQuery = query;
                return;
            }

            setSelectedItem(bestMatch ? bestMatch.itemNode : visibleItems.sort(compareVisibleItems)[0]);
            lastAppliedQuery = query;
        };

        searchInput.addEventListener("input", applyFilter);
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                moveSelectionInGrid("down");
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                moveSelectionInGrid("up");
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                moveSelectionInGrid("right");
                return;
            }

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveSelectionInGrid("left");
                return;
            }

            if (event.key === "Enter") {
                if (selectedItemNode) {
                    event.preventDefault();
                    selectedItemNode.click();
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
