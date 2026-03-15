function getRelativeIndex(currentIndex, itemCount, delta) {
    if (!Number.isInteger(itemCount) || itemCount <= 0) {
        return -1;
    }

    if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= itemCount) {
        return delta >= 0 ? 0 : itemCount - 1;
    }

    return (currentIndex + delta + itemCount) % itemCount;
}

function normalizeGridPosition(columnLengths, currentColumnIndex, currentRowIndex, preferEnd = false) {
    if (!Array.isArray(columnLengths) || columnLengths.length === 0) {
        return null;
    }

    const nonEmptyColumns = columnLengths
        .map((length, columnIndex) => ({ length, columnIndex }))
        .filter((entry) => Number.isInteger(entry.length) && entry.length > 0);

    if (nonEmptyColumns.length === 0) {
        return null;
    }

    if (
        Number.isInteger(currentColumnIndex) &&
        currentColumnIndex >= 0 &&
        currentColumnIndex < columnLengths.length &&
        Number.isInteger(currentRowIndex) &&
        currentRowIndex >= 0 &&
        currentRowIndex < columnLengths[currentColumnIndex]
    ) {
        return { columnIndex: currentColumnIndex, rowIndex: currentRowIndex };
    }

    const fallback = preferEnd ? nonEmptyColumns[nonEmptyColumns.length - 1] : nonEmptyColumns[0];
    return {
        columnIndex: fallback.columnIndex,
        rowIndex: preferEnd ? fallback.length - 1 : 0
    };
}

function moveGridSelection(columnLengths, currentColumnIndex, currentRowIndex, direction) {
    const hasValidCurrentSelection = (
        Array.isArray(columnLengths) &&
        Number.isInteger(currentColumnIndex) &&
        currentColumnIndex >= 0 &&
        currentColumnIndex < columnLengths.length &&
        Number.isInteger(currentRowIndex) &&
        currentRowIndex >= 0 &&
        currentRowIndex < columnLengths[currentColumnIndex]
    );
    const start = normalizeGridPosition(
        columnLengths,
        currentColumnIndex,
        currentRowIndex,
        direction === "up" || direction === "left"
    );

    if (!start) {
        return null;
    }

    if (!hasValidCurrentSelection) {
        return start;
    }

    if (direction === "down") {
        if (start.rowIndex + 1 < columnLengths[start.columnIndex]) {
            return { columnIndex: start.columnIndex, rowIndex: start.rowIndex + 1 };
        }

        const nextColumnIndex = getRelativeIndex(start.columnIndex, columnLengths.length, 1);
        return { columnIndex: nextColumnIndex, rowIndex: 0 };
    }

    if (direction === "up") {
        if (start.rowIndex - 1 >= 0) {
            return { columnIndex: start.columnIndex, rowIndex: start.rowIndex - 1 };
        }

        const previousColumnIndex = getRelativeIndex(start.columnIndex, columnLengths.length, -1);
        return {
            columnIndex: previousColumnIndex,
            rowIndex: columnLengths[previousColumnIndex] - 1
        };
    }

    if (direction === "right" || direction === "left") {
        const delta = direction === "right" ? 1 : -1;
        const targetColumnIndex = getRelativeIndex(start.columnIndex, columnLengths.length, delta);
        return {
            columnIndex: targetColumnIndex,
            rowIndex: Math.min(start.rowIndex, columnLengths[targetColumnIndex] - 1)
        };
    }

    return start;
}

module.exports = {
    getRelativeIndex,
    moveGridSelection
};
