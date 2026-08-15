/**
 * Verify the WebSocket transport (Phase 1b).
 *
 * Spawns the Agent Host with ROBOPI_TRANSPORT=ws, connects to it as a
 * WebSocket client, and completes one request/response round-trip
 * (SessionList → SessionListResult).
 *
 * Note: the AgentReady broadcast is one-shot and may fire before the client
 * connects (no replay yet). To verify the round-trip we poll SessionList
 * until the agent is initialized and answers.
 *
 * Usage: node scripts/test-ws-transport.mjs
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const agentTsEntry = resolve(root, "src/backend/agent/index.mts");
const agentBundleEntry = resolve(root, "out/main/agent-host.mjs");
const agentEntry = existsSync(agentTsEntry) ? agentTsEntry : agentBundleEntry;

const PORT = 9241;
const TIMEOUT_MS = 30_000;

const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", agentEntry], {
	stdio: ["pipe", "pipe", "pipe", "ignore"],
	env: {
		...process.env,
		ROBOPI_TRANSPORT: "ws",
		ROBOPI_PORT: String(PORT),
	},
});

child.stdout?.on("data", (d) => process.stdout.write(`[agent] ${d}`));
child.stderr?.on("data", (d) => process.stderr.write(`[agent] ${d}`));

let done = false;

function finish(code) {
	if (done) return;
	done = true;
	child.kill();
	process.exit(code);
}

const timeout = setTimeout(() => {
	console.error("✗ 超时：未在时限内完成请求-响应");
	finish(1);
}, TIMEOUT_MS);

function connect(attempt = 0) {
	if (done) return;
	const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);

	ws.on("open", () => {
		console.log("✓ WS 已连接，轮询 SessionList…");
		let polls = 0;
		const poll = setInterval(() => {
			if (done) return clearInterval(poll);
			polls += 1;
			if (polls > 50) {
				clearInterval(poll);
				console.error("✗ 未收到 SessionListResult");
				clearTimeout(timeout);
				finish(1);
				return;
			}
			ws.send(
				JSON.stringify({
					id: `test-session-list-${polls}`,
					type: "session:list",
					payload: {},
				}),
			);
		}, 500);
	});

	ws.on("message", (raw) => {
		const msg = JSON.parse(raw.toString());
		if (msg.type === "session:list_result") {
			console.log("✓ 收到 SessionListResult，往返成功");
			console.log(JSON.stringify(msg.payload, null, 2));
			clearTimeout(timeout);
			ws.close();
			finish(0);
		}
	});

	ws.on("error", () => {
		if (done) return;
		if (attempt > 50) {
			console.error("✗ 无法连接 WS server");
			clearTimeout(timeout);
			finish(1);
			return;
		}
		setTimeout(() => connect(attempt + 1), 200);
	});
}

connect();
