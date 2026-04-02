const test = require("node:test");
const assert = require("node:assert/strict");

const { EditorCalloutService } = require("../src/editor-callout-service");

function createEditor(lines, cursorLine = 0, selection = "") {
    return {
        lines: [...lines],
        cursor: { line: cursorLine, ch: 0 },
        selection,
        getCursor() {
            return this.cursor;
        },
        getLine(line) {
            return this.lines[line] || "";
        },
        lineCount() {
            return this.lines.length;
        },
        setLine(line, text) {
            this.lines[line] = text;
        },
        getSelection() {
            return this.selection;
        },
        replaceSelection(text) {
            this.selection = text;
        },
        replaceRange(text, from) {
            const newLines = text.split("\n");
            this.lines.splice(from.line, 0, ...newLines);
        },
        setCursor(cursor) {
            this.cursor = cursor;
        }
    };
}

test("finds a callout context from inside a block", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note] Title",
        "> body",
        "> more body",
        "plain"
    ], 2);

    const context = service.findCalloutContext(editor);

    assert.equal(context.calloutType, "note");
    assert.equal(context.lineStart, 0);
    assert.equal(context.lineEnd, 2);
});

test("preserves hyphenated and plus-sign custom callout IDs", () => {
    const service = new EditorCalloutService();
    const hyphenEditor = createEditor([
        "> [!my-callout] Title",
        "> body"
    ], 1);
    const plusEditor = createEditor([
        "> [!math+proof] Title",
        "> body"
    ], 1);

    assert.equal(service.findCalloutContext(hyphenEditor).calloutType, "my-callout");
    assert.equal(service.getActiveCalloutTypeFromEditor(hyphenEditor), "my-callout");
    assert.equal(service.findCalloutContext(plusEditor).calloutType, "math+proof");
    assert.equal(service.getActiveCalloutTypeFromEditor(plusEditor), "math+proof");
});

test("updates only the callout type on an existing header", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note]- Collapsed title",
        "> body"
    ], 1);

    service.applyCalloutChoice(editor, "tip");

    assert.equal(editor.lines[0], "> [!tip]- Collapsed title");
    assert.equal(editor.lines[1], "> body");
});

test("removes the callout marker but preserves the title text", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!warning] Important title",
        "> body"
    ], 1);

    service.clearCalloutFromEditor(editor);

    assert.equal(editor.lines[0], "> Important title");
    assert.equal(editor.lines[1], "> body");
});

test("wraps a selection into a new callout block", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "alpha",
        "beta"
    ], 0, "alpha\nbeta");

    service.applyCalloutChoice(editor, "info");

    assert.equal(editor.selection, "> [!info]\n> alpha\n> beta");
});

test("inserts a new callout when there is no selection and no existing callout", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "plain"
    ], 0);

    service.applyCalloutChoice(editor, "question");

    assert.deepEqual(editor.lines.slice(0, 2), ["> [!question] ", "> "]);
    assert.deepEqual(editor.cursor, { line: 0, ch: "> [!question] ".length });
});
