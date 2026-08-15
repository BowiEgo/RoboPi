/**
 * Agent Host — entry point.
 *
 * Runs as a standalone Node.js child process, communicating with the Electron
 * main process via IPC.
 *
 */

import { type AgentMessage, AgentMessageType, isValidMessageType } from "../../shared/agent-types.ts";
import { createLogger } from "../../shared/logger/index.ts";
import { PluginRegistry, type PluginEntry, type PluginManifest } from "../../shared/plugin/registry.ts";
import { boolean, object } from "../../shared/plugin/schema.ts";
import { PluginError } from "../../shared/plugin/types.ts";
import { AgentHost } from "./agent-host.ts";
import { AGENT_READY_ID, AGENT_VERSION, DEFAULT_SESSION_NAME, ErrorCode } from "./constants.ts";
import {
	isChatSendPayload,
	isModelConfigPayload,
	isModelRefreshPayload,
	isModelSetApiKeyPayload,
	isSessionCreatePayload,
	isSessionIdPayload,
	isSessionRenamePayload,
	isThinkingLevel,
} from "./guards.ts";
import { onHostMessage, postMessageToHost, replayState, setTransport, uid } from "./ipc.ts";
import type { CoreEvents, CoreServices } from "./plugin-types.ts";
import { respondError, respondNotReady } from "./respond.ts";
import type { SessionHost } from "./session/session-host.ts";
import { ChildProcessTransport } from "./transport/child-process.ts";
import { StdioTransport } from "./transport/stdio.ts";
import { WebSocketTransport } from "./transport/websocket.ts";

// ============================================================================
// Lifecycle
// ============================================================================

const agentHost = new AgentHost();
const logger = createLogger("AgentHost");
const registry = new PluginRegistry<CoreEvents, CoreServices>();

interface PluginDef {
	manifest: PluginManifest<CoreServices>;
	entry: PluginEntry<CoreEvents, CoreServices>;
	defaultConfig?: unknown;
}

/** Core plugin definitions, kept so an unloaded plugin can be re-enabled. */
const pluginDefs = new Map<string, PluginDef>();

function registerCorePlugin(
	manifest: PluginManifest<CoreServices>,
	entry: PluginEntry<CoreEvents, CoreServices>,
	config?: unknown,
) {
	pluginDefs.set(manifest.id, { manifest, entry, defaultConfig: config });
	return registry.load(manifest, entry, config);
}

/** Accessor — the session service from the plugin registry. */
function sh(): SessionHost | null {
	return registry.root.get("session") ?? null;
}

/** Accessor — the model service from the plugin registry. */
function model(): AgentHost {
	return registry.root.require("model");
}

/** Select and start the host transport based on `ROBOPI_TRANSPORT`. */
async function startTransport(): Promise<void> {
	const mode = process.env.ROBOPI_TRANSPORT ?? "ipc";
	if (mode === "ws") {
		const port = Number(process.env.ROBOPI_PORT ?? 9241);
		const transport = new WebSocketTransport(port, (send) => {
			replayState((msg) => send(JSON.stringify(msg)));
		});
		setTransport(transport);
		await transport.start();
		logger.info(`WebSocket transport listening on ws://127.0.0.1:${port}`);
	} else if (mode === "stdio") {
		const transport = new StdioTransport();
		setTransport(transport);
		await transport.start();
	} else {
		setTransport(new ChildProcessTransport());
	}
}

/** Register the session service once the Agent Host has initialized. */
function registerSessionService(): void {
	registerCorePlugin({ id: "core:session", provide: ["session"], inject: ["model"] }, (ctx) => {
		const model = ctx.require("model");
		const session = model.sessionHost;
		if (!session) throw new PluginError("SessionHost not initialized");
		ctx.provide("session", session);
	});
}

/** Print the assembled plugin tree (diagnostics, ROBOPI_DUMP_PLUGINS=1). */
function dumpPlugins(): void {
	const handles = registry.list();
	logger.info(`Loaded ${handles.length} plugins:`);
	for (const handle of handles) {
		const inject = handle.manifest.inject?.length ? ` inject=[${handle.manifest.inject.join(", ")}]` : "";
		const provide = handle.manifest.provide?.length ? ` provide=[${handle.manifest.provide.join(", ")}]` : "";
		logger.info(`  - ${handle.id} (${handle.state})${inject}${provide}`);
	}
	const pending = registry.pendingPlugins();
	if (pending.length) {
		logger.info(`Pending: ${pending.join(", ")}`);
	}
}

/** Send the UI plugin manifest to the renderer. */
function sendUIManifest(): void {
	const extensions = registry
		.list()
		.filter((handle) => handle.manifest.ui)
		.map((handle) => ({
			pluginId: handle.id,
			slots: handle.manifest.ui!.slots,
			view: handle.manifest.ui!.view,
			viewConfig: handle.manifest.ui!.viewConfig,
			settingsSchema: handle.manifest.Config?.describe(),
			settingsValue: handle.config,
		}));
	postMessageToHost({
		id: uid(),
		type: AgentMessageType.UIManifest,
		payload: { extensions },
	});
}

/** Reload a plugin with new config, then re-ship the UI manifest. */
async function handlePluginConfig(msg: AgentMessage): Promise<void> {
	const payload = msg.payload as { pluginId: string; config: unknown };
	try {
		await registry.reload(payload.pluginId, payload.config);
		sendPluginList();
		sendUIManifest();
	} catch (err) {
		logger.error("plugin config reload failed", err);
	}
}

/** Unload a plugin, then re-ship the UI manifest so its UI disappears. */
async function handlePluginUnload(msg: AgentMessage): Promise<void> {
	const payload = msg.payload as { pluginId: string };
	try {
		await registry.unload(payload.pluginId);
		sendPluginList();
		sendUIManifest();
	} catch (err) {
		logger.error("plugin unload failed", err);
	}
}

/** Re-enable a previously unloaded plugin from its saved definition. */
function handlePluginLoad(msg: AgentMessage): void {
	const payload = msg.payload as { pluginId: string };
	const def = pluginDefs.get(payload.pluginId);
	if (!def) return;
	registry.load(def.manifest, def.entry, def.defaultConfig);
	sendPluginList();
	sendUIManifest();
}

/** Send the full plugin inventory (enabled + disabled) to the renderer. */
function sendPluginList(): void {
	const plugins = registry.list().map((handle) => ({
		id: handle.id,
		name: handle.manifest.name ?? handle.id,
		enabled: true,
		ui: handle.manifest.ui,
		settingsSchema: handle.manifest.Config?.describe(),
		settingsValue: handle.config,
	}));
	for (const [id, def] of pluginDefs) {
		if (!registry.has(id)) {
			plugins.push({
				id,
				name: def.manifest.name ?? id,
				enabled: false,
				ui: def.manifest.ui,
				settingsSchema: def.manifest.Config?.describe(),
				settingsValue: def.defaultConfig,
			});
		}
	}
	postMessageToHost({
		id: uid(),
		type: AgentMessageType.PluginList,
		payload: { plugins },
	});
}

async function startup(): Promise<void> {
	try {
		await agentHost.initialize();
		registerSessionService();
		const host = sh();
		if (!host) throw new Error("SessionHost failed to initialize");

		postMessageToHost({
			id: AGENT_READY_ID,
			type: AgentMessageType.AgentReady,
			payload: {
				pid: process.pid,
				version: AGENT_VERSION,
				model: host.getCurrentModel() ?? agentHost.modelRef.value,
				thinkingLevel: agentHost.thinkingLevelRef.value,
				availableThinkingLevels: host.getAvailableThinkingLevels(),
				availableModels: agentHost.getAvailableModels(),
				configuredModels: agentHost.getConfiguredModels(),
				providerList: agentHost.getProviderList(),
			},
		});

		if (host.currentSessionId) {
			postMessageToHost({
				id: AGENT_READY_ID,
				type: AgentMessageType.SessionSwitched,
				payload: {
					sessionId: host.currentSessionId,
					name: host.currentSessionName ?? DEFAULT_SESSION_NAME,
					messages: host.getInitialMessages(),
					model: host.getCurrentModel(),
				},
			});
			host.pushStats();
		}

		logger.info(`Started (PID: ${process.pid})`);
		if (process.env.ROBOPI_DUMP_PLUGINS === "1") dumpPlugins();
		sendUIManifest();
		sendPluginList();
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error("Failed to initialize", message);
		postMessageToHost({
			id: AGENT_READY_ID,
			type: AgentMessageType.AgentError,
			payload: {
				code: ErrorCode.INIT_ERROR,
				message: `Failed to initialize agent: ${message}`,
			},
		});
	}
}

async function shutdown(): Promise<void> {
	const host = sh();
	if (host) {
		await host.settingsManager?.flush().catch(() => {});
		await host.dispose().catch(() => {});
	}
	process.exit(0);
}

// ============================================================================
// Message routing
// ============================================================================

function registerMessageHandlers(): void {
	// Bridge: inbound transport messages → the plugin event bus.
	onHostMessage((raw) => {
		registry.root.emit("transport:message", raw as AgentMessage);
	});

	// Model service — the AgentHost instance is available immediately.
	registerCorePlugin(
		{
			id: "core:model",
			provide: ["model"],
			Config: object({ autoRefresh: boolean() }),
			ui: { slots: ["settings:section"], view: "plugin-list" },
		},
		(ctx) => {
			ctx.provide("model", agentHost);
		},
		{ autoRefresh: false },
	);

	// Route inbound protocol messages to typed `ipc:<type>` events.
	registerCorePlugin({ id: "core:ipc-router" }, (ctx) => {
		ctx.on("transport:message", (raw) => {
			const msg = raw as AgentMessage;
			if (!msg?.type || !isValidMessageType(msg.type)) {
				logger.warn("Received invalid message", raw);
				return;
			}
			logger.debug(`← ${msg.type} (${msg.id})`);
			ctx.emit(`ipc:${msg.type}` as `ipc:${string}`, msg);
		});
	});

	// One listener per protocol message type.
	registerCorePlugin({ id: "core:ipc-handlers" }, (ctx) => {
		ctx.on(`ipc:${AgentMessageType.ChatSend}`, handleChatSend);
		ctx.on(`ipc:${AgentMessageType.ChatCancel}`, () => handleChatCancel());
		ctx.on(`ipc:${AgentMessageType.AgentStatus}`, (msg) => handleAgentStatus(msg.id));
		ctx.on(`ipc:${AgentMessageType.AgentConfig}`, (msg) => void handleAgentConfig(msg));
		ctx.on(`ipc:${AgentMessageType.SessionCreate}`, handleSessionCreate);
		ctx.on(`ipc:${AgentMessageType.SessionList}`, (msg) => handleSessionList(msg.id));
		ctx.on(`ipc:${AgentMessageType.SessionSwitch}`, handleSessionSwitch);
		ctx.on(`ipc:${AgentMessageType.SessionDelete}`, handleSessionDelete);
		ctx.on(`ipc:${AgentMessageType.SessionRename}`, handleSessionRename);
		ctx.on(`ipc:${AgentMessageType.SessionHistory}`, handleSessionHistory);
		ctx.on(`ipc:${AgentMessageType.AgentShutdown}`, () => handleShutdown());
		ctx.on(`ipc:${AgentMessageType.ModelRefresh}`, (msg) => void handleModelRefresh(msg));
		ctx.on(`ipc:${AgentMessageType.ModelSetApiKey}`, (msg) => void handleModelSetApiKey(msg));
		ctx.on(`ipc:${AgentMessageType.PluginConfig}`, (msg) => void handlePluginConfig(msg));
		ctx.on(`ipc:${AgentMessageType.PluginUnload}`, (msg) => void handlePluginUnload(msg));
		ctx.on(`ipc:${AgentMessageType.PluginLoad}`, (msg) => handlePluginLoad(msg));
	});
}

// ============================================================================
// Handler functions
// ============================================================================

function handleChatSend(msg: AgentMessage): void {
	const payload = msg.payload;
	if (!isChatSendPayload(payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Missing or invalid content");
		return;
	}

	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}
	if (!host.session) {
		respondError(msg.id, ErrorCode.NOT_READY, "Agent session not initialized yet");
		return;
	}

	host.session.prompt(payload.content).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		logger.error("prompt error", err);
		postMessageToHost({
			id: uid(),
			type: AgentMessageType.ChatError,
			payload: {
				sessionId: payload.sessionId ?? "",
				code: ErrorCode.AGENT_ERROR,
				message,
			},
		});
	});
}

function handleChatCancel(): void {
	const host = sh();
	if (host?.session) {
		host.session.abort().catch((err) => {
			logger.error("abort error", err);
		});
	}
}

function handleAgentStatus(msgId: string): void {
	const host = sh();
	postMessageToHost({
		id: msgId,
		type: AgentMessageType.AgentStatus,
		payload: {
			status: host?.session?.isStreaming ? "responding" : "idle",
		},
	});
}

/** Handles both query (empty payload) and mutation (model/thinkingLevel). */
async function handleAgentConfig(msg: AgentMessage): Promise<void> {
	if (!isModelConfigPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid config payload");
		return;
	}

	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}

	await applyConfig(host, msg.payload);

	postMessageToHost({
		id: msg.id,
		type: AgentMessageType.AgentConfig,
		payload: {
			model: host.getCurrentModel() ?? model().modelRef.value,
			thinkingLevel: model().thinkingLevelRef.value,
			availableThinkingLevels: host.getAvailableThinkingLevels(),
			availableModels: model().getAvailableModels(),
			configuredModels: model().getConfiguredModels(),
			providerList: model().getProviderList(),
			status: host.session?.isStreaming ? "responding" : "idle",
		},
	});
}

async function applyConfig(
	host: NonNullable<ReturnType<typeof sh>>,
	payload: { model?: string; thinkingLevel?: string },
): Promise<void> {
	if (payload.model) {
		// session.setModel() already persists to settings via
		// setDefaultModelAndProvider(model.provider, model.id).
		await host.setModel(payload.model);
	}
	if (payload.thinkingLevel && isThinkingLevel(payload.thinkingLevel)) {
		host.setThinkingLevel(payload.thinkingLevel);
		host.settingsManager?.setDefaultThinkingLevel(payload.thinkingLevel);
		void host.settingsManager?.flush();
	}
}

function handleSessionCreate(msg: AgentMessage): void {
	if (!isSessionCreatePayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid session create payload");
		return;
	}
	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}
	void host.createSession(msg.id, msg.payload);
}

function handleSessionList(msgId: string): void {
	const host = sh();
	if (!host) {
		respondNotReady(msgId);
		return;
	}
	void host.listSessions(msgId);
}

function handleSessionSwitch(msg: AgentMessage): void {
	if (!isSessionIdPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid session switch payload");
		return;
	}
	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}
	void host.switchSession(msg.id, msg.payload);
}

function handleSessionDelete(msg: AgentMessage): void {
	if (!isSessionIdPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid session delete payload");
		return;
	}
	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}
	void host.deleteSession(msg.id, msg.payload);
}

function handleSessionRename(msg: AgentMessage): void {
	if (!isSessionRenamePayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid session rename payload");
		return;
	}
	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}
	void host.renameSession(msg.id, msg.payload);
}

function handleSessionHistory(msg: AgentMessage): void {
	if (!isSessionIdPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid session history payload");
		return;
	}
	const host = sh();
	if (!host) {
		respondNotReady(msg.id);
		return;
	}
	void host.history(msg.id, msg.payload);
}

function respondModelRefreshed(msgId: string): void {
	postMessageToHost({
		id: msgId,
		type: AgentMessageType.ModelRefreshed,
		payload: {
			models: model().getConfiguredModels(),
			availableModels: model().getAvailableModels(),
		},
	});
}

async function handleModelSetApiKey(msg: AgentMessage): Promise<void> {
	if (!isModelSetApiKeyPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid API key payload");
		return;
	}
	await model().setApiKey(msg.payload.provider, msg.payload.apiKey);
	respondModelRefreshed(msg.id);
}

async function handleModelRefresh(msg: AgentMessage): Promise<void> {
	if (!isModelRefreshPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid model refresh payload");
		return;
	}
	try {
		await model().refreshModels(msg.payload.force);
		respondModelRefreshed(msg.id);
	} catch (err) {
		logger.error("Model refresh failed", err);
		respondError(msg.id, ErrorCode.REFRESH_ERROR, "Model refresh failed");
	}
}

function handleShutdown(): void {
	logger.info("Shutting down...");
	void shutdown();
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());

void startTransport().then(() => {
	registerMessageHandlers();
	return startup();
});
