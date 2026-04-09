import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../../api/index.js");

console.log("Building API serverless handler for Vercel...");

await esbuild({
  entryPoints: [path.resolve(__dirname, "src/app.ts")],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile: outFile,
  logLevel: "info",
  external: ["*.node", "pg-native", "pino-pretty"],
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  banner: {
    js: `"use strict";
const { createRequire: __crReq } = require('module');
globalThis.require = __crReq(__filename);
globalThis.__dirname = __dirname;
globalThis.__filename = __filename;
`,
  },
  footer: {
    js: `if (module.exports && module.exports.default) { module.exports = module.exports.default; }`,
  },
});

console.log(`API serverless handler written to: ${outFile}`);
