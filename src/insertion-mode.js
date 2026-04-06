function resolvePlaceCursorOnNextLine(defaultInsertStartsOnNextLine, useAlternateInsertionMode = false) {
    return useAlternateInsertionMode
        ? !defaultInsertStartsOnNextLine
        : defaultInsertStartsOnNextLine;
}

module.exports = {
    resolvePlaceCursorOnNextLine
};
