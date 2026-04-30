function resolvePlaceCursorOnNextLine(defaultInsertStartsOnNextLine, useAlternateInsertionMode = false) {
    return useAlternateInsertionMode
        ? !defaultInsertStartsOnNextLine
        : defaultInsertStartsOnNextLine;
}

function resolveDefaultPlaceCursorOnNextLine(configuredDefault, isInsideCallout, hasSelection) {
    if (isInsideCallout && !hasSelection) {
        return true;
    }

    return configuredDefault;
}

module.exports = {
    resolveDefaultPlaceCursorOnNextLine,
    resolvePlaceCursorOnNextLine
};
