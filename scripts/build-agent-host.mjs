/**
 * Compile agent-host to ESM (.mjs) format
 *
 * agent-host runs as a standalone child process and needs native ESM to load pi-coding-agent.
 * Bundle all code (except the pi SDK) with esbuild, outputting .mjs.
 *
 * Usage: node scripts/build-agent-host.mjs
 */

import * as esbuild from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

await esbuild.build({
  entryPoints: [resolve(root, "src/backend/agent/index.mts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: resolve(root, "out/main/agent-host.mjs"),
  // Keep pi-coding-agent and its ESM deps external, resolved at runtime
  external: [
    "@earendil-works/*",
    "@anthropic-ai/*",
    "@google/*",
    "openai",
    "typebox",
    "@sinclair/*",
  ],
  target: "node20",
  sourcemap: true,
});

console.log("✓ agent-host.mjs built");
