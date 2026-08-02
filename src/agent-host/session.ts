/**
 * Session 管理模块
 *   - 会话的创建 / 列表 / 切换 / 删除 / 重命名 / 历史
 *   - Pi SDK SessionManager 持久化
 *   - SDK 事件订阅 → IPC 转发
 */

import {
	type AgentSession,
	createAgentSession,
	type ModelRuntime,
	SessionManager,
	SettingsManager,
} from "@earendil-works/pi-coding-agent";

import type {
	AgentMessage,
	SessionInfoPayload,
	SessionMessagePayload,
} from "../shared/agent-types";

// ── 模块状态 ──

export let session: AgentSession | null = null;
export let currentSessionManager: ReturnType<
	typeof SessionManager.open
> | null = null;
export let currentSessionId: string | null = null;
export let currentSessionName: string | null = null;

let sessionsDir: string | null = null;
let unsubscribe: (() => void) | null = null;
let needsTitleGen = false;
let generatingTitle = false;
let leafBeforeTitleGen: string | null = null;

// 由 index.ts 注入
let modelRuntime: Awaited<ReturnType<typeof ModelRuntime.create>> | null = null;
let sendFn: ((msg: AgentMessage) => void) | null = null;
let agentModelRef: { value: string | undefined } | null = null;
let thinkingLevelRef: { value: string | undefined } | null = null;

function send(msg: AgentMessage): void {
	sendFn?.(msg);
}

function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── 目录 ──

async function getSessionsDir(): Promise<string> {
	if (sessionsDir) return sessionsDir;
	const path = await import("node:path");
	const os = await import("node:os");
	const fs = await import("node:fs/promises");
	const dir = path.join(os.homedir(), ".pi", "agent", "sessions");
	await fs.mkdir(dir, { recursive: true });
	sessionsDir = dir;
	return dir;
}

// ── 列出会话 ──

export async function listSessions(): Promise<SessionInfoPayload[]> {
	await getSessionsDir();
	const sessions = await SessionManager.listAll(sessionsDir!);
	return sessions.map((s) => ({
		file: s.path,
		id: s.id,
		name: s.name ?? "Untitled",
		createdAt: s.created.getTime(),
		lastMessage: s.firstMessage?.slice(0, 80),
		lastActiveAt: s.modified.getTime(),
	}));
}

// ── 加载消息 ──

export function loadMessagesFromSession(
	sm: ReturnType<typeof SessionManager.open>,
): SessionMessagePayload[] {
	const entries = sm.getBranch();
	const messages: SessionMessagePayload[] = [];

	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const msg = (
			entry as {
				message: { role: string; content: unknown; timestamp: number };
			}
		).message;
		const role = msg.role;

		if (role === "user") {
			let content = "";
			const c = msg.content;
			if (typeof c === "string") content = c;
			else if (Array.isArray(c)) {
				content = (c as Array<{ type: string; text?: string }>)
					.filter((b) => b.type === "text")
					.map((b) => b.text ?? "")
					.join("");
			}
			messages.push({
				id: (entry as { id: string }).id,
				role: "user",
				content,
				timestamp: new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			});
		} else if (role === "assistant") {
			let content = "";
			let thinking = "";
			const c = msg.content;
			if (Array.isArray(c)) {
				for (const block of c as Array<{
					type: string;
					text?: string;
					thinking?: string;
				}>) {
					if (block.type === "text") content += block.text ?? "";
					if (block.type === "thinking") thinking += block.thinking ?? "";
				}
			}
			messages.push({
				id: (entry as { id: string }).id,
				role: "agent",
				content,
				thinking: thinking || undefined,
				timestamp: new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
					hour: "2-digit",
					minute: "2-digit",
				}),
			});
		}
	}

	return messages;
}

// ── AgentSession 工厂 ──

async function createAgentSessionFor(
	sm: ReturnType<typeof SessionManager.open>,
): Promise<AgentSession> {
	if (!modelRuntime) throw new Error("ModelRuntime not initialized");

	const level =
		(process.env.PI_THINKING_LEVEL as
			| "off"
			| "minimal"
			| "low"
			| "medium"
			| "high"
			| "xhigh"
			| "max") ?? "medium";

	const result = await createAgentSession({
		modelRuntime,
		sessionManager: sm,
		settingsManager: SettingsManager.inMemory({
			compaction: { enabled: false },
			retry: { enabled: false },
		}),
		tools: ["read", "bash", "edit", "write"],
		thinkingLevel: level,
	});

	if (agentModelRef) agentModelRef.value = result.session.model?.id;
	if (thinkingLevelRef)
		thinkingLevelRef.value = process.env.PI_THINKING_LEVEL ?? "medium";

	return result.session;
}

// ── 事件订阅 ──

function subscribeToSession(s: AgentSession): void {
	unsubscribe = s.subscribe((event) => {
		switch (event.type) {
			case "message_update": {
				if (generatingTitle) return; // 标题生成不推流
				const { assistantMessageEvent } = event;
				if (assistantMessageEvent.type === "text_delta") {
					send({
						id: uid(),
						type: "chat:chunk",
						payload: {
							sessionId: currentSessionId ?? "",
							delta: assistantMessageEvent.delta,
							kind: "content",
						},
					});
				}
				if (assistantMessageEvent.type === "thinking_delta") {
					send({
						id: uid(),
						type: "thinking:update",
						payload: {
							sessionId: currentSessionId ?? "",
							text: assistantMessageEvent.delta,
						},
					});
				}
				break;
			}
			case "tool_execution_start":
				console.log(`[AgentHost] Tool: ${event.toolName}`);
				break;
			case "tool_execution_end":
				console.log(
					`[AgentHost] Tool result: ${event.isError ? "error" : "ok"}`,
				);
				break;
			case "agent_end": {
				const newMessages = event.messages;
				const lastAssistant = [...newMessages]
					.reverse()
					.find((m) => m.role === "assistant");
				let content = "";
				let thinking = "";
				if (lastAssistant) {
					for (const block of lastAssistant.content) {
						if (block.type === "text") content += block.text;
						else if (block.type === "thinking") thinking += block.thinking;
					}
				}

				// 标题生成模式：提取标题，不发 chat:done
				if (generatingTitle) {
					generatingTitle = false;
					const title = content.trim().replace(/^"|"$/g, "").slice(0, 50);
					if (title && currentSessionManager) {
						// 回退到标题生成前的叶子节点，移除标题生成对话
						currentSessionManager.branch(leafBeforeTitleGen!);
						leafBeforeTitleGen = null;
						currentSessionManager.appendSessionInfo(title);
						currentSessionName = title;
						send({
							id: uid(),
							type: "session:renamed",
							payload: { sessionId: currentSessionId ?? "", name: title },
						});
						console.log(`[AgentHost] Auto-titled session: "${title}"`);
					}
					return;
				}

				// 正常流程：发送 chat:done
				send({
					id: uid(),
					type: "chat:done",
					payload: {
						sessionId: currentSessionId ?? "",
						content,
						thinking: thinking || undefined,
						usage: lastAssistant?.usage
							? {
									promptTokens: lastAssistant.usage.input,
									completionTokens: lastAssistant.usage.output,
								}
							: undefined,
					},
				});

				// 新会话首次回复 → 触发标题生成
				if (needsTitleGen && session) {
					needsTitleGen = false;
					// 取最后一条 user 消息作为上下文
					const lastUser = [...newMessages]
						.reverse()
						.find((m) => m.role === "user");
					let userText = "";
					if (lastUser) {
						const uc = lastUser.content;
						if (typeof uc === "string") userText = uc;
						else if (Array.isArray(uc)) {
							userText = (uc as Array<{ text?: string }>)
								.filter((b) => "text" in b)
								.map((b) => b.text ?? "")
								.join(" ");
						}
					}
					const prompt = userText
						? `Generate a short title (5 words or fewer) for a conversation that starts with: "${userText.slice(0, 200)}". Reply with ONLY the title, no quotes, no explanation.`
						: "Generate a short title for this conversation. Reply with ONLY the title.";

					generatingTitle = true;
					leafBeforeTitleGen = currentSessionManager?.getLeafId() ?? null;
					session.followUp(prompt).catch((err) => {
						generatingTitle = false;
						console.error("[AgentHost] Title generation failed:", err);
					});
				}

				break;
			}
		}
	});
}

// ── 关闭 ──

async function closeCurrentSession(): Promise<void> {
	unsubscribe?.();
	unsubscribe = null;
	if (session) {
		try {
			session.dispose();
		} catch (err) {
			console.error("[AgentHost] Error disposing session:", err);
		}
		session = null;
	}
	currentSessionManager = null;
	currentSessionId = null;
	currentSessionName = null;
}

export async function closeAllSessions(): Promise<void> {
	await closeCurrentSession();
}

// ── 创建默认会话 ──

async function createDefaultSession(): Promise<void> {
	try {
		const cwd = process.cwd();
		const dir = await getSessionsDir();
		const sm = SessionManager.create(cwd, dir);
		currentSessionManager = sm;
		currentSessionId = sm.getSessionId();
		currentSessionName = "Untitled";
		session = await createAgentSessionFor(sm);
		subscribeToSession(session);
	} catch (err) {
		console.error(
			"[AgentHost] Failed to create default session, falling back to in-memory:",
			err,
		);
		const sm = SessionManager.inMemory(process.cwd());
		currentSessionManager = sm;
		currentSessionId = sm.getSessionId();
		currentSessionName = "Untitled";
		session = await createAgentSessionFor(sm);
		subscribeToSession(session);
	}
}

// ── Handlers ──

export async function handleCreateSession(
	msgId: string,
	payload: { name?: string },
): Promise<void> {
	try {
		await closeCurrentSession();
		const cwd = process.cwd();
		const dir = await getSessionsDir();
		const sm = SessionManager.create(cwd, dir);

		const name = payload.name?.trim() || "Untitled";
		sm.appendSessionInfo(name);

		session = await createAgentSessionFor(sm);
		currentSessionManager = sm;
		currentSessionId = sm.getSessionId();
		currentSessionName = name ?? "Untitled";
		needsTitleGen = true;
		subscribeToSession(session);

		send({
			id: msgId,
			type: "session:created",
			payload: {
				sessionId: currentSessionId,
				name: currentSessionName,
				createdAt: Date.now(),
				file: sm.getSessionFile() ?? "",
			},
		});
		console.log(
			`[AgentHost] Session created: ${currentSessionId} (${currentSessionName})`,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[AgentHost] Session create error:", message);
		send({
			id: msgId,
			type: "session:error",
			payload: { code: "CREATE_ERROR", message },
		});
	}
}

export async function handleListSessions(msgId: string): Promise<void> {
	try {
		const sessions = await listSessions();
		send({ id: msgId, type: "session:list_result", payload: { sessions } });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		send({
			id: msgId,
			type: "session:error",
			payload: { code: "LIST_ERROR", message },
		});
	}
}

export async function handleSwitchSession(
	msgId: string,
	payload: { sessionId: string },
): Promise<void> {
	try {
		if (currentSessionId === payload.sessionId && session) {
			const messages = currentSessionManager
				? loadMessagesFromSession(currentSessionManager)
				: [];
			send({
				id: msgId,
				type: "session:switched",
				payload: {
					sessionId: currentSessionId,
					name: currentSessionName ?? "Untitled",
					messages,
				},
			});
			return;
		}

		const all = await SessionManager.listAll(sessionsDir!);
		const target = all.find((s) => s.id === payload.sessionId);
		if (!target) {
			send({
				id: msgId,
				type: "session:error",
				payload: {
					code: "NOT_FOUND",
					message: `Session ${payload.sessionId} not found`,
				},
			});
			return;
		}

		await closeCurrentSession();

		const sm = SessionManager.open(target.path);
		const sessionEntry = sm
			.getEntries()
			.find((e) => (e as { type: string }).type === "session_info") as
			| { name?: string }
			| undefined;

		currentSessionManager = sm;
		currentSessionId = sm.getSessionId();
		currentSessionName = sessionEntry?.name ?? "Untitled";
		session = await createAgentSessionFor(sm);
		subscribeToSession(session);

		const messages = loadMessagesFromSession(sm);
		send({
			id: msgId,
			type: "session:switched",
			payload: {
				sessionId: currentSessionId,
				name: currentSessionName,
				messages,
			},
		});
		console.log(
			`[AgentHost] Session switched: ${currentSessionId} (${currentSessionName})`,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[AgentHost] Session switch error:", message);
		send({
			id: msgId,
			type: "session:error",
			payload: { code: "SWITCH_ERROR", message },
		});
	}
}

export async function handleDeleteSession(
	msgId: string,
	payload: { sessionId: string },
): Promise<void> {
	try {
		const fs = await import("node:fs/promises");
		const isActive = currentSessionId === payload.sessionId;
		if (isActive) await closeCurrentSession();

		const all = await SessionManager.listAll(sessionsDir!);
		const target = all.find((s) => s.id === payload.sessionId);
		if (!target) {
			if (isActive) await createDefaultSession();
			send({
				id: msgId,
				type: "session:error",
				payload: {
					code: "NOT_FOUND",
					message: `Session ${payload.sessionId} not found`,
				},
			});
			return;
		}

		await fs.unlink(target.path);
		send({
			id: msgId,
			type: "session:deleted",
			payload: { sessionId: payload.sessionId },
		});
		console.log(`[AgentHost] Session deleted: ${payload.sessionId}`);

		if (isActive) {
			await createDefaultSession();
			const messages = currentSessionManager
				? loadMessagesFromSession(currentSessionManager)
				: [];
			send({
				id: uid(),
				type: "session:created",
				payload: {
					sessionId: currentSessionId ?? "",
					name: currentSessionName ?? "Untitled",
					createdAt: Date.now(),
				},
			});
			send({
				id: uid(),
				type: "session:switched",
				payload: {
					sessionId: currentSessionId ?? "",
					name: currentSessionName ?? "Untitled",
					messages,
				},
			});
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		send({
			id: msgId,
			type: "session:error",
			payload: { code: "DELETE_ERROR", message },
		});
	}
}

export async function handleRenameSession(
	msgId: string,
	payload: { sessionId: string; name: string },
): Promise<void> {
	try {
		const trimmedName = payload.name.trim();
		if (!trimmedName) {
			send({
				id: msgId,
				type: "session:error",
				payload: { code: "INVALID_NAME", message: "Name cannot be empty" },
			});
			return;
		}

		const all = await SessionManager.listAll(sessionsDir!);
		const target = all.find((s) => s.id === payload.sessionId);
		if (!target) {
			send({
				id: msgId,
				type: "session:error",
				payload: {
					code: "NOT_FOUND",
					message: `Session ${payload.sessionId} not found`,
				},
			});
			return;
		}

		const sm = SessionManager.open(target.path);
		sm.appendSessionInfo(trimmedName);
		if (currentSessionId === payload.sessionId)
			currentSessionName = trimmedName;

		send({
			id: msgId,
			type: "session:renamed",
			payload: { sessionId: payload.sessionId, name: trimmedName },
		});
		console.log(
			`[AgentHost] Session renamed: ${payload.sessionId} → "${trimmedName}"`,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		send({
			id: msgId,
			type: "session:error",
			payload: { code: "RENAME_ERROR", message },
		});
	}
}

export async function handleSessionHistory(
	msgId: string,
	payload: { sessionId: string },
): Promise<void> {
	try {
		if (currentSessionId === payload.sessionId && currentSessionManager) {
			const messages = loadMessagesFromSession(currentSessionManager);
			send({
				id: msgId,
				type: "session:history_result",
				payload: { sessionId: payload.sessionId, messages },
			});
			return;
		}

		const all = await SessionManager.listAll(sessionsDir!);
		const target = all.find((s) => s.id === payload.sessionId);
		if (!target) {
			send({
				id: msgId,
				type: "session:error",
				payload: {
					code: "NOT_FOUND",
					message: `Session ${payload.sessionId} not found`,
				},
			});
			return;
		}

		const sm = SessionManager.open(target.path);
		const messages = loadMessagesFromSession(sm);
		send({
			id: msgId,
			type: "session:history_result",
			payload: { sessionId: payload.sessionId, messages },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		send({
			id: msgId,
			type: "session:error",
			payload: { code: "HISTORY_ERROR", message },
		});
	}
}

// ── 初始化 ──

export interface SessionInitOptions {
	modelRuntime: Awaited<ReturnType<typeof ModelRuntime.create>>;
	sendFn: (msg: AgentMessage) => void;
	agentModelRef: { value: string | undefined };
	thinkingLevelRef: { value: string | undefined };
}

export async function initSession(opts: SessionInitOptions): Promise<void> {
	modelRuntime = opts.modelRuntime;
	sendFn = opts.sendFn;
	agentModelRef = opts.agentModelRef;
	thinkingLevelRef = opts.thinkingLevelRef;

	await getSessionsDir();

	try {
		const recent = await SessionManager.listAll(sessionsDir!);
		const mostRecent = recent[0];

		if (mostRecent) {
			const sm = SessionManager.open(mostRecent.path);
			currentSessionManager = sm;
			currentSessionId = sm.getSessionId();
			currentSessionName = mostRecent.name ?? "Untitled";
			session = await createAgentSessionFor(sm);
			subscribeToSession(session);
			console.log(
				`[AgentHost] Restored session: ${currentSessionId} (${currentSessionName})`,
			);
		} else {
			const sm = SessionManager.create(process.cwd(), sessionsDir!);
			currentSessionManager = sm;
			currentSessionId = sm.getSessionId();
			currentSessionName = "Untitled";
			session = await createAgentSessionFor(sm);
			subscribeToSession(session);
			console.log(`[AgentHost] Created default session: ${currentSessionId}`);
		}
	} catch (err) {
		console.error("[AgentHost] Session init error:", err);
		if (!session) {
			const sm = SessionManager.inMemory(process.cwd());
			currentSessionManager = sm;
			currentSessionId = sm.getSessionId();
			currentSessionName = "Untitled";
			session = await createAgentSessionFor(sm);
			subscribeToSession(session);
		}
	}

	console.log(
		`[AgentHost] Pi Agent session ready (model: ${session?.model?.id ?? "auto"})`,
	);
}

export function getInitialMessages(): SessionMessagePayload[] {
	return currentSessionManager
		? loadMessagesFromSession(currentSessionManager)
		: [];
}
