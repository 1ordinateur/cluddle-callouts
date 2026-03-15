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

    applyCalloutChoice(editor, calloutId, existingContext = null) {
        const context = existingContext || this.findCalloutContext(editor);
        if (context) {
            editor.setLine(context.lineStart, this.replaceCalloutType(context.headerLine, calloutId));
            return;
        }

        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
            editor.replaceSelection(this.wrapSelectionAsCallout(selection, calloutId));
            return;
        }

        const cursor = editor.getCursor();
        const insertion = `> [!${calloutId}]\n> `;
        editor.replaceRange(insertion, cursor);
        editor.setCursor({ line: cursor.line + 1, ch: 2 });
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

    parseCalloutHeaderLine(line) {
        const match = /^(\s*>\s*)\[!([^\]|]+)(?:[^\]]*)\]([+-]?)(.*)$/.exec(line || "");
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

    wrapSelectionAsCallout(selection, calloutId) {
        const normalized = String(selection || "").replace(/\r\n/g, "\n");
        const lines = normalized.split("\n");
        const content = lines.map((line) => {
            if (line.length === 0) {
                return ">";
            }
            return `> ${line}`;
        }).join("\n");
        return `> [!${calloutId}]\n${content}`;
    }
}

module.exports = {
    EditorCalloutService
};
