/**
 * Agent Host — 入口
 *
 * 作为独立 Node.js 进程运行，通过 IPC 与 Electron 主进程通信。
 * Session 管理逻辑在 ./session.ts 中。
 */

import { ModelRuntime } from "@earendil-works/pi-coding-agent";

import type { AgentMessage } from "../shared/agent-types";
import {
	closeAllSessions,
	currentSessionId,
	currentSessionName,
	getInitialMessages,
	handleCreateSession,
	handleDeleteSession,
	handleListSessions,
	handleRenameSession,
	handleSessionHistory,
	handleSwitchSession,
	initSession,
	session,
} from "./session.ts";

// ── Agent 配置 ──

export const agentModelRef = { value: undefined as string | undefined };
export const thinkingLevelRef = { value: undefined as string | undefined };
let agentAvailableModels: string[] = [];

// ── IPC ──

function send(msg: AgentMessage): void {
	if (process.send) process.send(msg);
}

function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── 初始化 ──

async function initAgent(): Promise<void> {
	console.log("[AgentHost] Initializing Pi Agent SDK...");

	const modelRuntime = await ModelRuntime.create();

	if (process.env.ANTHROPIC_API_KEY) {
		modelRuntime.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API_KEY);
	}
	if (process.env.OPENAI_API_KEY) {
		modelRuntime.setRuntimeApiKey("openai", process.env.OPENAI_API_KEY);
	}

	const available = await modelRuntime.getAvailable();
	if (available.length === 0) {
		console.warn(
			"[AgentHost] No authenticated models available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
		);
	} else {
		console.log(
			`[AgentHost] Available models: ${available.map((m) => m.id).join(", ")}`,
		);
	}

	agentAvailableModels = available.map((m) => m.id);

	await initSession({
		modelRuntime,
		sendFn: send,
		agentModelRef,
		thinkingLevelRef,
	});
}

// ── 消息路由 ──

process.on("message", (raw: unknown) => {
	const msg = raw as AgentMessage;
	if (!msg?.type) {
		console.warn("[AgentHost] Received invalid message:", raw);
		return;
	}

	console.log(`[AgentHost] ← ${msg.type} (${msg.id})`);

	switch (msg.type) {
		// ── Chat ──
		case "chat:send": {
			const payload = msg.payload as { content: string; sessionId: string };
			if (!payload?.content) {
				send({
					id: msg.id,
					type: "chat:error",
					payload: {
						sessionId: payload?.sessionId ?? "",
						code: "INVALID_PAYLOAD",
						message: "Missing content",
					},
				});
				return;
			}

			if (!session) {
				send({
					id: msg.id,
					type: "chat:error",
					payload: {
						sessionId: payload.sessionId ?? "",
						code: "NOT_READY",
						message: "Agent session not initialized yet",
					},
				});
				return;
			}

			session.prompt(payload.content).catch((err) => {
				const message = err instanceof Error ? err.message : String(err);
				send({
					id: uid(),
					type: "chat:error",
					payload: {
						sessionId: payload.sessionId ?? "",
						code: "AGENT_ERROR",
						message,
					},
				});
				console.error("[AgentHost] prompt error:", err);
			});
			break;
		}

		case "chat:cancel": {
			if (session) {
				session.abort().catch((err) => {
					console.error("[AgentHost] abort error:", err);
				});
			}
			break;
		}

		// ── Agent ──
		case "agent:status": {
			send({
				id: msg.id,
				type: "agent:status",
				payload: {
					status: session?.isStreaming ? "responding" : "idle",
				},
			});
			break;
		}

		case "agent:config": {
			send({
				id: msg.id,
				type: "agent:config",
				payload: {
					model: agentModelRef.value,
					thinkingLevel: thinkingLevelRef.value,
					availableModels: agentAvailableModels,
					status: session?.isStreaming ? "responding" : "idle",
				},
			});
			break;
		}

		// ── Session ──
		case "session:create":
			handleCreateSession(msg.id, msg.payload as { name?: string });
			break;
		case "session:list":
			handleListSessions(msg.id);
			break;
		case "session:switch":
			handleSwitchSession(msg.id, msg.payload as { sessionId: string });
			break;
		case "session:delete":
			handleDeleteSession(msg.id, msg.payload as { sessionId: string });
			break;
		case "session:rename":
			handleRenameSession(
				msg.id,
				msg.payload as { sessionId: string; name: string },
			);
			break;
		case "session:history":
			handleSessionHistory(msg.id, msg.payload as { sessionId: string });
			break;

		// ── Shutdown ──
		case "agent:shutdown":
			console.log("[AgentHost] Shutting down...");
			shutdown();
			break;
	}
});

// ── 生命周期 ──

async function startup(): Promise<void> {
	try {
		await initAgent();

		const initialMessages = getInitialMessages();

		send({
			id: "agent-ready",
			type: "agent:ready",
			payload: {
				pid: process.pid,
				version: "0.4.0",
				model: agentModelRef.value,
				thinkingLevel: thinkingLevelRef.value,
				availableModels: agentAvailableModels,
			},
		});

		if (currentSessionId) {
			send({
				id: "agent-ready",
				type: "session:switched",
				payload: {
					sessionId: currentSessionId,
					name: currentSessionName ?? "Untitled",
					messages: initialMessages,
				},
			});
		}

		console.log(`[AgentHost] Started (PID: ${process.pid})`);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[AgentHost] Failed to initialize:", message);
		send({
			id: "agent-ready",
			type: "chat:error",
			payload: {
				sessionId: "",
				code: "INIT_ERROR",
				message: `Failed to initialize agent: ${message}`,
			},
		});
	}
}

async function shutdown(): Promise<void> {
	await closeAllSessions();
	process.exit(0);
}

process.on("SIGTERM", () => shutdown());
process.on("SIGINT", () => shutdown());

startup();
