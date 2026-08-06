/**
 * useAgent — Agent 会话管理 hook（模块单例）
 *
 * 管理：
 *   - 会话列表、活跃会话、消息历史
 *   - 与 Agent Host 的 IPC 通信（create / switch / delete / rename / send）
 *   - 延迟创建：点击"新建"仅清空 UI，首条消息时才真正创建会话
 *
 * 所有异步方法返回 Promise，可通过 await 等待操作完成。
 *
 * 任意组件 import { useAgent } 获取同一个实例，无需 props 传递。
 */

import {
	AgentMessageType,
	type AgentReadyPayload,
	isValidMessageType,
} from "@shared/agent-types";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

import type { SessionItemProps } from "@/pages/ChatPage/SessionList/SessionItem";
import type { ChatBubbleProps } from "@/pages/ChatPage/ChatPanel/ChatBubble";
import type { AgentConfig } from "@/pages/ChatPage/Composer/Composer";

import { getAgentIpc } from "./ipc";

// ── Types ──

export interface SessionInfoPayload {
	file: string;
	id: string;
	name: string;
	createdAt: number;
	lastMessage?: string;
	lastActiveAt: number;
}

// ── Promise 追踪 ──

class Deferred<T = void> {
	resolve!: (value: T) => void;
	reject!: (error: Error) => void;
	promise: Promise<T>;

	constructor() {
		this.promise = new Promise<T>((res, rej) => {
			this.resolve = res;
			this.reject = rej;
		});
	}
}

const pending = new Map<string, Deferred<unknown>>();

function track<T>(id: string): Promise<T> {
	const d = new Deferred<T>();
	pending.set(id, d as Deferred<unknown>);
	return d.promise;
}

function settle(id: string, value?: unknown) {
	const d = pending.get(id);
	if (d) {
		pending.delete(id);
		d.resolve(value);
	}
}

function fail(id: string, error: Error) {
	const d = pending.get(id);
	if (d) {
		pending.delete(id);
		d.reject(error);
	}
}

// ── Helpers ──

function fmtTime(ms: number): string {
	const d = new Date(ms);
	const now = new Date();
	if (d.toDateString() === now.toDateString()) {
		return d.toLocaleTimeString("zh-CN", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
	return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function sessionToItem(
	s: SessionInfoPayload,
	activeId: string | null,
): SessionItemProps {
	return {
		id: s.id,
		label: s.name,
		subtitle: s.lastMessage?.slice(0, 60) ?? undefined,
		time: fmtTime(s.lastActiveAt),
		status: s.id === activeId ? "active" : "idle",
	};
}

// ── 单例 ──

type AgentStore = ReturnType<typeof createAgentStore>;
let store: AgentStore | null = null;

export function useAgent(): AgentStore {
	if (!store) store = createAgentStore();
	return store;
}

// ── Store ──

function createAgentStore() {
	const [sessions, setSessions] = createSignal<SessionInfoPayload[]>([]);
	const [activeId, setActiveId] = createSignal<string | null>(null);
	const [activeName, setActiveName] = createSignal<string>("");
	const [messages, setMessages] = createSignal<ChatBubbleProps[]>([]);
	const [resetKey, setResetKey] = createSignal("");
	const [loading, setLoading] = createSignal(false);
	const [agentConfig, setAgentConfig] = createSignal<AgentConfig>({});
	let pendingMessage: string | null = null;

	const agent = getAgentIpc();

	onMount(() => {
		if (!agent) return;

		const unsub = agent.onMessage((raw) => {
			const msg = raw as {
				id: string;
				type: string;
				payload: Record<string, unknown>;
			};
			if (!msg?.type || !isValidMessageType(msg.type)) return;

			switch (msg.type) {
				case AgentMessageType.AgentReady: {
					const p = msg.payload as AgentReadyPayload;
					setAgentConfig({
						model: p.model,
						thinkingLevel: p.thinkingLevel,
						availableModels: p.availableModels,
						status: "idle",
					});
					break;
				}

				case AgentMessageType.AgentConfig: {
					const p = msg.payload as AgentConfig;
					setAgentConfig((prev) => ({ ...prev, ...p }));
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
					};
					setActiveId(p.sessionId);
					setActiveName(p.name);
					setMessages(p.messages ?? []);
					setResetKey(p.sessionId + "-" + Date.now());
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

					// 直接插入本地列表，不等 listAll（SDK 延迟写盘）
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
							id: "msg-" + Date.now(),
							type: AgentMessageType.ChatSend,
							payload: { content: text, sessionId: p.sessionId },
						});
					}
					// refreshSessions();
					settle(msg.id, p);
					break;
				}

				case AgentMessageType.SessionListResult: {
					const p = msg.payload as { sessions: SessionInfoPayload[] };
					console.log("session-lenght: ", p.sessions.length);
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

				case AgentMessageType.SessionError: {
					console.error("[useAgent] Session error:", msg.payload);
					setLoading(false);
					const message =
						(msg.payload as { message?: string }).message ?? "Unknown error";
					fail(msg.id, new Error(message));
					break;
				}
			}
		});

		agent.send({
			id: "init-list",
			type: AgentMessageType.SessionList,
			payload: {},
		});

		// 主动拉取当前 agent 配置（防止 AgentReady 已先于 listener 触发）
		agent.send({
			id: "init-config",
			type: AgentMessageType.AgentConfig,
			payload: {},
		});

		onCleanup(unsub);
	});

	function refreshSessions() {
		if (!agent) return;
		queueMicrotask(() => {
			agent.send({
				id: "list-" + Date.now(),
				type: AgentMessageType.SessionList,
				payload: {},
			});
		});
	}

	// ── 公开方法 ──

	/**
	 * 仅在本地清空 UI，不发送任何 IPC。
	 * 真正的 session 创建延迟到首条消息发送时。
	 */
	function createSession(name?: string) {
		pendingMessage = null;
		setActiveId(null);
		setActiveName(name ?? "");
		setMessages([]);
		setResetKey("new-" + Date.now());
		setLoading(false);
	}

	/**
	 * 发送消息。
	 *   - 已有活跃会话：立即发送，Promise 同步 resolve。
	 *   - 无活跃会话：先创建会话，等 session:created 后自动发送。
	 *
	 * @returns Promise<{ sessionId: string }>
	 */
	async function handleSend(text: string): Promise<{ sessionId: string }> {
		if (!agent) throw new Error("Agent not ready");

		if (activeId()) {
			agent.send({
				id: "msg-" + Date.now(),
				type: AgentMessageType.ChatSend,
				payload: { content: text, sessionId: activeId()! },
			});
			return { sessionId: activeId()! };
		}

		setLoading(true);
		pendingMessage = text;
		const id = "create-" + Date.now();
		const promise = track<{
			sessionId: string;
			name: string;
			createdAt: number;
		}>(id);
		agent.send({ id, type: AgentMessageType.SessionCreate, payload: {} });
		return promise;
	}

	/**
	 * 切换到指定会话。
	 * Promise resolve 于 session:switched 事件到达时。
	 */
	async function switchSession(
		id: string,
	): Promise<{ sessionId: string; name: string; messages: ChatBubbleProps[] }> {
		if (!agent) throw new Error("Agent not ready");

		if (id === activeId()) {
			return {
				sessionId: id,
				name: activeName(),
				messages: messages(),
			};
		}

		setLoading(true);
		const msgId = "switch-" + Date.now();
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

	/**
	 * 删除指定会话。
	 * Promise resolve 于 session:deleted 事件到达时。
	 */
	async function deleteSession(id: string): Promise<void> {
		if (!agent) throw new Error("Agent not ready");

		const msgId = "delete-" + Date.now();
		const promise = track<void>(msgId);
		agent.send({
			id: msgId,
			type: AgentMessageType.SessionDelete,
			payload: { sessionId: id },
		});
		return promise;
	}

	/**
	 * 重命名指定会话。
	 * Promise resolve 于 session:renamed 事件到达时。
	 */
	async function renameSession(
		id: string,
		name: string,
	): Promise<{ sessionId: string; name: string }> {
		if (!agent) throw new Error("Agent not ready");

		const msgId = "rename-" + Date.now();
		const promise = track<{ sessionId: string; name: string }>(msgId);
		agent.send({
			id: msgId,
			type: AgentMessageType.SessionRename,
			payload: { sessionId: id, name },
		});
		return promise;
	}

	const sessionItems = createMemo(() =>
		sessions().map((s) => sessionToItem(s, activeId())),
	);

	return {
		sessions: sessionItems,
		activeId,
		activeName,
		messages,
		resetKey,
		loading,
		createSession,
		switchSession,
		deleteSession,
		renameSession,
		agentConfig,
		handleSend,
	};
}
