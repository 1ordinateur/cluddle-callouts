const MAX_ROWS_PER_COLUMN = 24;
const MAX_GROUP_COLUMNS = 3;
const MIN_MODAL_WIDTH_REM = 24;
const MAX_MODAL_WIDTH_REM = 72;
const MIN_MODAL_HEIGHT_VH = 40;
const MAX_MODAL_HEIGHT_VH = 95;

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

function clampModalWidthRem(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(MAX_MODAL_WIDTH_REM, Math.max(MIN_MODAL_WIDTH_REM, Math.round(parsed)));
}

function clampModalHeightVh(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(MAX_MODAL_HEIGHT_VH, Math.max(MIN_MODAL_HEIGHT_VH, Math.round(parsed)));
}

module.exports = {
    MAX_ROWS_PER_COLUMN,
    MAX_GROUP_COLUMNS,
    MAX_MODAL_HEIGHT_VH,
    MAX_MODAL_WIDTH_REM,
    MIN_MODAL_HEIGHT_VH,
    MIN_MODAL_WIDTH_REM,
    clampRowsPerColumn,
    clampGroupColumns,
    clampModalHeightVh,
    clampModalWidthRem
};
