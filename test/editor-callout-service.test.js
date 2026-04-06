const test = require("node:test");
const assert = require("node:assert/strict");

const { EditorCalloutService } = require("../src/editor-callout-service");

function getOffset(lines, position) {
    const normalizedLine = Math.max(0, Math.min(position.line, lines.length));
    if (normalizedLine === lines.length) {
        return lines.join("\n").length;
    }

    let offset = 0;
    for (let index = 0; index < normalizedLine; index += 1) {
        offset += lines[index].length + 1;
    }

    return offset + Math.max(0, Math.min(position.ch, lines[normalizedLine].length));
}

function createEditor(lines, cursorLine = 0, selection = "", cursorCh = 0) {
    return {
        lines: [...lines],
        cursor: { line: cursorLine, ch: cursorCh },
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
            const documentText = this.lines.join("\n");
            const insertionOffset = getOffset(this.lines, from);
            const nextDocumentText = `${documentText.slice(0, insertionOffset)}${text}${documentText.slice(insertionOffset)}`;
            this.lines = nextDocumentText.split("\n");
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

test("finds a nested callout context from inside a nested block", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note] Parent",
        "> intro",
        "> > [!tip] Child",
        "> > body",
        "> outro"
    ], 3);

    const context = service.findCalloutContext(editor);

    assert.equal(context.calloutType, "tip");
    assert.equal(context.lineStart, 2);
    assert.equal(context.lineEnd, 4);
});

test("preserves hyphenated and plus-sign custom callout IDs", () => {
    const service = new EditorCalloutService();
    const hyphenEditor = createEditor([
        "> > [!my-callout] Title",
        "> > body"
    ], 1);
    const plusEditor = createEditor([
        "> > [!math+proof] Title",
        "> > body"
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

    service.renameCalloutType(editor, "tip");

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

test("wraps a selection inside a callout into a nested callout block", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note] Parent",
        "> alpha",
        "> beta"
    ], 1, "alpha\nbeta");

    service.applyCalloutChoice(editor, "info");

    assert.equal(editor.selection, "> > [!info]\n> > alpha\n> > beta");
});

test("inserts a new callout when there is no selection and no existing callout", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "plain"
    ], 0);

    service.applyCalloutChoice(editor, "question");

    assert.deepEqual(editor.lines.slice(0, 2), ["> [!question] ", "> plain"]);
    assert.deepEqual(editor.cursor, { line: 0, ch: "> [!question] ".length });
});

test("inserts a nested callout inside an existing callout instead of renaming it", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note] Parent",
        "> body",
        "> outro"
    ], 1);

    service.applyCalloutChoice(editor, "question");

    assert.deepEqual(editor.lines, [
        "> [!note] Parent",
        "> > [!question] ",
        "> > body",
        "> outro"
    ]);
    assert.deepEqual(editor.cursor, { line: 1, ch: "> > [!question] ".length });
});

test("inserts a nested callout after the current header line", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note] Parent",
        "> body"
    ], 0, "", "> [!note] Parent".length);

    service.applyCalloutChoice(editor, "question");

    assert.deepEqual(editor.lines, [
        "> [!note] Parent",
        "> > [!question] ",
        "> > ",
        "> body"
    ]);
    assert.deepEqual(editor.cursor, { line: 1, ch: "> > [!question] ".length });
});

test("can place the cursor on the next line after inserting a new callout", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "plain"
    ], 0);

    service.applyCalloutChoice(editor, "question", { placeCursorOnNextLine: true });

    assert.deepEqual(editor.lines.slice(0, 2), ["> [!question]", "> plain"]);
    assert.deepEqual(editor.cursor, { line: 1, ch: 2 });
});

test("can keep the cursor on the header line when explicit options disable next-line placement", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "plain"
    ], 0);

    service.applyCalloutChoice(editor, "question", { placeCursorOnNextLine: false });

    assert.deepEqual(editor.lines.slice(0, 2), ["> [!question] ", "> plain"]);
    assert.deepEqual(editor.cursor, { line: 0, ch: "> [!question] ".length });
});

test("can place the cursor on the next line after inserting a nested callout", () => {
    const service = new EditorCalloutService();
    const editor = createEditor([
        "> [!note] Parent",
        "> body"
    ], 1);

    service.applyCalloutChoice(editor, "question", { placeCursorOnNextLine: true });

    assert.deepEqual(editor.lines, [
        "> [!note] Parent",
        "> > [!question]",
        "> > body"
    ]);
    assert.deepEqual(editor.cursor, { line: 2, ch: 4 });
});
