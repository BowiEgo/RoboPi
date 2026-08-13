/**
 * Agent Host — entry point.
 *
 * Runs as a standalone Node.js child process, communicating with the Electron
 * main process via IPC.
 *
 */

import { type AgentMessage, AgentMessageType, isValidMessageType } from "../../shared/agent-types.ts";
import { createLogger } from "../../shared/logger/index.ts";
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
import { postMessageToHost, uid } from "./ipc.ts";
import { respondError, respondNotReady } from "./respond.ts";

// ============================================================================
// Lifecycle
// ============================================================================

const agentHost = new AgentHost();
const logger = createLogger("AgentHost");

/** Accessor — returns null until initialize() completes. Handlers must check. */
function sh() {
	return agentHost.sessionHost;
}

async function startup(): Promise<void> {
	try {
		await agentHost.initialize();
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

process.on("message", (raw: unknown) => {
	const msg = raw as AgentMessage;
	if (!msg?.type || !isValidMessageType(msg.type)) {
		logger.warn("Received invalid message", raw);
		return;
	}

	logger.debug(`← ${msg.type} (${msg.id})`);

	switch (msg.type) {
		case AgentMessageType.ChatSend:
			handleChatSend(msg);
			break;
		case AgentMessageType.ChatCancel:
			handleChatCancel();
			break;
		case AgentMessageType.AgentStatus:
			handleAgentStatus(msg.id);
			break;
		case AgentMessageType.AgentConfig:
			handleAgentConfig(msg);
			break;
		case AgentMessageType.SessionCreate:
			handleSessionCreate(msg);
			break;
		case AgentMessageType.SessionList:
			handleSessionList(msg.id);
			break;
		case AgentMessageType.SessionSwitch:
			handleSessionSwitch(msg);
			break;
		case AgentMessageType.SessionDelete:
			handleSessionDelete(msg);
			break;
		case AgentMessageType.SessionRename:
			handleSessionRename(msg);
			break;
		case AgentMessageType.SessionHistory:
			handleSessionHistory(msg);
			break;
		case AgentMessageType.AgentShutdown:
			handleShutdown();
			break;
		case AgentMessageType.ModelRefresh:
			handleModelRefresh(msg);
			break;
		case AgentMessageType.ModelSetApiKey:
			handleModelSetApiKey(msg);
			break;
	}
});

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
			model: host.getCurrentModel() ?? agentHost.modelRef.value,
			thinkingLevel: agentHost.thinkingLevelRef.value,
			availableThinkingLevels: host.getAvailableThinkingLevels(),
			availableModels: agentHost.getAvailableModels(),
			configuredModels: agentHost.getConfiguredModels(),
			providerList: agentHost.getProviderList(),
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
			models: agentHost.getConfiguredModels(),
			availableModels: agentHost.getAvailableModels(),
		},
	});
}

async function handleModelSetApiKey(msg: AgentMessage): Promise<void> {
	if (!isModelSetApiKeyPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid API key payload");
		return;
	}
	await agentHost.setApiKey(msg.payload.provider, msg.payload.apiKey);
	respondModelRefreshed(msg.id);
}

async function handleModelRefresh(msg: AgentMessage): Promise<void> {
	if (!isModelRefreshPayload(msg.payload)) {
		respondError(msg.id, ErrorCode.INVALID_PAYLOAD, "Invalid model refresh payload");
		return;
	}
	try {
		await agentHost.refreshModels(msg.payload.force);
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

void startup();
