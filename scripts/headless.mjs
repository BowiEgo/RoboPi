/**
 * Headless REPL — talk to the Agent Host over stdio.
 *
 * Spawns the Agent Host in stdio transport mode, streams its protocol frames
 * to the terminal, and sends each line you type as a chat message.
 *
 *   npm run headless
 *
 * Type "/exit" (or Ctrl+C) to quit. The Agent Host logs go to stderr; stdout
 * carries only protocol frames, so piping is also supported.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const tsEntry = resolve(root, "src/backend/agent/index.mts");
const bundleEntry = resolve(root, "out/main/agent-host.mjs");
const entry = existsSync(tsEntry) ? tsEntry : bundleEntry;

const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", entry], {
	stdio: ["pipe", "pipe", "pipe"],
	env: {
		...process.env,
		ROBOPI_TRANSPORT: "stdio",
		PI_LOG_TO_STDERR: "1",
	},
});

let sessionId = "";
let sessionName = "";
let model = "";

let uidCounter = 0;
function uid() {
	uidCounter += 1;
	return `headless-${Date.now()}-${uidCounter}`;
}

// ── Protocol frames (stdout) ──

let buf = "";
child.stdout.on("data", (d) => {
	buf += d.toString();
	let idx;
	while ((idx = buf.indexOf("\n")) >= 0) {
		const line = buf.slice(0, idx).trim();
		buf = buf.slice(idx + 1);
		if (!line) continue;
		let msg;
		try {
			msg = JSON.parse(line);
		} catch {
			continue;
		}
		handleFrame(msg);
	}
});

function handleFrame(msg) {
	switch (msg.type) {
		case "session:switched": {
			sessionId = msg.payload?.sessionId ?? sessionId;
			sessionName = msg.payload?.name ?? sessionName;
			model = msg.payload?.model ?? model;
			process.stdout.write(`\n✓ 会话: "${sessionName}" (model: ${model})\n\n`);
			break;
		}
		case "agent:ready": {
			model = msg.payload?.model ?? model;
			break;
		}
		case "chat:chunk": {
			if (msg.payload?.kind === "content") process.stdout.write(msg.payload.delta ?? "");
			break;
		}
		case "thinking:update": {
			// Optionally surface thinking; keep it quiet by default.
			break;
		}
		case "chat:done": {
			process.stdout.write("\n\n");
			prompt();
			break;
		}
		case "chat:error":
		case "session:error":
		case "agent:error": {
			process.stdout.write(`\n✗ ${msg.payload?.message ?? msg.type}\n\n`);
			break;
		}
		default:
			break;
	}
}

// ── Logs (stderr) ──

child.stderr.on("data", (d) => process.stderr.write(d));

// ── User input ──

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

function prompt() {
	rl.setPrompt("> ");
	rl.prompt();
}

rl.on("line", (line) => {
	const text = line.trim();
	if (!text) {
		prompt();
		return;
	}
	if (text === "/exit" || text === "/quit") {
		shutdown();
		return;
	}
	child.stdin.write(
		`${JSON.stringify({
			id: uid(),
			type: "chat:send",
			payload: { content: text, sessionId },
		})}\n`,
	);
	// Re-prompt after the reply completes (chat:done).
});

function shutdown() {
	rl.close();
	child.stdin.end();
	child.kill();
	process.exit(0);
}

rl.on("close", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

prompt();
