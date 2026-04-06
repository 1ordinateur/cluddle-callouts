class EditorCalloutService {
    findCalloutContext(editor) {
        const cursorLine = editor.getCursor("head").line;
        if (!this.isBlockquoteLine(editor.getLine(cursorLine))) {
            return null;
        }

        let headerContext = null;
        for (let lineNumber = cursorLine; lineNumber >= 0; lineNumber -= 1) {
            const line = editor.getLine(lineNumber);
            const parsedHeader = this.parseCalloutHeaderLine(line);
            if (parsedHeader) {
                headerContext = {
                    ...parsedHeader,
                    headerLine: line,
                    lineStart: lineNumber
                };
                break;
            }

            if (!this.isBlockquoteLine(line)) {
                return null;
            }
        }

        if (!headerContext) {
            return null;
        }

        let lineEnd = headerContext.lineStart;
        for (let lineNumber = headerContext.lineStart + 1; lineNumber < editor.lineCount(); lineNumber += 1) {
            if (!this.isBlockquoteLine(editor.getLine(lineNumber))) {
                break;
            }
            lineEnd = lineNumber;
        }

        return {
            ...headerContext,
            lineEnd
        };
    }

    applyCalloutChoice(editor, calloutId, options = {}) {
        const context = this.findCalloutContext(editor);
        const linePrefix = this.getInsertedCalloutPrefix(editor, context);
        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
            editor.replaceSelection(this.wrapSelectionAsCallout(selection, calloutId, linePrefix));
            return;
        }

        const cursor = editor.getCursor();
        const placeCursorOnNextLine = options.placeCursorOnNextLine === true;
        const headerLine = placeCursorOnNextLine
            ? `${linePrefix}[!${calloutId}]`
            : `${linePrefix}[!${calloutId}] `;

        if (context && cursor.line !== context.lineStart) {
            const currentLine = editor.getLine(cursor.line);
            editor.setLine(cursor.line, headerLine);
            editor.replaceRange(`\n${this.buildNestedBodyLine(currentLine, linePrefix)}`, {
                line: cursor.line,
                ch: headerLine.length
            });
            editor.setCursor(placeCursorOnNextLine
                ? { line: cursor.line + 1, ch: linePrefix.length }
                : { line: cursor.line, ch: headerLine.length });
            return;
        }

        const insertionPoint = this.getCalloutInsertionPoint(editor, context);
        const insertsAfterCurrentLine = context !== null;
        const insertion = `${insertsAfterCurrentLine ? "\n" : ""}${headerLine}\n${linePrefix}`;
        editor.replaceRange(insertion, insertionPoint);

        const headerLineNumber = insertsAfterCurrentLine
            ? insertionPoint.line + 1
            : insertionPoint.line;
        editor.setCursor(placeCursorOnNextLine
            ? { line: headerLineNumber + 1, ch: linePrefix.length }
            : { line: headerLineNumber, ch: headerLine.length });
    }

    renameCalloutType(editor, calloutId, existingContext = null) {
        const context = existingContext || this.findCalloutContext(editor);
        if (!context) {
            return;
        }

        editor.setLine(context.lineStart, this.replaceCalloutType(context.headerLine, calloutId));
    }

    clearCalloutFromEditor(editor, existingContext = null) {
        const context = existingContext || this.findCalloutContext(editor);
        if (!context) {
            return;
        }

        editor.setLine(context.lineStart, this.removeCalloutHeader(context.headerLine));
    }

    isCalloutHeaderLine(line) {
        return this.parseCalloutHeaderLine(line) !== null;
    }

    isBlockquoteLine(line) {
        return /^\s*>/.test(line || "");
    }

    getBlockquotePrefix(line) {
        const match = /^(\s*(?:>\s*)+)/.exec(line || "");
        if (!match) {
            return "";
        }

        return match[1].replace(/\s*$/, " ");
    }

    parseCalloutHeaderLine(line) {
        const match = /^(\s*(?:>\s*)+)\[!([^\]|]+)(?:[^\]]*)\]([+-]?)(.*)$/.exec(line || "");
        if (!match) {
            return null;
        }

        return {
            prefix: match[1],
            calloutType: match[2],
            foldState: match[3] || "",
            remainder: match[4] || ""
        };
    }

    replaceCalloutType(line, calloutId) {
        const parsedHeader = this.parseCalloutHeaderLine(line);
        if (!parsedHeader) {
            return line;
        }

        return `${parsedHeader.prefix}[!${calloutId}]${parsedHeader.foldState}${parsedHeader.remainder}`;
    }

    removeCalloutHeader(line) {
        const parsedHeader = this.parseCalloutHeaderLine(line);
        if (!parsedHeader) {
            return line;
        }

        const trimmedPrefix = parsedHeader.prefix.replace(/\s+$/, "");
        const trimmedRemainder = parsedHeader.remainder.trimStart();
        if (!trimmedRemainder) {
            return trimmedPrefix.length > 0 ? trimmedPrefix : ">";
        }

        return `${trimmedPrefix} ${trimmedRemainder}`;
    }

    getActiveCalloutTypeFromEditor(editor) {
        return this.findCalloutContext(editor)?.calloutType || "";
    }

    getInsertedCalloutPrefix(editor, existingContext = null) {
        const context = existingContext || this.findCalloutContext(editor);
        if (!context) {
            return "> ";
        }

        return `${this.getBlockquotePrefix(editor.getLine(editor.getCursor("head").line))}> `;
    }

    getCalloutInsertionPoint(editor, existingContext = null) {
        const cursor = editor.getCursor();
        const context = existingContext || this.findCalloutContext(editor);
        if (!context) {
            return cursor;
        }

        return {
            line: cursor.line,
            ch: editor.getLine(cursor.line).length
        };
    }

    buildNestedBodyLine(currentLine, linePrefix) {
        const currentPrefix = this.getBlockquotePrefix(currentLine);
        const currentLineRemainder = currentLine.slice(currentPrefix.length);
        if (currentLineRemainder.length === 0) {
            return linePrefix.trimEnd();
        }

        return `${linePrefix}${currentLineRemainder}`;
    }

    wrapSelectionAsCallout(selection, calloutId, linePrefix = "> ") {
        const normalized = String(selection || "").replace(/\r\n/g, "\n");
        const lines = normalized.split("\n");
        const content = lines.map((line) => {
            if (line.length === 0) {
                return linePrefix.trimEnd();
            }
            return `${linePrefix}${line}`;
        }).join("\n");
        return `${linePrefix}[!${calloutId}]\n${content}`;
    }
}

module.exports = {
    EditorCalloutService
};
