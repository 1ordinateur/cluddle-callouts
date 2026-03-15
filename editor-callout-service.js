class EditorCalloutService {
    getCalloutContext(calloutEl) {
        const widget = calloutEl.cmView && calloutEl.cmView.widget;
        const editor = widget && widget.editor && widget.editor.editor;
        if (!widget || !editor) {
            return null;
        }

        const lineNumStart = editor.offsetToPos(widget.start).line;
        const lineNumEnd = editor.offsetToPos(widget.end).line;
        const firstLine = editor.getLine(lineNumStart);
        const calloutType = (widget.getType() || "").replace(/([^|]+)(.*)/, "$1");

        return {
            calloutType,
            updateType: (type) => widget.updateType(type),
            clearCallout: () => {
                const updatedFirstLine = firstLine
                    .replace(/^(\s*>\s*)\[![^\]]+\][+-]?\s*/, "$1")
                    .replace(/\s+$/, "");
                editor.setLine(lineNumStart, updatedFirstLine.length > 0 ? updatedFirstLine : ">");
                for (let lineNumber = lineNumStart + 1; lineNumber <= lineNumEnd; lineNumber += 1) {
                    const line = editor.getLine(lineNumber);
                    if (!line.trimStart().startsWith(">")) {
                        editor.setLine(lineNumber, `> ${line.trimStart()}`);
                    }
                }
            }
        };
    }

    applyCalloutChoice(editor, calloutId) {
        const selection = editor.getSelection();
        if (selection && selection.length > 0) {
            editor.replaceSelection(this.wrapSelectionAsCallout(selection, calloutId));
            return;
        }

        const line = editor.getCursor().line;
        const currentLine = editor.getLine(line);
        if (this.isCalloutHeaderLine(currentLine)) {
            editor.setLine(line, currentLine.replace(/^(\s*>\s*)\[![^\]]+\]([+-]?)/, `$1[!${calloutId}]$2`));
            return;
        }

        const cursor = editor.getCursor();
        const insertion = `> [!${calloutId}]\n> `;
        editor.replaceRange(insertion, cursor);
        editor.setCursor({ line: cursor.line + 1, ch: 2 });
    }

    clearCalloutFromEditor(editor) {
        const line = editor.getCursor().line;
        const currentLine = editor.getLine(line);
        if (!this.isCalloutHeaderLine(currentLine)) {
            return;
        }

        editor.setLine(line, currentLine.replace(/^(\s*>\s*)\[![^\]]+\][+-]?\s*/, "$1").replace(/\s+$/, ""));
    }

    isCalloutHeaderLine(line) {
        return /^\s*>\s*\[![^\]]+\][+-]?/.test(line || "");
    }

    getActiveCalloutTypeFromEditor(editor) {
        const line = editor.getCursor().line;
        const currentLine = editor.getLine(line);
        const match = /^\s*>\s*\[!([^\]|+-]+)(?:[^\]]*)\][+-]?/.exec(currentLine || "");
        return match ? match[1] : "";
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
