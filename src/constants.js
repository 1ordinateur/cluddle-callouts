const BUILTIN_CALLOUTS = [
    "note",
    "abstract",
    "info",
    "todo",
    "tip",
    "important",
    "success",
    "question",
    "warning",
    "failure",
    "danger",
    "bug",
    "example",
    "quote",
    "cite"
];

const DEFAULT_SETTINGS = {
    maxRowsPerColumn: 8,
    preferCustomInSearch: true
};

const GROUP_PROPERTY_PREFIX = "callout-group-";

module.exports = {
    BUILTIN_CALLOUTS,
    DEFAULT_SETTINGS,
    GROUP_PROPERTY_PREFIX
};
