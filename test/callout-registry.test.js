const test = require("node:test");
const assert = require("node:assert/strict");

const { CalloutRegistry } = require("../src/callout-registry");

test("parses custom callout metadata blocks from snippet CSS", () => {
    const registry = new CalloutRegistry({});
    const blocks = registry.parseCalloutBlocks(`
.callout[data-callout="research"], .callout[data-callout="paper"] {
    --callout-concept: Literature;
    --callout-groups: reading output;
    --callout-group-reading: paper article;
    --callout-group-output: summary notes;
}
`, "reading-snippets");

    assert.equal(blocks.length, 1);
    assert.deepEqual(blocks[0].ids, ["research", "paper"]);
    assert.equal(blocks[0].concept, "Literature");
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
        groups: [
            { name: "reading", aliases: ["paper", "article"] }
        ]
    }];

    const [option] = registry.buildMenuOptions("research", true);

    assert.equal(option.id, "paper");
    assert.equal(option.appearanceId, "research");
    assert.equal(option.group, "reading");
    assert.deepEqual(option.aliases, ["research", "paper"]);
});
