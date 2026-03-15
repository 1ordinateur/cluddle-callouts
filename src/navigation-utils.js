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

function normalizePickerPosition(rowColumnLengths, currentRowIndex, currentColumnIndex, currentItemIndex, preferEnd = false) {
    if (!Array.isArray(rowColumnLengths) || rowColumnLengths.length === 0) {
        return null;
    }

    const visibleRows = rowColumnLengths
        .map((columns, rowIndex) => ({
            rowIndex,
            columns: Array.isArray(columns)
                ? columns
                    .map((length, columnIndex) => ({ length, columnIndex }))
                    .filter((entry) => Number.isInteger(entry.length) && entry.length > 0)
                : []
        }))
        .filter((row) => row.columns.length > 0);

    if (visibleRows.length === 0) {
        return null;
    }

    if (
        Number.isInteger(currentRowIndex) &&
        currentRowIndex >= 0 &&
        currentRowIndex < rowColumnLengths.length &&
        Array.isArray(rowColumnLengths[currentRowIndex]) &&
        Number.isInteger(currentColumnIndex) &&
        currentColumnIndex >= 0 &&
        currentColumnIndex < rowColumnLengths[currentRowIndex].length &&
        Number.isInteger(currentItemIndex) &&
        currentItemIndex >= 0 &&
        currentItemIndex < rowColumnLengths[currentRowIndex][currentColumnIndex]
    ) {
        return {
            rowIndex: currentRowIndex,
            columnIndex: currentColumnIndex,
            itemIndex: currentItemIndex
        };
    }

    const fallbackRow = preferEnd ? visibleRows[visibleRows.length - 1] : visibleRows[0];
    const fallbackColumn = preferEnd
        ? fallbackRow.columns[fallbackRow.columns.length - 1]
        : fallbackRow.columns[0];

    return {
        rowIndex: fallbackRow.rowIndex,
        columnIndex: fallbackColumn.columnIndex,
        itemIndex: preferEnd ? fallbackColumn.length - 1 : 0
    };
}

function movePickerSelection(rowColumnLengths, currentRowIndex, currentColumnIndex, currentItemIndex, direction) {
    const hasValidCurrentSelection = (
        Array.isArray(rowColumnLengths) &&
        Number.isInteger(currentRowIndex) &&
        currentRowIndex >= 0 &&
        currentRowIndex < rowColumnLengths.length &&
        Array.isArray(rowColumnLengths[currentRowIndex]) &&
        Number.isInteger(currentColumnIndex) &&
        currentColumnIndex >= 0 &&
        currentColumnIndex < rowColumnLengths[currentRowIndex].length &&
        Number.isInteger(currentItemIndex) &&
        currentItemIndex >= 0 &&
        currentItemIndex < rowColumnLengths[currentRowIndex][currentColumnIndex]
    );

    const preferEnd = direction === "up" || direction === "left";
    const start = normalizePickerPosition(
        rowColumnLengths,
        currentRowIndex,
        currentColumnIndex,
        currentItemIndex,
        preferEnd
    );

    if (!start) {
        return null;
    }

    if (!hasValidCurrentSelection) {
        return start;
    }

    const currentRow = rowColumnLengths[start.rowIndex];
    const currentColumnLength = currentRow[start.columnIndex];

    if (direction === "down") {
        if (start.itemIndex + 1 < currentColumnLength) {
            return { rowIndex: start.rowIndex, columnIndex: start.columnIndex, itemIndex: start.itemIndex + 1 };
        }

        const nextColumnIndex = currentRow.findIndex((length, columnIndex) => columnIndex > start.columnIndex && length > 0);
        if (nextColumnIndex !== -1) {
            return { rowIndex: start.rowIndex, columnIndex: nextColumnIndex, itemIndex: 0 };
        }

        const nextRowIndex = rowColumnLengths.findIndex((columns, rowIndex) => rowIndex > start.rowIndex && Array.isArray(columns) && columns.some((length) => length > 0));
        if (nextRowIndex !== -1) {
            const firstColumnIndex = rowColumnLengths[nextRowIndex].findIndex((length) => length > 0);
            return { rowIndex: nextRowIndex, columnIndex: firstColumnIndex, itemIndex: 0 };
        }

        return normalizePickerPosition(rowColumnLengths, -1, -1, -1, false);
    }

    if (direction === "up") {
        if (start.itemIndex - 1 >= 0) {
            return { rowIndex: start.rowIndex, columnIndex: start.columnIndex, itemIndex: start.itemIndex - 1 };
        }

        for (let columnIndex = start.columnIndex - 1; columnIndex >= 0; columnIndex -= 1) {
            if (currentRow[columnIndex] > 0) {
                return {
                    rowIndex: start.rowIndex,
                    columnIndex,
                    itemIndex: currentRow[columnIndex] - 1
                };
            }
        }

        for (let rowIndex = start.rowIndex - 1; rowIndex >= 0; rowIndex -= 1) {
            const row = rowColumnLengths[rowIndex];
            if (!Array.isArray(row)) {
                continue;
            }

            for (let columnIndex = row.length - 1; columnIndex >= 0; columnIndex -= 1) {
                if (row[columnIndex] > 0) {
                    return {
                        rowIndex,
                        columnIndex,
                        itemIndex: row[columnIndex] - 1
                    };
                }
            }
        }

        return normalizePickerPosition(rowColumnLengths, -1, -1, -1, true);
    }

    if (direction === "right" || direction === "left") {
        const delta = direction === "right" ? 1 : -1;
        const currentVisibleColumns = currentRow
            .map((length, columnIndex) => ({ length, columnIndex }))
            .filter((entry) => entry.length > 0);
        const visibleColumnPosition = currentVisibleColumns.findIndex((entry) => entry.columnIndex === start.columnIndex);
        const targetVisiblePosition = getRelativeIndex(visibleColumnPosition, currentVisibleColumns.length, delta);
        const targetColumn = currentVisibleColumns[targetVisiblePosition];
        return {
            rowIndex: start.rowIndex,
            columnIndex: targetColumn.columnIndex,
            itemIndex: Math.min(start.itemIndex, targetColumn.length - 1)
        };
    }

    return start;
}

module.exports = {
    getRelativeIndex,
    moveGridSelection,
    movePickerSelection
};
