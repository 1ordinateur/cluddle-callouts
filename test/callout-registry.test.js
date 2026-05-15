const test = require("node:test");
const assert = require("node:assert/strict");

const { CalloutRegistry } = require("../src/callout-registry");

test("parses custom callout metadata blocks from snippet CSS", () => {
    const registry = new CalloutRegistry({});
    const blocks = registry.parseCalloutBlocks(`
.callout[data-callout="research"], .callout[data-callout="paper"] {
    --callout-concept: Literature;
    --callout-icon: lucide-book-open-text;
    --callout-groups: reading output;
    --callout-group-reading: paper article;
    --callout-group-output: summary notes;
}
`, "reading-snippets");

    assert.equal(blocks.length, 1);
    assert.deepEqual(blocks[0].ids, ["research", "paper"]);
    assert.equal(blocks[0].concept, "Literature");
    assert.equal(blocks[0].icon, "book-open-text");
    assert.deepEqual(blocks[0].groups, [
        { name: "reading", aliases: ["paper", "article"] },
        { name: "output", aliases: ["summary", "notes"] }
    ]);
});

test("builds grouped custom callout menu options without DOM appearance probes", () => {
    const registry = new CalloutRegistry({});
    registry.customCallouts = [{
        id: "research",
        aliases: ["paper"],
        concept: "Literature",
        icon: "book-open-text",
        groups: [
            { name: "reading", aliases: ["paper", "article"] }
        ]
    }];

    const [option] = registry.buildMenuOptions("research", true);

    assert.equal(option.id, "paper");
    assert.equal(option.appearanceId, "research");
    assert.equal(option.group, "reading");
    assert.equal(option.icon, "book-open-text");
    assert.deepEqual(option.aliases, ["research", "paper"]);
});

test("normalizes only lucide custom callout icons", () => {
    const registry = new CalloutRegistry({});

    assert.equal(registry.normalizeIconName("lucide-stethoscope"), "stethoscope");
    assert.equal(registry.normalizeIconName("Lucide-Flask-Conical"), "flask-conical");
    assert.equal(registry.normalizeIconName("url(\"icon.svg\")"), "");
});

test("uses built-in and fallback callout icons", () => {
    const registry = new CalloutRegistry({});

    assert.equal(registry.buildMenuOptions("warning", false)[0].icon, "triangle-alert");
    assert.equal(registry.buildMenuOptions("unknown", false)[0].icon, "message-square");
});

test("adds bundled Cluddle callout under the default group", () => {
    const registry = new CalloutRegistry({}, {
        showBundledCluddleCallout: () => true
    });

    const option = registry.getMenuOptions().find((menuOption) => menuOption.id === "cluddle");

    assert.equal(option.key, "bundled:cluddle");
    assert.equal(option.group, "default");
    assert.equal(option.icon, "cloud");
    assert.equal(option.isBundled, true);
    assert.equal(option.isCustom, false);
});

test("omits bundled Cluddle callout when disabled", () => {
    const registry = new CalloutRegistry({}, {
        showBundledCluddleCallout: () => false
    });

    assert.equal(registry.getMenuOptions().some((option) => option.id === "cluddle"), false);
});

test("prefers user-defined Cluddle callout over bundled Cluddle", () => {
    const registry = new CalloutRegistry({}, {
        showBundledCluddleCallout: () => true
    });
    registry.customCallouts = [{
        id: "cluddle",
        aliases: [],
        concept: "user cluddle",
        icon: "star",
        groups: [
            { name: "custom", aliases: ["cluddle"] }
        ]
    }];

    const cluddleOptions = registry.getMenuOptions().filter((option) => option.id === "cluddle");

    assert.equal(cluddleOptions.length, 1);
    assert.equal(cluddleOptions[0].key, "custom:cluddle:custom");
    assert.equal(cluddleOptions[0].icon, "star");
});
