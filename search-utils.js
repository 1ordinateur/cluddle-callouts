function normalizeSearchText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getFuzzyScore(query, candidate) {
    const normalizedQuery = normalizeSearchText(query);
    const normalizedCandidate = normalizeSearchText(candidate);

    if (!normalizedQuery || !normalizedCandidate) {
        return 0;
    }

    if (normalizedCandidate === normalizedQuery) {
        return 1000 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
        return 800 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
    }

    const containsIndex = normalizedCandidate.indexOf(normalizedQuery);
    if (containsIndex >= 0) {
        return 650 - containsIndex * 4 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
    }

    let score = 0;
    let queryIndex = 0;
    let consecutive = 0;
    let firstMatchIndex = -1;
    let lastMatchIndex = -1;

    for (let candidateIndex = 0; candidateIndex < normalizedCandidate.length; candidateIndex += 1) {
        if (normalizedCandidate[candidateIndex] !== normalizedQuery[queryIndex]) {
            consecutive = 0;
            continue;
        }

        if (firstMatchIndex === -1) {
            firstMatchIndex = candidateIndex;
        }

        const isWordBoundary = candidateIndex === 0 || normalizedCandidate[candidateIndex - 1] === " ";
        score += isWordBoundary ? 35 : 18;
        consecutive += 1;
        score += consecutive * 12;
        lastMatchIndex = candidateIndex;
        queryIndex += 1;

        if (queryIndex === normalizedQuery.length) {
            break;
        }
    }

    if (queryIndex !== normalizedQuery.length) {
        return 0;
    }

    const spreadPenalty = Math.max(0, lastMatchIndex - firstMatchIndex - normalizedQuery.length);
    const startPenalty = Math.max(0, firstMatchIndex);
    return 300 + score - spreadPenalty * 3 - startPenalty * 2;
}

function getBestFuzzyScore(query, candidates) {
    let bestScore = 0;
    for (const candidate of candidates) {
        const score = getFuzzyScore(query, candidate);
        if (score > bestScore) {
            bestScore = score;
        }
    }
    return bestScore;
}

module.exports = {
    normalizeSearchText,
    getFuzzyScore,
    getBestFuzzyScore
};
