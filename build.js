const esbuild = require("esbuild");
const Fs = require("fs");

function buildTemplate() {
  const template = Fs.readFileSync("lib/ui.html", "utf8");
  const js = Fs.readFileSync("dist/ui.js", "utf8");
  const css = Fs.readFileSync("dist/ui.css", "utf8");
  console.log("Rebuilt template");
  Fs.writeFileSync(
    "dist/ui.html",
    template.replace("{SCRIPT}", js).replace("{STYLE}", css)
  );
}

esbuild
  .build({
    entryPoints: ["lib/ui.css"],
    bundle: true,
    watch: true,
    outfile: "dist/ui.css",
    logLevel: "info",
    watch: {
      onRebuild(error, result) {
        if (error) console.error("watch build (ui) failed:", error);
        else console.log("watch build (ui) succeeded:", result);
        buildTemplate();
      },
    },
  })
  .catch(() => process.exit(1));

esbuild
  .build({
    entryPoints: ["lib/ui.ts"],
    bundle: true,
    watch: true,
    outfile: "dist/ui.js",
    logLevel: "info",
    watch: {
      onRebuild(error, result) {
        if (error) console.error("watch build (ui) failed:", error);
        else console.log("watch build (ui) succeeded:", result);
        buildTemplate();
      },
    },
  })
  .catch(() => process.exit(1));

esbuild
  .build({
    entryPoints: ["lib/code.ts"],
    bundle: true,
    watch: true,
    outfile: "dist/code.js",
    logLevel: "info",
    watch: {
      onRebuild(error, result) {
        if (error) console.error("watch build (code) failed:", error);
        else console.log("watch build (code) succeeded:", result);
      },
    },
  })
  .catch(() => process.exit(1));
