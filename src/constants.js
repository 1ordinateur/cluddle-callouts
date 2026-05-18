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

const DEFAULT_CALLOUT_ICON = "message-square";

const BUNDLED_CALLOUTS = [
    {
        id: "cluddle",
        group: "builtin",
        concept: "builtin",
        icon: "cloud"
    }
];

const BUILTIN_CALLOUT_ICONS = {
    note: "pencil",
    abstract: "clipboard-list",
    info: "info",
    todo: "check-circle-2",
    tip: "flame",
    important: "flame",
    success: "check",
    question: "circle-help",
    warning: "triangle-alert",
    failure: "x",
    danger: "zap",
    bug: "bug",
    example: "list",
    quote: "quote",
    cite: "quote"
};

const DEFAULT_SETTINGS = {
    maxRowsPerColumn: 8,
    maxGroupColumns: 3,
    modalWidthRem: 42,
    modalHeightVh: 82,
    preferCustomInSearch: true,
    placeCursorOnNextLineAfterInsert: false,
    showBundledCluddleCallout: true,
    nonDefaultCalloutTitleColor: "#000000"
};

const GROUP_PROPERTY_PREFIX = "callout-group-";

module.exports = {
    BUILTIN_CALLOUTS,
    BUILTIN_CALLOUT_ICONS,
    BUNDLED_CALLOUTS,
    DEFAULT_CALLOUT_ICON,
    DEFAULT_SETTINGS,
    GROUP_PROPERTY_PREFIX
};
