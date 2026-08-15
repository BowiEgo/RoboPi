/**
 * RoboPi Web server (minimal, Electron-free).
 *
 * Serves the built renderer and the settings API. Agent traffic no longer
 * passes through here: the browser connects straight to the Agent Host's
 * WebSocket transport (default port 9241). This process only:
 *   - spawns the Agent Host in WS mode,
 *   - keeps a lightweight WS client to cache settings data and relay the
 *     model API-key / refresh operations,
 *   - serves /api/settings* and the static renderer.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, extname, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

import { type AgentMessage, AgentMessageType } from "../../shared/agent-types.ts";
import { getAuthPath, getConfigDir, getSessionsDir } from "../agent/config.ts";

// ── Paths ──

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..");

const rendererDir = process.env.ROBOPI_RENDERER_DIR ?? resolve(root, "out/renderer");
const agentTsEntry = resolve(root, "src/backend/agent/index.mts");
const agentBundleEntry = resolve(root, "out/main/agent-host.mjs");

const PORT = Number(process.env.PORT ?? 3000);
const AGENT_PORT = Number(process.env.ROBOPI_PORT ?? 9241);
// When disabled, this process serves no static files (dev:web owns the UI).
const serveStatic = (process.env.ROBOPI_SERVE_STATIC ?? "1") !== "0";

// ── Agent Host child process (WS transport) ──

const agentEntry = existsSync(agentTsEntry) ? agentTsEntry : agentBundleEntry;

const child = spawn(process.execPath, ["--no-warnings", "--experimental-strip-types", agentEntry], {
	stdio: ["pipe", "pipe", "pipe", "ignore"],
	env: {
		...process.env,
		ROBOPI_TRANSPORT: "ws",
		ROBOPI_PORT: String(AGENT_PORT),
		PI_AGENT_MODEL: process.env.PI_AGENT_MODEL ?? "pi-agent/v1",
	},
});

child.stdout?.on("data", (d: Buffer) => process.stdout.write(`[agent] ${d.toString()}`));
child.stderr?.on("data", (d: Buffer) => process.stderr.write(`[agent] ${d.toString()}`));

// ── Lightweight WS client — settings data + model API-key/refresh ops ──

let lastAvailableModels: string[] = [];
let lastProviderList: { id: string; name: string }[] = [];
let agentWs: WebSocket | null = null;
const modelRefreshWaiters = new Map<string, (models: string[]) => void>();

function connectAgentWs(): void {
	const ws = new WebSocket(`ws://127.0.0.1:${AGENT_PORT}`);
	agentWs = ws;

	ws.on("message", (raw) => {
		let msg: AgentMessage;
		try {
			msg = JSON.parse(raw.toString()) as AgentMessage;
		} catch {
			return;
		}
		if (msg.type === AgentMessageType.AgentReady) {
			const p = msg.payload as { availableModels?: string[]; providerList?: { id: string; name: string }[] };
			lastAvailableModels = p.availableModels ?? [];
			lastProviderList = p.providerList ?? [];
		} else if (msg.type === AgentMessageType.ModelRefreshed) {
			const waiter = modelRefreshWaiters.get(msg.id);
			if (waiter) {
				modelRefreshWaiters.delete(msg.id);
				waiter((msg.payload as { models?: string[] }).models ?? []);
			}
		}
	});

	ws.on("close", () => {
		if (agentWs === ws) agentWs = null;
		setTimeout(connectAgentWs, 1000);
	});

	ws.on("error", () => {
		// close will fire and schedule a reconnect.
	});
}

connectAgentWs();

function sendToAgent(msg: AgentMessage): void {
	if (agentWs?.readyState === WebSocket.OPEN) {
		agentWs.send(JSON.stringify(msg));
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

// ── Settings handlers ──

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
			modelRefreshWaiters.delete(id);
			resolveResult([]);
		}, 10000);
		modelRefreshWaiters.set(id, (models) => {
			clearTimeout(timeout);
			resolveResult(models);
		});
		sendToAgent({ id, type: AgentMessageType.ModelRefresh, payload: { force: false } } as AgentMessage);
	});
	void result.then((models) => sendJson(res, 200, models));
}

// ── Static files ──

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

	if (req.method === "GET" && pathname === "/api/settings") return void handleGetSettings(req, res);
	if (req.method === "POST" && pathname === "/api/settings/api-key") return void handleSetApiKey(req, res);
	if (req.method === "POST" && pathname === "/api/settings/refresh-models") return handleRefreshModels(req, res);
	if (serveStatic) return void handleStatic(req, res, pathname);

	res.writeHead(404, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ error: "API-only mode — open the dev server URL (e.g. http://localhost:5173) instead" }));
});

server.listen(PORT, () => {
	process.stdout.write(`RoboPi web server: http://localhost:${PORT}\n`);
	process.stdout.write(`  renderer: ${rendererDir}\n`);
	process.stdout.write(`  agent:    ${agentEntry} (ws://127.0.0.1:${AGENT_PORT})\n`);
});

function shutdown(): void {
	server.close();
	child.kill();
	process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
