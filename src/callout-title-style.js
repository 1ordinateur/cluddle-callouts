function formatDefaultCalloutTitle(calloutId) {
    const normalized = String(calloutId || "")
        .trim()
        .replace(/[-_]+/g, " ");

    if (normalized.length === 0) {
        return "";
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function extractCalloutId(rawValue) {
    const match = String(rawValue || "")
        .trim()
        .match(/^[A-Za-z0-9_+-]+/);

    return match ? match[0] : "";
}

function normalizeRenderedCalloutTitle(titleText) {
    return String(titleText || "")
        .replace(/\s+/g, " ")
        .trim();
}

function hasNonDefaultCalloutTitle(calloutId, titleText) {
    const normalizedTitle = normalizeRenderedCalloutTitle(titleText);
    if (normalizedTitle.length === 0) {
        return false;
    }

    return normalizedTitle !== formatDefaultCalloutTitle(calloutId);
}

module.exports = {
    extractCalloutId,
    formatDefaultCalloutTitle,
    normalizeRenderedCalloutTitle,
    hasNonDefaultCalloutTitle
};
