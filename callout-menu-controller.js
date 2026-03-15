const { Menu } = require("obsidian");
const { GroupedSectionContainer } = require("./grouped-section-container");
const { CalloutPickerModal } = require("./callout-picker-modal");
const { normalizeSearchText, getBestFuzzyScore } = require("./search-utils");

class CalloutMenuController {
    constructor(options) {
        this.app = options.app;
        this.registry = options.registry;
        this.editorService = options.editorService;
        this.getMaxRowsPerColumn = options.getMaxRowsPerColumn;
        this.preferCustomInSearch = options.preferCustomInSearch;
        this.trackedItems = [];
        this.trackedSubmenus = [];
        this.restoreMenuPatch = null;
    }

    patchMenu() {
        const original = Menu.prototype.showAtMouseEvent;
        const controller = this;

        Menu.prototype.showAtMouseEvent = function(event, ...rest) {
            try {
                controller.patchCalloutMenu(this, event);
            } catch (error) {
                console.error("custom-callout-context-menu: failed to patch menu", error);
            }

            const result = original.apply(this, [event, ...rest]);
            controller.decorateTrackedItems();
            controller.decorateTrackedSubmenus();
            return result;
        };

        this.restoreMenuPatch = () => {
            Menu.prototype.showAtMouseEvent = original;
        };

        return this.restoreMenuPatch;
    }

    unload() {
        if (this.restoreMenuPatch) {
            this.restoreMenuPatch();
            this.restoreMenuPatch = null;
        }
    }

    openCalloutPicker(editor) {
        const activeType = this.editorService.getActiveCalloutTypeFromEditor(editor);
        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
            return;
        }

        const modal = new CalloutPickerModal(this.app, {
            controller: this,
            options,
            activeType,
            onChoose: (option) => {
                this.editorService.applyCalloutChoice(editor, option.id);
            },
            onClear: () => {
                this.editorService.clearCalloutFromEditor(editor);
            }
        });
        modal.open();
    }

    patchCalloutMenu(menu, event) {
        const target = event && event.target instanceof HTMLElement ? event.target : null;
        if (!target) {
            return;
        }

        const calloutEl = target.closest(".cm-callout");
        if (!calloutEl || menu.__customCalloutContextMenuPatched) {
            return;
        }

        const context = this.editorService.getCalloutContext(calloutEl);
        if (!context) {
            return;
        }

        menu.__customCalloutContextMenuPatched = true;

        if (menu.submenuConfigs && menu.submenuConfigs.type) {
            delete menu.submenuConfigs.type;
        }
        if (Array.isArray(menu.items)) {
            menu.items = menu.items.filter((item) => item.section !== "type");
        }

        const options = this.registry.getMenuOptions();
        if (options.length === 0) {
            return;
        }

        menu.addItem((item) => {
            item.setTitle("Callout type").setSection("type");
            const submenu = item.setSubmenu();
            if (submenu && submenu.dom) {
                submenu.dom.classList.add("custom-callout-context-menu");
                submenu.dom.style.setProperty("--custom-callout-max-rows", String(this.getMaxRowsPerColumn()));
            }
            this.trackSubmenu(item, submenu);

            this.addOptionGroup(submenu, options.filter((option) => option.isCustom), {
                activeType: context.calloutType,
                onSelect: (option) => context.updateType(option.id)
            });
            if (options.some((option) => option.isCustom) && options.some((option) => !option.isCustom)) {
                submenu.addSeparator();
            }
            this.addOptionGroup(submenu, options.filter((option) => !option.isCustom), {
                activeType: context.calloutType,
                onSelect: (option) => context.updateType(option.id)
            });
            submenu.addSeparator();
            submenu.addItem((subItem) => {
                subItem.setTitle("None").setIcon("eraser").onClick(() => {
                    context.clearCallout();
                });
                this.trackMenuItem(subItem, {
                    color: "128, 128, 128",
                    icon: "eraser",
                    id: "none",
                    isCustom: false
                });
            });
        });
    }

    addOptionGroup(submenu, options, interaction) {
        for (const option of options) {
            submenu.addItem((item) => {
                item.setTitle(this.formatTitle(option.id));
                if (option.icon) {
                    item.setIcon(option.icon);
                }
                item.onClick(() => {
                    interaction.onSelect(option);
                });
                item.setChecked(this.isOptionActive(option, interaction.activeType));
                this.trackMenuItem(item, option);
            });
        }
    }

    formatTitle(id) {
        const normalized = String(id || "").replace(/[-_]+/g, " ");
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    isOptionActive(option, activeType) {
        return this.registry.isOptionActive(option, activeType);
    }

    buildSearchText(option) {
        return [
            option.id,
            option.concept || "",
            option.group || "",
            ...(option.groupAliases || []),
            ...(option.aliases || [])
        ].join(" ").toLowerCase();
    }

    trackMenuItem(item, option) {
        this.trackedItems.push({ item, option, attempts: 0 });
    }

    trackSubmenu(parentItem, submenu) {
        if (!submenu) {
            return;
        }

        this.trackedSubmenus.push({ parentItem, submenu, attempts: 0 });

        const tryEnhance = () => {
            const submenuDom = submenu.dom;
            const parentItemDom = parentItem && parentItem.dom;
            if (!submenuDom || !parentItemDom) {
                return;
            }

            window.setTimeout(() => {
                this.enhanceSubmenu(submenuDom, parentItemDom);
            }, 0);
        };

        const parentItemDom = parentItem && parentItem.dom;
        if (parentItemDom) {
            parentItemDom.addEventListener("mouseenter", tryEnhance);
            parentItemDom.addEventListener("focusin", tryEnhance);
        }
    }

    decorateTrackedItems() {
        window.requestAnimationFrame(() => {
            const remaining = [];
            for (const tracked of this.trackedItems) {
                const itemDom = tracked.item && tracked.item.dom;
                if (!itemDom) {
                    if (tracked.attempts < 20) {
                        remaining.push({
                            ...tracked,
                            attempts: tracked.attempts + 1
                        });
                    }
                    continue;
                }

                itemDom.classList.add("custom-callout-context-menu-item");
                itemDom.setAttribute("data-callout-id", tracked.option.id);
                itemDom.setAttribute("data-callout-custom", String(tracked.option.isCustom));
                itemDom.setAttribute("data-callout-group", tracked.option.group || "");
                itemDom.setAttribute("data-callout-concept", tracked.option.concept || "");
                itemDom.setAttribute("data-callout-search", this.buildSearchText(tracked.option));
                itemDom.style.setProperty("--custom-callout-context-color", tracked.option.color);
            }

            this.trackedItems = remaining;
            if (this.trackedItems.length > 0) {
                window.setTimeout(() => this.decorateTrackedItems(), 50);
            }
        });
    }

    decorateTrackedSubmenus() {
        window.requestAnimationFrame(() => {
            const remaining = [];
            for (const tracked of this.trackedSubmenus) {
                const submenuDom = tracked.submenu && tracked.submenu.dom;
                const parentItemDom = tracked.parentItem && tracked.parentItem.dom;

                if (!submenuDom || !parentItemDom) {
                    if (tracked.attempts < 20) {
                        remaining.push({
                            ...tracked,
                            attempts: tracked.attempts + 1
                        });
                    }
                    continue;
                }

                this.enhanceSubmenu(submenuDom, parentItemDom);
            }

            this.trackedSubmenus = remaining;
            if (this.trackedSubmenus.length > 0) {
                window.setTimeout(() => this.decorateTrackedSubmenus(), 50);
            }
        });
    }

    enhanceSubmenu(submenuDom, parentItemDom) {
        if (submenuDom.getAttribute("data-custom-callout-enhanced") === "true") {
            return;
        }

        const itemNodes = Array.from(submenuDom.querySelectorAll(".menu-item"));
        if (itemNodes.length === 0) {
            return;
        }

        const hasTrackedItems = itemNodes.some((itemNode) => itemNode.classList.contains("custom-callout-context-menu-item"));
        if (!hasTrackedItems) {
            return;
        }

        submenuDom.setAttribute("data-custom-callout-enhanced", "true");

        const shell = document.createElement("div");
        shell.className = "custom-callout-context-menu-shell";

        const searchWrap = document.createElement("div");
        searchWrap.className = "custom-callout-context-menu-search";

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = "custom-callout-context-menu-search-input";
        searchInput.placeholder = "Search callouts";
        searchWrap.appendChild(searchInput);

        const content = document.createElement("div");
        content.className = "custom-callout-context-menu-content";
        const sections = new GroupedSectionContainer(
            content,
            (parent, sectionKey, label) => {
                const wrapper = document.createElement("div");
                wrapper.className = "custom-callout-context-menu-group";
                wrapper.setAttribute("data-section", sectionKey);

                const labelEl = document.createElement("div");
                labelEl.className = "custom-callout-context-menu-group-label";
                labelEl.textContent = this.formatTitle(label || sectionKey);
                wrapper.appendChild(labelEl);
                parent.appendChild(wrapper);
                return wrapper;
            },
            (wrapper, sectionKey) => {
                const section = document.createElement("div");
                section.className = "custom-callout-context-menu-section";
                section.setAttribute("data-section", sectionKey);
                wrapper.appendChild(section);
                return section;
            }
        );

        let itemIndex = 0;
        for (const itemNode of itemNodes) {
            const calloutId = itemNode.getAttribute("data-callout-id");
            const isCustom = itemNode.getAttribute("data-callout-custom") === "true";
            const group = itemNode.getAttribute("data-callout-group") || "custom";
            itemNode.setAttribute("data-default-order", String(itemIndex));
            itemIndex += 1;

            if (calloutId === "none") {
                sections.getSectionEntry("utility", "utility").section.appendChild(itemNode);
            } else if (isCustom) {
                sections.getSectionEntry(group, group).section.appendChild(itemNode);
            } else {
                sections.getSectionEntry("builtin", "builtin").section.appendChild(itemNode);
            }
        }

        shell.appendChild(searchWrap);
        shell.appendChild(content);
        submenuDom.replaceChildren(shell);

        const focusSearch = () => {
            window.setTimeout(() => {
                searchInput.focus();
                searchInput.select();
            }, 0);
        };

        parentItemDom.addEventListener("mouseenter", focusSearch);
        parentItemDom.addEventListener("focusin", focusSearch);
        submenuDom.addEventListener("mouseenter", focusSearch);

        const applyFilter = () => {
            const query = searchInput.value.trim().toLowerCase();
            const menuItems = Array.from(submenuDom.querySelectorAll(".custom-callout-context-menu-item"));
            let bestMatch = null;

            for (const itemNode of menuItems) {
                itemNode.classList.remove("is-search-top-result");
                const score = this.getMenuItemSearchScore(itemNode, query);
                const isVisible = score > 0;
                itemNode.classList.toggle("is-search-hidden", !isVisible);
                itemNode.style.order = query.length === 0
                    ? itemNode.getAttribute("data-default-order") || "0"
                    : String(100000 - score);

                if (!isVisible) {
                    continue;
                }

                if (
                    bestMatch === null ||
                    score > bestMatch.score ||
                    (score === bestMatch.score && this.compareMenuItems(itemNode, bestMatch.itemNode) < 0)
                ) {
                    bestMatch = { itemNode, score };
                }
            }

            sections.toggleEmptySections(".custom-callout-context-menu-item", "is-search-hidden");

            if (bestMatch) {
                bestMatch.itemNode.classList.add("is-search-top-result");
            }
        };

        searchInput.addEventListener("input", applyFilter);
        searchInput.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }

            const bestMatch = submenuDom.querySelector(".custom-callout-context-menu-item.is-search-top-result");
            if (!bestMatch) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            bestMatch.click();
        });

        applyFilter();
    }

    getMenuItemSearchScore(itemNode, query) {
        if (!itemNode) {
            return 0;
        }

        const normalizedQuery = normalizeSearchText(query);
        let score = 1;

        if (normalizedQuery.length > 0) {
            const candidates = [
                itemNode.getAttribute("data-callout-id") || "",
                itemNode.getAttribute("data-callout-search") || "",
                itemNode.querySelector(".menu-item-title")?.textContent || ""
            ];
            score = getBestFuzzyScore(normalizedQuery, candidates);
        }

        if (score > 0 && this.preferCustomInSearch() && itemNode.getAttribute("data-callout-custom") === "true") {
            score += 75;
        }

        return score;
    }

    compareMenuItems(a, b) {
        if (this.preferCustomInSearch()) {
            const aIsCustom = a.getAttribute("data-callout-custom") === "true";
            const bIsCustom = b.getAttribute("data-callout-custom") === "true";
            if (aIsCustom !== bIsCustom) {
                return aIsCustom ? -1 : 1;
            }
        }

        const aOrder = Number(a.getAttribute("data-default-order") || "0");
        const bOrder = Number(b.getAttribute("data-default-order") || "0");
        return aOrder - bOrder;
    }
}

module.exports = {
    CalloutMenuController
};
