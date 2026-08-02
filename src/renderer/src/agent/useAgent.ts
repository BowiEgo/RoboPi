/**
 * useAgent — Agent 会话管理 hook（模块单例）
 *
 * 管理：
 *   - 会话列表、活跃会话、消息历史
 *   - 与 Agent Host 的 IPC 通信（create / switch / delete / rename / send）
 *   - 延迟创建：点击"新建"仅清空 UI，首条消息时才真正创建会话
 *
 * 任意组件 import { useAgent } 获取同一个实例，无需 props 传递。
 */

import { createMemo, createSignal, onCleanup, onMount } from "solid-js";

import type { SessionItemProps } from "@/pages/ChatPage/ChatItem/SessionItem";
import type { ChatBubbleProps } from "@/pages/ChatPage/ChatPanel/ChatBubble";

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

// ── Helpers ──

function fmtTime(ms: number): string {
	const d = new Date(ms);
	const now = new Date();
	if (d.toDateString() === now.toDateString()) {
		return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
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
		subtitle: s.lastMessage?.slice(0, 40) ?? undefined,
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
	let pendingMessage: string | null = null;

	const agent = getAgentIpc();

	onMount(() => {
		if (!agent) return;

		const unsub = agent.onMessage((raw) => {
			const msg = raw as { type: string; payload: Record<string, unknown> };
			if (!msg?.type) return;

			switch (msg.type) {
				case "session:switched": {
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
					break;
				}

				case "session:created": {
					const p = msg.payload as {
						sessionId: string;
						name: string;
						createdAt: number;
					};
					setActiveId(p.sessionId);
					setActiveName(p.name);
					setLoading(false);
					if (pendingMessage) {
						const text = pendingMessage;
						pendingMessage = null;
						agent.send({
							id: "msg-" + Date.now(),
							type: "chat:send",
							payload: { content: text, sessionId: p.sessionId },
						});
					}
					refreshSessions();
					break;
				}

				case "session:list_result": {
					const p = msg.payload as { sessions: SessionInfoPayload[] };
					if (p.sessions?.length) setSessions(p.sessions);
					break;
				}

				case "session:deleted": {
					refreshSessions();
					break;
				}

				case "session:renamed": {
					const p = msg.payload as { sessionId: string; name: string };
					if (activeId() === p.sessionId) setActiveName(p.name);
					refreshSessions();
					break;
				}

				case "session:error": {
					console.error("[useAgent] Session error:", msg.payload);
					setLoading(false);
					break;
				}
			}
		});

		agent.send({ id: "init-list", type: "session:list", payload: {} });
		onCleanup(unsub);
	});

	function refreshSessions() {
		if (!agent) return;
		queueMicrotask(() => {
			agent.send({
				id: "list-" + Date.now(),
				type: "session:list",
				payload: {},
			});
		});
	}

	function createSession(name?: string) {
		pendingMessage = null;
		setActiveId(null);
		setActiveName(name ?? "");
		setMessages([]);
		setResetKey("new-" + Date.now());
		setLoading(false);
	}

	function handleSend(text: string) {
		if (!agent) return;

		if (activeId()) {
			agent.send({
				id: "msg-" + Date.now(),
				type: "chat:send",
				payload: { content: text, sessionId: activeId()! },
			});
		} else {
			setLoading(true);
			pendingMessage = text;
			agent.send({
				id: "create-" + Date.now(),
				type: "session:create",
				payload: {},
			});
		}
	}

	function switchSession(id: string) {
		if (!agent || id === activeId()) return;
		setLoading(true);
		agent.send({
			id: "switch-" + Date.now(),
			type: "session:switch",
			payload: { sessionId: id },
		});
	}

	function deleteSession(id: string) {
		if (!agent) return;
		agent.send({
			id: "delete-" + Date.now(),
			type: "session:delete",
			payload: { sessionId: id },
		});
	}

	function renameSession(id: string, name: string) {
		if (!agent) return;
		agent.send({
			id: "rename-" + Date.now(),
			type: "session:rename",
			payload: { sessionId: id, name },
		});
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
		handleSend,
	};
}
