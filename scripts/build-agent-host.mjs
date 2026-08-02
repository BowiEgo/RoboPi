/**
 * 编译 agent-host 为 ESM (.mjs) 格式
 *
 * agent-host 作为独立子进程运行，需要原生 ESM 来加载 pi-coding-agent。
 * 这里用 esbuild bundle 所有代码（pi SDK 除外），输出 .mjs。
 *
 * 用法: node scripts/build-agent-host.mjs
 */

import * as esbuild from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

await esbuild.build({
  entryPoints: [resolve(root, "src/agent-host/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: resolve(root, "out/main/agent-host.mjs"),
  // pi-coding-agent 及其 ESM 依赖保持 external，运行时动态解析
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
