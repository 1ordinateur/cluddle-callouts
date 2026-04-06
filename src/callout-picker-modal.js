const { Modal, setIcon } = require("obsidian");
const { DEFAULT_SETTINGS } = require("./constants");
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
        this.includeUtility = options.includeUtility !== false;
        this.itemNodeActions = new WeakMap();
    }

    runItemAction(itemNode, useAlternateInsertionMode = false) {
        if (!itemNode) {
            return;
        }

        const action = this.itemNodeActions.get(itemNode);
        if (typeof action === "function") {
            action(useAlternateInsertionMode);
        }
    }

    onOpen() {
        this.itemNodeActions = new WeakMap();
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

        let itemIndex = 0;
        const columnBlocks = [];
        const rowEntries = [];
        for (const row of buildPickerRows(
            this.options,
            DEFAULT_SETTINGS.maxRowsPerColumn,
            DEFAULT_SETTINGS.maxGroupColumns,
            this.includeUtility
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
                const labelEl = wrapper.createDiv({
                    cls: "custom-callout-context-menu-group-label",
                    text: this.controller.formatTitle(block.label || block.sectionKey)
                });
                labelEl.toggleClass("is-placeholder", !block.showLabel);
                if (!block.showLabel) {
                    labelEl.setAttribute("aria-hidden", "true");
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
        let activeQuery = "";
        let scoreByItem = new Map();

        const getVisibleMenuItems = () => Array.from(this.contentEl.querySelectorAll(".custom-callout-context-menu-item"))
            .filter((itemNode) => !itemNode.hasClass("is-search-hidden"));

        const compareVisibleItems = (a, b) => {
            if (activeQuery.length > 0) {
                const scoreDelta = (scoreByItem.get(b) || 0) - (scoreByItem.get(a) || 0);
                if (scoreDelta !== 0) {
                    return scoreDelta;
                }
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
            activeQuery = query;
            const menuItems = Array.from(this.contentEl.querySelectorAll(".custom-callout-context-menu-item"));
            scoreByItem = new Map();
            let bestMatch = null;

            for (const itemNode of menuItems) {
                itemNode.removeClass("is-search-top-result");
                const score = this.controller.getMenuItemSearchScore(itemNode, query);
                scoreByItem.set(itemNode, score);
                const isVisible = score > 0;
                itemNode.toggleClass("is-search-hidden", !isVisible);

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
                const items = Array.from(block.section.querySelectorAll(".custom-callout-context-menu-item"));
                items.sort(compareVisibleItems);
                for (const itemNode of items) {
                    block.section.appendChild(itemNode);
                }

                const visibleItems = items.filter((itemNode) => !itemNode.hasClass("is-search-hidden"));
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
                    this.runItemAction(selectedItemNode, event.altKey === true);
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

        const appearanceEl = itemNode.createDiv({ cls: "custom-callout-context-menu-appearance callout" });
        appearanceEl.setAttribute("data-callout", option.appearanceId || option.id);

        appearanceEl.createDiv({ cls: "custom-callout-context-menu-swatch" });
        appearanceEl.createDiv({
            cls: "menu-item-title",
            text: this.controller.formatTitle(option.id)
        });

        if (this.controller.isOptionActive(option, this.activeType)) {
            const checkEl = appearanceEl.createDiv({ cls: "menu-item-icon menu-item-icon-end" });
            setIcon(checkEl, "check");
        }

        this.itemNodeActions.set(itemNode, (useAlternateInsertionMode) => {
            this.onChoose(option, { useAlternateInsertionMode });
            this.close();
        });

        itemNode.addEventListener("click", (event) => {
            this.runItemAction(itemNode, event.altKey === true);
        });

        return itemNode;
    }

    createUtilityNode(defaultOrder) {
        const itemNode = this.contentEl.createDiv({ cls: "menu-item custom-callout-context-menu-item" });
        itemNode.setAttribute("data-callout-id", "none");
        itemNode.setAttribute("data-callout-custom", "false");
        itemNode.setAttribute("data-callout-search", "none clear remove");
        itemNode.setAttribute("data-default-order", String(defaultOrder));

        const appearanceEl = itemNode.createDiv({ cls: "custom-callout-context-menu-appearance" });
        const iconEl = appearanceEl.createDiv({ cls: "menu-item-icon" });
        setIcon(iconEl, "eraser");
        appearanceEl.createDiv({ cls: "menu-item-title", text: "None" });

        this.itemNodeActions.set(itemNode, () => {
            if (typeof this.onClear === "function") {
                this.onClear();
            }
            this.close();
        });

        itemNode.addEventListener("click", () => {
            this.runItemAction(itemNode);
        });

        return itemNode;
    }
}

module.exports = {
    CalloutPickerModal
};
