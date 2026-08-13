/**
 * Dev orchestration for the RoboPi web build (no Electron).
 *
 * Runs two processes side by side:
 *   1. src/backend/web/server.mts — Agent Host bridge + settings API (PORT, default 3000),
 *      API-only mode (no static files; the UI lives on the Vite port).
 *   2. Vite dev server — renderer with HMR (5173), proxying /agent + /api to the server
 *
 * Usage: npm run dev:web
 */

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const children = [];

function start(args, envOverrides = {}) {
	const child = spawn(process.execPath, args, {
		cwd: root,
		stdio: "inherit",
		env: { ...process.env, ...envOverrides },
	});
	children.push(child);
	child.on("exit", (code, signal) => {
		if (signal) return;
		if (code !== 0) shutdown(code ?? 0);
	});
}

function shutdown(code = 0) {
	for (const child of children) child.kill("SIGTERM");
	process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start([resolve(root, "src/backend/web/server.mts")], { ROBOPI_SERVE_STATIC: "0" });
start([resolve(root, "node_modules/vite/bin/vite.js"), "--config", resolve(root, "vite.web.config.ts")]);
