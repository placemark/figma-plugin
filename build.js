import esbuild from "esbuild";
import Fs from "node:fs";

Fs.watchFile("lib/ui.html", (curr, prev) => {
  buildTemplate();
});

function buildTemplate() {
  const template = Fs.readFileSync("lib/ui.html", "utf8");
  const js = Fs.readFileSync("dist/ui.js", "utf8");
  const hyperscript = Fs.readFileSync(
    "node_modules/hyperscript.org/dist/_hyperscript.min.js",
    "utf8",
  );
  const css = Fs.readFileSync("dist/ui.css", "utf8");
  console.log("Rebuilt template");
  const replaced = template
    .replace("__JSSCRIPT__", js)
    .replace("__HYPERSCRIPT__", hyperscript)
    .replace("__CSSSTYLE__", css);
  Fs.writeFileSync("dist/ui.html", replaced);
}

const context = await esbuild
  .context({
    entryPoints: ["lib/ui.css"],
    bundle: true,
    outfile: "dist/ui.css",
    loader: {
      ".png": "dataurl",
    },
    logLevel: "info",
  })
  .catch(() => process.exit(1));

await context.watch();

const context2 = await esbuild
  .context({
    entryPoints: ["lib/ui.ts"],
    bundle: true,
    outfile: "dist/ui.js",
    logLevel: "info",
  })
  .catch(() => process.exit(1));

await context2.watch();

const context3 = await esbuild
  .context({
    entryPoints: ["lib/backend.ts"],
    bundle: true,
    outfile: "dist/backend.js",
    logLevel: "info",
    target: "es6",
  })
  .catch(() => process.exit(1));

await context3.watch();
