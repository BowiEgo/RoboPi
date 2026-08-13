/**
 * RoboPi Web server (minimal, Electron-free).
 *
 * Serves the built renderer (`out/renderer`) and bridges the browser to the
 * Agent Host child process:
 *   - UI → Agent:  POST /agent/send  (forwarded to the child via IPC)
 *   - Agent → UI:  GET  /agent/stream (Server-Sent Events, one frame per message)
 *   - Settings:    GET/POST /api/settings*
 *
 * This replaces the Electron main-process bridge (agent-host-manager) with a
 * plain Node http server, so the exact same renderer + Agent Host run without
 * Electron. The Agent Host source is unchanged.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type AgentMessage, AgentMessageType, isValidMessageType } from "../../shared/agent-types.ts";
import { getAuthPath, getConfigDir, getSessionsDir } from "../agent/config.ts";

// ── Paths ──

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..");

const rendererDir = process.env.ROBOPI_RENDERER_DIR ?? resolve(root, "out/renderer");
const agentTsEntry = resolve(root, "src/backend/agent/index.mts");
const agentBundleEntry = resolve(root, "out/main/agent-host.mjs");

const PORT = Number(process.env.PORT ?? 3000);
// When disabled, this process only serves /agent + /api (API-only mode). The
// dev:web script sets this to "0" so the UI lives solely on the Vite port.
const serveStatic = (process.env.ROBOPI_SERVE_STATIC ?? "1") !== "0";

// ── Agent Host child process ──

const agentEntry = existsSync(agentTsEntry) ? agentTsEntry : agentBundleEntry;

const child: ChildProcess = spawn(process.execPath, ["--no-warnings", agentEntry], {
	stdio: ["pipe", "pipe", "pipe", "ipc"],
	env: {
		...process.env,
		PI_AGENT_MODEL: process.env.PI_AGENT_MODEL ?? "pi-agent/v1",
	},
});

let isReady = false;
const pending: AgentMessage[] = [];
const clients = new Set<ServerResponse>();

// Cached state for re-hydrating late-connecting browsers.
let lastAgentReady: AgentMessage | null = null;
let lastSessionSwitched: AgentMessage | null = null;
let lastSessionListResult: AgentMessage | null = null;
let lastAgentConfig: AgentMessage | null = null;
let lastAvailableModels: string[] = [];
let lastProviderList: { id: string; name: string }[] = [];

child.stdout?.on("data", (d: Buffer) => process.stdout.write(`[agent] ${d.toString()}`));
child.stderr?.on("data", (d: Buffer) => process.stderr.write(`[agent] ${d.toString()}`));

child.on("message", (raw: unknown) => {
	const msg = raw as AgentMessage;
	if (!msg?.type || !isValidMessageType(msg.type)) return;

	if (msg.type === AgentMessageType.AgentReady) {
		isReady = true;
		lastAgentReady = msg;
		const p = msg.payload as { availableModels?: string[]; providerList?: { id: string; name: string }[] };
		lastAvailableModels = p.availableModels ?? [];
		lastProviderList = p.providerList ?? [];
		flushPending();
	} else if (msg.type === AgentMessageType.SessionSwitched) {
		lastSessionSwitched = msg;
	} else if (msg.type === AgentMessageType.SessionListResult) {
		lastSessionListResult = msg;
	} else if (msg.type === AgentMessageType.AgentConfig) {
		lastAgentConfig = msg;
	}

	broadcast(msg);
});

child.on("error", (err) => {
	process.stderr.write(`[agent] spawn error: ${err.message}\n`);
	isReady = false;
});

child.on("exit", (code, signal) => {
	process.stderr.write(`[agent] exited (code: ${code}, signal: ${signal})\n`);
	isReady = false;
});

function sendToAgent(msg: AgentMessage): void {
	if (child && isReady) child.send(msg);
	else pending.push(msg);
}

function flushPending(): void {
	while (child && pending.length > 0) {
		const msg = pending.shift();
		if (msg) child.send(msg);
	}
}

function broadcast(msg: AgentMessage): void {
	const frame = `data: ${JSON.stringify(msg)}\n\n`;
	for (const res of clients) res.write(frame);
}

function replay(res: ServerResponse): void {
	for (const msg of [lastAgentReady, lastSessionSwitched, lastSessionListResult, lastAgentConfig]) {
		if (!msg) continue;
		res.write(
			`data: ${JSON.stringify({ ...msg, id: `replay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })}\n\n`,
		);
	}
}

// ── Credentials (mirrors src/main/settings.ts, Electron-free) ──

interface Credential {
	type?: string;
	key?: string;
}

async function readCredentials(): Promise<Record<string, Credential>> {
	try {
		const raw = await readFile(getAuthPath(), "utf-8");
		return JSON.parse(raw) as Record<string, Credential>;
	} catch {
		return {};
	}
}

async function writeCredential(provider: string, apiKey: string): Promise<void> {
	await mkdir(dirname(getAuthPath()), { recursive: true });
	const creds = await readCredentials();
	creds[provider] = { type: "api_key", key: apiKey };
	await writeFile(getAuthPath(), JSON.stringify(creds, null, 2), "utf-8");
}

function hasApiKey(cred?: Credential): boolean {
	return cred?.type === "api_key" && !!cred.key;
}

// ── HTTP helpers ──

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
	let raw = "";
	for await (const chunk of req) raw += chunk as string;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return {};
	}
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(JSON.stringify(body));
}

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

// ── Handlers ──

function handleStream(req: IncomingMessage, res: ServerResponse): void {
	res.writeHead(200, {
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
	});
	res.write(": connected\n\n");
	clients.add(res);
	replay(res);
	req.on("close", () => clients.delete(res));
	// Re-request a fresh session list so this client gets one even if its own
	// init request raced the SSE connection (its response broadcast before the
	// client was added to `clients`).
	sendToAgent({
		id: `refresh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		type: AgentMessageType.SessionList,
		payload: {},
	} as AgentMessage);
}

function handleAgentSend(req: IncomingMessage, res: ServerResponse): void {
	void readJsonBody(req).then((body) => {
		sendToAgent(body as unknown as AgentMessage);
		sendJson(res, 200, { ok: true });
	});
}

async function handleGetSettings(_req: IncomingMessage, res: ServerResponse): Promise<void> {
	const creds = await readCredentials();
	const configuredProviders = Object.entries(creds)
		.filter(([, cred]) => hasApiKey(cred))
		.map(([id]) => ({ id, name: id }));
	sendJson(res, 200, {
		configDir: getConfigDir(),
		sessionsDir: getSessionsDir(),
		hasAnthropic: hasApiKey(creds.anthropic),
		hasOpenAI: hasApiKey(creds.openai),
		availableModels: lastAvailableModels,
		providerList: lastProviderList,
		configuredProviders,
	});
}

async function handleSetApiKey(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const body = (await readJsonBody(req)) as { provider?: string; apiKey?: string };
	if (!body.provider || !body.apiKey) {
		sendJson(res, 400, { success: false });
		return;
	}
	await writeCredential(body.provider, body.apiKey);
	sendToAgent({
		id: `key-${Date.now()}`,
		type: AgentMessageType.ModelSetApiKey,
		payload: { provider: body.provider, apiKey: body.apiKey },
	} as AgentMessage);
	sendJson(res, 200, { success: true });
}

function handleRefreshModels(_req: IncomingMessage, res: ServerResponse): void {
	const id = `refresh-${Date.now()}`;
	const result = new Promise<string[]>((resolveResult) => {
		const timeout = setTimeout(() => {
			child.off("message", onMessage);
			resolveResult([]);
		}, 10000);
		const onMessage = (raw: unknown): void => {
			const msg = raw as AgentMessage;
			if (msg?.id === id && msg.type === AgentMessageType.ModelRefreshed) {
				clearTimeout(timeout);
				child.off("message", onMessage);
				const p = msg.payload as { models?: string[] };
				resolveResult(p.models ?? []);
			}
		};
		child.on("message", onMessage);
		sendToAgent({ id, type: AgentMessageType.ModelRefresh, payload: { force: false } } as AgentMessage);
	});
	void result.then((models) => sendJson(res, 200, models));
}

async function handleStatic(_req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
	const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
	const target = normalize(resolve(rendererDir, rel));
	if (!target.startsWith(rendererDir)) {
		res.writeHead(403);
		res.end("Forbidden");
		return;
	}
	let filePath = target;
	if (!existsSync(filePath)) filePath = resolve(rendererDir, "index.html"); // SPA fallback
	try {
		const data = await readFile(filePath);
		res.writeHead(200, { "Content-Type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream" });
		res.end(data);
	} catch {
		res.writeHead(404);
		res.end("Not found");
	}
}

// ── Server ──

const server = createServer((req, res) => {
	const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
	const pathname = url.pathname;

	if (req.method === "GET" && pathname === "/agent/stream") return handleStream(req, res);
	if (req.method === "POST" && pathname === "/agent/send") return handleAgentSend(req, res);
	if (req.method === "GET" && pathname === "/api/settings") return void handleGetSettings(req, res);
	if (req.method === "POST" && pathname === "/api/settings/api-key") return void handleSetApiKey(req, res);
	if (req.method === "POST" && pathname === "/api/settings/refresh-models") return handleRefreshModels(req, res);
	if (serveStatic) return void handleStatic(req, res, pathname);

	// API-only mode: no static files. Point the browser at the Vite dev URL.
	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ error: "API-only mode — open the dev server URL (e.g. http://localhost:5173) instead" }));
});

server.listen(PORT, () => {
	process.stdout.write(`RoboPi web server: http://localhost:${PORT}\n`);
	process.stdout.write(`  renderer: ${rendererDir}\n`);
	process.stdout.write(`  agent:    ${agentEntry}\n`);
});

function shutdown(): void {
	server.close();
	child.kill();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
