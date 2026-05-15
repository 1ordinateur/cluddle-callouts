const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

let openedModal = null;

const originalLoad = Module._load;
Module._load = function loadWithObsidianStub(request, parent, isMain) {
    if (request === "obsidian") {
        return {
            Modal: class {
                constructor(app) {
                    this.app = app;
                }

                open() {
                    openedModal = this;
                }

                close() {}
            },
            setIcon() {}
        };
    }

    return originalLoad.call(this, request, parent, isMain);
};

const {
    resolveDefaultPlaceCursorOnNextLine,
    resolvePlaceCursorOnNextLine
} = require("../src/insertion-mode");
const { CalloutMenuController } = require("../src/callout-menu-controller");

Module._load = originalLoad;

test("alternate insertion mode inverts a default header-line insert", () => {
    assert.equal(resolvePlaceCursorOnNextLine(false, false), false);
    assert.equal(resolvePlaceCursorOnNextLine(false, true), true);
});

test("alternate insertion mode inverts a default next-line insert", () => {
    assert.equal(resolvePlaceCursorOnNextLine(true, false), true);
    assert.equal(resolvePlaceCursorOnNextLine(true, true), false);
});

test("nested callout inserts default to the next content line", () => {
    assert.equal(resolveDefaultPlaceCursorOnNextLine(false, true, false), true);
});

test("top-level callout inserts keep the configured cursor placement default", () => {
    assert.equal(resolveDefaultPlaceCursorOnNextLine(false, false, false), false);
});

test("selection wrapping keeps the configured cursor placement default", () => {
    assert.equal(resolveDefaultPlaceCursorOnNextLine(false, true, true), false);
});

test("alternate picker command path inverts the normal insertion mode", () => {
    let appliedOptions = null;
    const controller = new CalloutMenuController({
        app: {},
        registry: {
            getMenuOptions() {
                return [{ id: "note", isCustom: false }];
            }
        },
        editorService: {
            findCalloutContext() {
                return null;
            },
            applyCalloutChoice(editor, calloutId, options) {
                appliedOptions = { calloutId, options };
            }
        },
        getMaxRowsPerColumn() {
            return 8;
        },
        preferCustomInSearch() {
            return true;
        },
        placeCursorOnNextLineAfterInsert() {
            return false;
        }
    });
    const editor = {
        getSelection() {
            return "";
        }
    };

    openedModal = null;
    controller.openCalloutPicker(editor, { useAlternateInsertionMode: true });
    openedModal.onChoose({ id: "note" });

    assert.deepEqual(appliedOptions, {
        calloutId: "note",
        options: { placeCursorOnNextLine: true }
    });
});
