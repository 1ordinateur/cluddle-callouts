function getRelativeIndex(currentIndex, itemCount, delta) {
    if (!Number.isInteger(itemCount) || itemCount <= 0) {
        return -1;
    }

    if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= itemCount) {
        return delta >= 0 ? 0 : itemCount - 1;
    }

    return (currentIndex + delta + itemCount) % itemCount;
}

module.exports = {
    getRelativeIndex
};
