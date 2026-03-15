import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const buildOptions = {
    entryPoints: ["src/main.js"],
    bundle: true,
    outfile: "main.js",
    format: "cjs",
    platform: "browser",
    target: "es2020",
    external: ["obsidian"],
    logLevel: "info",
    sourcemap: false
};

if (isWatch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log("Watching for changes...");
} else {
    await esbuild.build(buildOptions);
}
