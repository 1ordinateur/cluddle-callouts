const MAX_ROWS_PER_COLUMN = 24;
const MAX_GROUP_COLUMNS = 3;

function clampRowsPerColumn(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(MAX_ROWS_PER_COLUMN, Math.max(1, Math.round(parsed)));
}

function clampGroupColumns(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(MAX_GROUP_COLUMNS, Math.max(1, Math.round(parsed)));
}

module.exports = {
    MAX_ROWS_PER_COLUMN,
    MAX_GROUP_COLUMNS,
    clampRowsPerColumn,
    clampGroupColumns
};
