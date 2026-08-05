const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("picker consumes callout-color as a complete CSS color", () => {
    const styles = readProjectFile("styles.css");

    assert.match(
        styles,
        /--custom-callout-context-color:\s*var\(--callout-color,\s*rgb\(128, 128, 128\)\);/
    );
    assert.doesNotMatch(styles, /rgb\(var\(--custom-callout-context-color/);
});

test("bundled and documented callout colors use complete CSS colors", () => {
    for (const relativePath of ["styles.css", "README.md", "docs/example-medical-callouts.css"]) {
        const contents = readProjectFile(relativePath);
        const declarations = Array.from(contents.matchAll(/--callout-color:\s*([^;]+);/g));

        assert.ok(declarations.length > 0, `${relativePath} should contain callout color examples`);
        for (const declaration of declarations) {
            assert.doesNotMatch(
                declaration[1],
                /^\d+\s*,/,
                `${relativePath} contains a legacy RGB triplet: ${declaration[0]}`
            );
        }
    }
});
