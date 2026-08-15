/**
 * useAgent — Agent session management hook (module singleton)
 *
 * Manages:
 *   - Session list, active session, message history
 *   - IPC communication with the Agent Host (create / switch / delete / rename / send)
 *   - Deferred creation: "New" only clears the UI; the session is created on the first message
 *
 * All async methods return Promises and can be awaited.
 *
 * Any component can import { useAgent } to get the same instance — no prop drilling.
 *
 * ⚠️ The IPC listener is registered once at module top level, not tied to any
 *    component lifecycle. Page switches never unsubscribe it, so the store keeps
 *    receiving agent messages after navigating back.
 */

import {
	AgentMessageType,
	type AgentReadyPayload,
	type ConfiguredModel,
	isValidMessageType,
	type SessionInfoPayload,
	type SessionStatsPayload,
	type UIExtensionDescriptor,
} from "@shared/agent-types";
import { createMemo, createSignal } from "solid-js";

import type { ChatBubbleProps } from "@/pages/ChatPage/ChatPanel/ChatBubble";
import type { AgentConfig } from "@/pages/ChatPage/Composer/Composer";

import { getAgentIpc } from "@/ipc/index";
import { setRemoteExtensions } from "@/ui-extensions";
import { fail, settle, track } from "@/utils/promise-tracker";
import { sessionToItem } from "@/utils/session-mapper";

// ════════════════════════════════════════════════════════════════
//  Module-level reactive state + IPC listener
//  Created once, never torn down — survives page switches.
// ════════════════════════════════════════════════════════════════

const agent = getAgentIpc();

const [sessions, setSessions] = createSignal<SessionInfoPayload[]>([]);
const [activeId, setActiveId] = createSignal<string | null>(null);
const [activeName, setActiveName] = createSignal<string>("");
const [messages, setMessages] = createSignal<ChatBubbleProps[]>([]);
const [resetKey, setResetKey] = createSignal("");
const [loading, setLoading] = createSignal(false);
const [agentConfig, setAgentConfig] = createSignal<AgentConfig>({});
const [stats, setStats] = createSignal<SessionStatsPayload | null>(null);

// Per-session message cache — preserves streaming content across session switches
const sessionMsgCache = new Map<string, ChatBubbleProps[]>();

let pendingMessage: string | null = null;
let _storeReady = false;

// ── IPC listener (registered once at module level) ──

if (agent && !_storeReady) {
	_storeReady = true;

	agent.onMessage((raw) => {
		const msg = raw as {
			id: string;
			type: string;
			payload: Record<string, unknown>;
		};
		if (!msg?.type || !isValidMessageType(msg.type)) return;

		switch (msg.type) {
			case AgentMessageType.AgentReady: {
				const p = msg.payload as unknown as AgentReadyPayload;
				setAgentConfig({
					model: p.model,
					thinkingLevel: p.thinkingLevel,
					availableThinkingLevels: p.availableThinkingLevels,
					configuredModels: p.configuredModels ?? [],
					status: "idle",
				});
				break;
			}

			case AgentMessageType.AgentConfig: {
				const p = msg.payload as AgentConfig;
				setAgentConfig((prev) => ({ ...prev, ...p }));
				break;
			}

			case AgentMessageType.UIManifest: {
				const p = msg.payload as { extensions: UIExtensionDescriptor[] };
				setRemoteExtensions(p.extensions ?? []);
				break;
			}

			case AgentMessageType.AgentStatus: {
				const p = msg.payload as {
					status?: string;
					model?: string;
					thinkingLevel?: string;
				};
				setAgentConfig((prev) => ({
					...prev,
					status: p.status,
					model: p.model ?? prev.model,
					thinkingLevel: p.thinkingLevel ?? prev.thinkingLevel,
				}));
				break;
			}

			case AgentMessageType.SessionSwitched: {
				const p = msg.payload as {
					sessionId: string;
					name: string;
					messages: ChatBubbleProps[];
					model?: string;
					thinkingLevel?: string;
					availableThinkingLevels?: string[];
				};
				setActiveId(p.sessionId);
				setActiveName(p.name);
				setAgentConfig((prev) => ({
					...prev,
					model: p.model ?? prev.model,
					thinkingLevel: p.thinkingLevel ?? prev.thinkingLevel,
					availableThinkingLevels: p.availableThinkingLevels ?? prev.availableThinkingLevels,
				}));
				// Prefer cached messages (may contain streaming progress not yet on disk).
				// Keep cache entry alive — background streaming events may still write to it.
				const cached = sessionMsgCache.get(p.sessionId);
				if (cached && cached.length >= (p.messages?.length ?? 0)) {
					setMessages(cached);
				} else {
					setMessages(p.messages ?? []);
				}
				setResetKey(`${p.sessionId}-${Date.now()}`);
				setLoading(false);
				settle(msg.id, p);
				break;
			}

			case AgentMessageType.SessionCreated: {
				const p = msg.payload as {
					sessionId: string;
					name: string;
					createdAt: number;
					file: string;
				};
				setActiveId(p.sessionId);
				setActiveName(p.name);
				setLoading(false);

				setSessions((prev) => {
					if (prev.some((s) => s.id === p.sessionId)) return prev;
					return [
						{
							file: p.file,
							id: p.sessionId,
							name: p.name,
							createdAt: p.createdAt,
							lastMessage: pendingMessage || "",
							lastActiveAt: Date.now(),
						},
						...prev,
					];
				});

				if (pendingMessage) {
					const text = pendingMessage;
					pendingMessage = null;
					agent.send({
						id: `msg-${Date.now()}`,
						type: AgentMessageType.ChatSend,
						payload: { content: text, sessionId: p.sessionId },
					});
				}
				settle(msg.id, p);
				break;
			}

			case AgentMessageType.SessionListResult: {
				const p = msg.payload as { sessions: SessionInfoPayload[] };
				if (p.sessions?.length) setSessions(p.sessions);
				settle(msg.id, p);
				break;
			}

			case AgentMessageType.SessionDeleted: {
				refreshSessions();
				settle(msg.id, msg.payload);
				break;
			}

			case AgentMessageType.SessionRenamed: {
				const p = msg.payload as { sessionId: string; name: string };
				if (activeId() === p.sessionId) setActiveName(p.name);
				refreshSessions();
				settle(msg.id, p);
				break;
			}

			case AgentMessageType.SessionStats: {
				const p = msg.payload as unknown as SessionStatsPayload;
				// Only apply stats for the active session (background sessions report too)
				if (p.sessionId === activeId()) setStats(p);
				break;
			}

			case AgentMessageType.ModelRefreshed: {
				const p = msg.payload as { models: ConfiguredModel[] };
				if (p.models?.length) {
					setAgentConfig((prev) => ({ ...prev, configuredModels: p.models }));
				}
				break;
			}

			case AgentMessageType.AgentError: {
				const message = (msg.payload as { message?: string }).message ?? "Unknown error";
				console.error("[useAgent] Agent error:", message);
				setLoading(false);
				fail(msg.id, new Error(message));
				break;
			}

			case AgentMessageType.SessionError: {
				const message = (msg.payload as { message?: string }).message ?? "Unknown error";
				console.error("[useAgent] Session error:", message);
				setLoading(false);
				fail(msg.id, new Error(message));
				break;
			}

			// ── Streaming events ──

			case AgentMessageType.ChatChunk: {
				const {
					delta,
					kind,
					sessionId: sid,
				} = msg.payload as {
					delta?: string;
					kind?: string;
					sessionId?: string;
				};
				if (!delta || kind !== "content") return;
				const applyChunk = (msgs: ChatBubbleProps[]) =>
					msgs.map((m, i) => (i === msgs.length - 1 && m.streaming ? { ...m, content: m.content + delta } : m));
				if (sid && sid !== activeId()) {
					// Update cache for non-active session (generation continues in background)
					const cached = sessionMsgCache.get(sid);
					if (cached) sessionMsgCache.set(sid, applyChunk(cached));
				} else {
					setMessages(applyChunk);
				}
				break;
			}

			case AgentMessageType.ThinkingUpdate: {
				const { text, sessionId: sid } = msg.payload as { text?: string; sessionId?: string };
				if (!text) return;
				const applyThink = (msgs: ChatBubbleProps[]) =>
					msgs.map((m, i) =>
						i === msgs.length - 1 && m.streaming ? { ...m, thinking: (m.thinking ?? "") + text } : m,
					);
				if (sid && sid !== activeId()) {
					const cached = sessionMsgCache.get(sid);
					if (cached) sessionMsgCache.set(sid, applyThink(cached));
				} else {
					setMessages(applyThink);
				}
				break;
			}

			case AgentMessageType.ChatDone: {
				const {
					content,
					thinking,
					sessionId: sid,
				} = msg.payload as {
					content?: string;
					thinking?: string;
					sessionId?: string;
				};
				const applyDone = (msgs: ChatBubbleProps[]) =>
					msgs.map((m, i) =>
						i === msgs.length - 1 && m.streaming
							? {
									...m,
									content: content ?? m.content,
									thinking: thinking ?? m.thinking,
									streaming: false,
								}
							: m,
					);
				if (sid && sid !== activeId()) {
					const cached = sessionMsgCache.get(sid);
					if (cached) sessionMsgCache.set(sid, applyDone(cached));
				} else {
					setMessages(applyDone);
				}
				break;
			}

			case AgentMessageType.ChatError: {
				const { message: errMsg, sessionId: sid } = msg.payload as { message?: string; sessionId?: string };
				const applyError = (msgs: ChatBubbleProps[]) =>
					msgs.map((m, i) =>
						i === msgs.length - 1 && m.streaming
							? {
									...m,
									content: m.content || `❌ Error: ${errMsg ?? "unknown"}`,
									streaming: false,
								}
							: m,
					);
				if (sid && sid !== activeId()) {
					const cached = sessionMsgCache.get(sid);
					if (cached) sessionMsgCache.set(sid, applyError(cached));
				} else {
					setMessages(applyError);
				}
				break;
			}
		}
	});

	// Init: request session list + agent config
	agent.send({ id: "init-list", type: AgentMessageType.SessionList, payload: {} });
	agent.send({ id: "init-config", type: AgentMessageType.AgentConfig, payload: {} });
}

// ════════════════════════════════════════════════════════════════
//  Module-level functions
// ════════════════════════════════════════════════════════════════

function selectModel(modelId: string) {
	if (!agent) return;
	setAgentConfig((prev) => ({ ...prev, model: modelId }));
	agent.send({
		id: `set-model-${modelId}`,
		type: AgentMessageType.AgentConfig,
		payload: { model: modelId },
	});
}

function selectThinkingLevel(level: string) {
	if (!agent) return;
	setAgentConfig((prev) => ({ ...prev, thinkingLevel: level }));
	agent.send({
		id: `set-thinking-${level}`,
		type: AgentMessageType.AgentConfig,
		payload: { thinkingLevel: level },
	});
}

function updatePluginConfig(pluginId: string, config: unknown) {
	if (!agent) return;
	agent.send({
		id: `plugin-config-${pluginId}-${Date.now()}`,
		type: AgentMessageType.PluginConfig,
		payload: { pluginId, config },
	});
}

function unloadPlugin(pluginId: string) {
	if (!agent) return;
	agent.send({
		id: `plugin-unload-${pluginId}-${Date.now()}`,
		type: AgentMessageType.PluginUnload,
		payload: { pluginId },
	});
}

// ════════════════════════════════════════════════════════════════
//  Module-level functions
// ════════════════════════════════════════════════════════════════

function refreshSessions() {
	if (!agent) return;
	queueMicrotask(() => {
		agent.send({
			id: `list-${Date.now()}`,
			type: AgentMessageType.SessionList,
			payload: {},
		});
	});
}

function createSession(name?: string) {
	pendingMessage = null;
	setActiveId(null);
	setActiveName(name ?? "");
	setMessages([]);
	setResetKey(`new-${Date.now()}`);
	setLoading(false);
	setStats(null);
}

async function handleSend(text: string): Promise<{ sessionId: string }> {
	if (!agent) throw new Error("Agent not ready");

	// Insert user bubble + agent placeholder into store messages
	const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

	setMessages((prev) => [
		...prev,
		{ id: `u-${Date.now()}`, role: "user" as const, content: text, timestamp: now },
		{
			id: `a-${Date.now() + 1}`,
			role: "agent" as const,
			content: "",
			thinking: "",
			streaming: true,
			timestamp: now,
		},
	]);

	// Auto-scroll handled by ChatPanel reacting to messages signal

	if (activeId()) {
		agent.send({
			id: `msg-${Date.now()}`,
			type: AgentMessageType.ChatSend,
			payload: { content: text, sessionId: activeId()! },
		});
		return { sessionId: activeId()! };
	}

	setLoading(true);
	pendingMessage = text;
	const id = `create-${Date.now()}`;
	const promise = track<{ sessionId: string; name: string; createdAt: number }>(id);
	agent.send({ id, type: AgentMessageType.SessionCreate, payload: {} });
	return promise;
}

async function switchSession(id: string): Promise<{ sessionId: string; name: string; messages: ChatBubbleProps[] }> {
	if (!agent) throw new Error("Agent not ready");

	if (id === activeId()) {
		return { sessionId: id, name: activeName(), messages: messages() };
	}

	// Save current session messages (preserve streaming progress)
	const curId = activeId();
	if (curId) sessionMsgCache.set(curId, messages());

	setLoading(true);
	setStats(null);
	const msgId = `switch-${Date.now()}`;
	const promise = track<{
		sessionId: string;
		name: string;
		messages: ChatBubbleProps[];
	}>(msgId);
	agent.send({
		id: msgId,
		type: AgentMessageType.SessionSwitch,
		payload: { sessionId: id },
	});
	return promise;
}

async function deleteSession(id: string): Promise<void> {
	if (!agent) throw new Error("Agent not ready");

	const msgId = `delete-${Date.now()}`;
	const promise = track<void>(msgId);
	agent.send({
		id: msgId,
		type: AgentMessageType.SessionDelete,
		payload: { sessionId: id },
	});
	return promise;
}

async function renameSession(id: string, name: string): Promise<{ sessionId: string; name: string }> {
	if (!agent) throw new Error("Agent not ready");

	const msgId = `rename-${Date.now()}`;
	const promise = track<{ sessionId: string; name: string }>(msgId);
	agent.send({
		id: msgId,
		type: AgentMessageType.SessionRename,
		payload: { sessionId: id, name },
	});
	return promise;
}

// ════════════════════════════════════════════════════════════════
//  Public hook — returns the singleton state
// ════════════════════════════════════════════════════════════════

const sessionItems = createMemo(() => sessions().map((s) => sessionToItem(s, activeId())));

export function useAgent() {
	return {
		sessions: sessionItems,
		activeId,
		activeName,
		messages,
		resetKey,
		loading,
		agentConfig,
		stats,
		createSession,
		selectModel,
		selectThinkingLevel,
		updatePluginConfig,
		unloadPlugin,
		switchSession,
		deleteSession,
		renameSession,
		handleSend,
	};
}
