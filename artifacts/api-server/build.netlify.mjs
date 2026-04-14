import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(__dirname, "../../netlify/functions/api.js");

console.log("Building API serverless handler for Netlify...");
const pgNativeStubPlugin = {
  name: "pg-native-stub",
  setup(build) {
    build.onResolve({ filter: /^pg-native$/ }, () => ({
      path: path.resolve(__dirname, "stubs/pg-native.js"),
    }));
  },
};

await esbuild({
  entryPoints: [path.resolve(__dirname, "src/netlify-handler.ts")],
  plugins: [pgNativeStubPlugin],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile: outFile,
  logLevel: "info",
  external: ["*.node", "pino-pretty"],
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
});

console.log(`Netlify function written to: ${outFile}`);
