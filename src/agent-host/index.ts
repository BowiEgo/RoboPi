/**
 * Agent Host — entry point.
 *
 * Runs as a standalone Node.js child process, communicating with the Electron
 * main process via IPC.
 *
 * Agent initialization lives in ./agent.ts.
 * Session management lives in ./session.ts.
 */

import {
	type AgentMessage,
	AgentMessageType,
	isValidMessageType,
} from "../shared/agent-types.ts";
import { AgentHost } from "./agent.ts";
import { postMessageToHost, uid } from "./session.ts";

// ============================================================================
// Lifecycle
// ============================================================================

const agentHost = new AgentHost();

/** Convenience accessor — only valid after initialize(). */
function sh() {
	const h = agentHost.sessionHost;
	if (!h) throw new Error("SessionHost not initialized");
	return h;
}

async function startup(): Promise<void> {
	try {
		await agentHost.initialize();
		const host = sh();

		const initialMessages = host.getInitialMessages();

		postMessageToHost({
			id: "agent-ready",
			type: AgentMessageType.AgentReady,
			payload: {
				pid: process.pid,
				version: "0.4.0",
				model: agentHost.modelRef.value,
				thinkingLevel: agentHost.thinkingLevelRef.value,
				availableModels: agentHost.getAvailableModels(),
			configuredModels: agentHost.getConfiguredModels(),
			providerList: agentHost.getProviderList(),
			},
		});

		if (host.currentSessionId) {
			postMessageToHost({
				id: "agent-ready",
				type: AgentMessageType.SessionSwitched,
				payload: {
					sessionId: host.currentSessionId,
					name: host.currentSessionName ?? "Untitled",
					messages: initialMessages,
				},
			});
		}

		console.log(`[AgentHost] Started (PID: ${process.pid})`);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[AgentHost] Failed to initialize:", message);
		postMessageToHost({
			id: "agent-ready",
			type: AgentMessageType.ChatError,
			payload: {
				sessionId: "",
				code: "INIT_ERROR",
				message: `Failed to initialize agent: ${message}`,
			},
		});
	}
}

async function shutdown(): Promise<void> {
	await agentHost.sessionHost?.dispose();
	process.exit(0);
}

// ============================================================================
// Message routing
// ============================================================================

process.on("message", (raw: unknown) => {
	const msg = raw as AgentMessage;
	if (!msg?.type || !isValidMessageType(msg.type)) {
		console.warn("[AgentHost] Received invalid message:", raw);
		return;
	}

	console.log(`[AgentHost] ← ${msg.type} (${msg.id})`);

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
			handleAgentConfig(msg.id, msg.payload as { model?: string; thinkingLevel?: string });
			break;
		case AgentMessageType.SessionCreate:
			sh().createSession(msg.id, msg.payload as { name?: string });
			break;
		case AgentMessageType.SessionList:
			sh().listSessions(msg.id);
			break;
		case AgentMessageType.SessionSwitch:
			sh().switchSession(msg.id, msg.payload as { sessionId: string });
			break;
		case AgentMessageType.SessionDelete:
			sh().deleteSession(msg.id, msg.payload as { sessionId: string });
			break;
		case AgentMessageType.SessionRename:
			sh().renameSession(
				msg.id,
				msg.payload as { sessionId: string; name: string },
			);
			break;
		case AgentMessageType.SessionHistory:
			sh().history(msg.id, msg.payload as { sessionId: string });
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
	const payload = msg.payload as { content: string; sessionId: string };
	if (!payload?.content) {
		postMessageToHost({
			id: msg.id,
			type: AgentMessageType.ChatError,
			payload: {
				sessionId: payload?.sessionId ?? "",
				code: "INVALID_PAYLOAD",
				message: "Missing content",
			},
		});
		return;
	}

	const host = sh();
	if (!host.session) {
		postMessageToHost({
			id: msg.id,
			type: AgentMessageType.ChatError,
			payload: {
				sessionId: payload.sessionId ?? "",
				code: "NOT_READY",
				message: "Agent session not initialized yet",
			},
		});
		return;
	}

	host.session.prompt(payload.content).catch((err) => {
		const message = err instanceof Error ? err.message : String(err);
		postMessageToHost({
			id: uid(),
			type: AgentMessageType.ChatError,
			payload: {
				sessionId: payload.sessionId ?? "",
				code: "AGENT_ERROR",
				message,
			},
		});
		console.error("[AgentHost] prompt error:", err);
	});
}

function handleChatCancel(): void {
	const host = sh();
	if (host.session) {
		host.session.abort().catch((err) => {
			console.error("[AgentHost] abort error:", err);
		});
	}
}

function handleAgentStatus(msgId: string): void {
	postMessageToHost({
		id: msgId,
		type: AgentMessageType.AgentStatus,
		payload: {
			status: sh().session?.isStreaming ? "responding" : "idle",
		},
	});
}

async function handleAgentConfig(msgId: string, payload?: { model?: string; thinkingLevel?: string }): Promise<void> {
	// Apply and persist model change
	if (payload?.model) {
		// Per-session model: set on the current session + persist to settings
		await sh().setModel(payload.model);
		const slash = payload.model.indexOf("/");
		if (slash > 0) {
			sh().settingsManager?.setDefaultModelAndProvider(
				payload.model.slice(0, slash),
				payload.model.slice(slash + 1),
			);
		}
		void sh().settingsManager?.flush();
	}
	if (payload?.thinkingLevel) {
		agentHost.thinkingLevelRef.value = payload.thinkingLevel;
		sh().settingsManager?.setDefaultThinkingLevel(payload.thinkingLevel as any);
		void sh().settingsManager?.flush();
	}
	postMessageToHost({
		id: msgId,
		type: AgentMessageType.AgentConfig,
		payload: {
			model: sh().getCurrentModel() ?? agentHost.modelRef.value,
			thinkingLevel: agentHost.thinkingLevelRef.value,
			availableModels: agentHost.getAvailableModels(),
			configuredModels: agentHost.getConfiguredModels(),
			providerList: agentHost.getProviderList(),
			status: sh().session?.isStreaming ? "responding" : "idle",
		},
	});
}

async function handleModelSetApiKey(msg: AgentMessage): Promise<void> {
	const p = msg.payload as { provider: string; apiKey: string };
	if (!p?.provider || !p?.apiKey) return;
	await agentHost.setApiKey(p.provider, p.apiKey);
	postMessageToHost({
		id: msg.id,
		type: AgentMessageType.ModelRefreshed,
		payload: {
			models: agentHost.getConfiguredModels(),
			availableModels: agentHost.getAvailableModels(),
		},
	});
}

async function handleModelRefresh(msg: AgentMessage): Promise<void> {
	try {
		await agentHost.refreshModels(true);
		postMessageToHost({
			id: msg.id,
			type: AgentMessageType.ModelRefreshed,
			payload: {
				models: agentHost.getConfiguredModels(),
				availableModels: agentHost.getAvailableModels(),
			},
		});
	} catch (err) {
		console.error("[AgentHost] Model refresh failed:", err);
	}
}

function handleShutdown(): void {
	console.log("[AgentHost] Shutting down...");
	shutdown();
}

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

startup();
