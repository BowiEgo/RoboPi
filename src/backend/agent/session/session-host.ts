/**
 * Session management — SessionHost class.
 *
 * Orchestrates Pi SDK sessions: create / list / switch / delete / rename /
 * history, plus SDK event subscription → IPC forwarding.
 *
 * Pure helpers live in ./message-loader.ts, IPC in ./ipc.ts, and automatic
 * title generation in ./title-generator.ts.
 */

import {
	type AgentSession,
	type AgentSessionEvent,
	createAgentSession,
	type ModelRuntime,
	SessionManager,
	type SettingsManager,
} from "@earendil-works/pi-coding-agent";

import { AgentMessageType, type SessionInfoPayload, type SessionMessagePayload } from "../../../shared/agent-types.ts";
import { getSessionsDir } from "../config.ts";
import { DEFAULT_SESSION_NAME, ErrorCode, type ThinkingLevel } from "../constants.ts";
import { postMessageToHost, uid } from "../ipc.ts";
import { extractLastUserText, loadMessagesFromSession } from "./message-loader.ts";
import { TitleGenerator } from "./title-generator.ts";

// ============================================================================
// SessionHost
// ============================================================================

export interface SessionHostOptions {
	modelRuntime: Awaited<ReturnType<typeof ModelRuntime.create>>;
	agentModelRef: { value: string | undefined };
	thinkingLevelRef: { value: string | undefined };
	settingsManager: SettingsManager;
}

export class SessionHost {
	// ---- Public read-only state ----
	session: AgentSession | null = null;
	currentSessionManager: ReturnType<typeof SessionManager.open> | null = null;
	currentSessionId: string | null = null;
	currentSessionName: string | null = null;
	settingsManager: SettingsManager | null = null;

	// ---- Constructor-injected dependencies ----
	private modelRuntime: Awaited<ReturnType<typeof ModelRuntime.create>> | null = null;
	private agentModelRef: { value: string | undefined };
	private thinkingLevelRef: { value: string | undefined };
	private titleGenerator: TitleGenerator;

	// ---- Internal state ----
	private sessionsDir: string | null = null;
	private unsubscribe: (() => void) | null = null;

	// Background sessions — kept alive across switches so generation continues
	private backgroundSessions = new Map<
		string,
		{
			session: AgentSession;
			manager: ReturnType<typeof SessionManager.open>;
			name: string;
			unsubscribe: () => void;
		}
	>();

	constructor(opts: SessionHostOptions) {
		this.modelRuntime = opts.modelRuntime;
		this.agentModelRef = opts.agentModelRef;
		this.thinkingLevelRef = opts.thinkingLevelRef;
		this.settingsManager = opts.settingsManager;
		this.titleGenerator = new TitleGenerator({
			getSession: () => this.session,
			getManager: () => this.currentSessionManager,
			getSessionId: () => this.currentSessionId,
			onTitle: (title) => {
				this.currentSessionName = title;
			},
		});
	}

	// ---- Init / Dispose ----

	async init(): Promise<void> {
		const dir = await this.getSessionsDir();

		try {
			const recent = await SessionManager.listAll(dir);
			const mostRecent = recent[0];

			if (mostRecent) {
				const sm = SessionManager.open(mostRecent.path);
				this.currentSessionManager = sm;
				this.currentSessionId = sm.getSessionId();
				this.currentSessionName = mostRecent.name ?? DEFAULT_SESSION_NAME;
				this.session = await this.createAgentSessionFor(sm);
				this.subscribeToSession(this.session, this.currentSessionId ?? "");
				console.log(`[AgentHost] Restored session: ${this.currentSessionId} (${this.currentSessionName})`);
			} else {
				const sm = SessionManager.create(process.cwd(), dir);
				this.currentSessionManager = sm;
				this.currentSessionId = sm.getSessionId();
				this.currentSessionName = DEFAULT_SESSION_NAME;
				this.session = await this.createAgentSessionFor(sm);
				this.subscribeToSession(this.session, this.currentSessionId ?? "");
				console.log(`[AgentHost] Created default session: ${this.currentSessionId}`);
			}
		} catch (err) {
			console.error("[AgentHost] Session init error:", err);
			if (!this.session) {
				const sm = SessionManager.inMemory(process.cwd());
				this.currentSessionManager = sm;
				this.currentSessionId = sm.getSessionId();
				this.currentSessionName = DEFAULT_SESSION_NAME;
				this.session = await this.createAgentSessionFor(sm);
				this.subscribeToSession(this.session, this.currentSessionId ?? "");
			}
		}

		console.log(`[AgentHost] Pi Agent session ready (model: ${this.session?.model?.id ?? "auto"})`);
	}

	async dispose(): Promise<void> {
		await this.closeCurrentSession();
	}

	// ---- Public queries ----

	getInitialMessages(): SessionMessagePayload[] {
		return this.currentSessionManager ? loadMessagesFromSession(this.currentSessionManager) : [];
	}

	getCurrentModel(): string | undefined {
		return this.session?.model?.id;
	}

	async setModel(modelId: string): Promise<void> {
		if (!this.session || !this.modelRuntime) return;
		const model = this.modelRuntime.getModel(modelId.split("/")[0], modelId.slice(modelId.indexOf("/") + 1));
		if (!model) return;
		await this.session.setModel(model);
		if (this.agentModelRef) this.agentModelRef.value = model.id;
	}

	// ---- IPC Handlers ----

	async createSession(msgId: string, payload: { name?: string }): Promise<void> {
		try {
			await this.closeCurrentSession();
			const dir = await this.getSessionsDir();
			const sm = SessionManager.create(process.cwd(), dir);

			const name = payload.name?.trim() || DEFAULT_SESSION_NAME;
			sm.appendSessionInfo(name);

			this.session = await this.createAgentSessionFor(sm);
			this.currentSessionManager = sm;
			this.currentSessionId = sm.getSessionId();
			this.currentSessionName = name;
			this.titleGenerator.arm();
			this.subscribeToSession(this.session, this.currentSessionId ?? "");

			postMessageToHost({
				id: msgId,
				type: AgentMessageType.SessionCreated,
				payload: {
					sessionId: this.currentSessionId,
					name: this.currentSessionName,
					createdAt: Date.now(),
					file: sm.getSessionFile() ?? "",
				},
			});
			console.log(`[AgentHost] Session created: ${this.currentSessionId} (${this.currentSessionName})`);
		} catch (err) {
			this.respondCrudError(msgId, ErrorCode.CREATE_ERROR, err);
		}
	}

	async listSessions(msgId: string): Promise<void> {
		try {
			const sessions = await this.listAllSessions();
			postMessageToHost({
				id: msgId,
				type: AgentMessageType.SessionListResult,
				payload: { sessions },
			});
		} catch (err) {
			this.respondCrudError(msgId, ErrorCode.LIST_ERROR, err);
		}
	}

	async switchSession(msgId: string, payload: { sessionId: string }): Promise<void> {
		try {
			const targetId = payload.sessionId;

			if (this.currentSessionId === targetId && this.session) {
				const messages = this.currentSessionManager ? loadMessagesFromSession(this.currentSessionManager) : [];
				this.respondSwitched(msgId, targetId, this.currentSessionName ?? DEFAULT_SESSION_NAME, messages);
				return;
			}

			// Move current session to background (keep generation alive)
			this.moveToBackground();

			// Bring background session to foreground
			const bg = this.backgroundSessions.get(targetId);
			if (bg) {
				this.session = bg.session;
				this.currentSessionManager = bg.manager;
				this.currentSessionId = targetId;
				this.currentSessionName = bg.name;
				this.unsubscribe = bg.unsubscribe;
				this.backgroundSessions.delete(targetId);

				this.respondSwitched(msgId, targetId, bg.name, loadMessagesFromSession(bg.manager));
				console.log(`[AgentHost] Brought to foreground: ${targetId} (${bg.name})`);
				return;
			}

			// Load from disk
			const dir = await this.getSessionsDir();
			const all = await SessionManager.listAll(dir);
			const target = all.find((s) => s.id === targetId);
			if (!target) {
				postMessageToHost({
					id: msgId,
					type: AgentMessageType.SessionError,
					payload: { code: ErrorCode.NOT_FOUND, message: `Session ${targetId} not found` },
				});
				return;
			}

			const sm = SessionManager.open(target.path);
			const sessionEntry = sm.getEntries().find((e) => (e as { type: string }).type === "session_info") as
				| { name?: string }
				| undefined;

			this.currentSessionManager = sm;
			this.currentSessionId = sm.getSessionId();
			this.currentSessionName = sessionEntry?.name ?? DEFAULT_SESSION_NAME;
			this.session = await this.createAgentSessionFor(sm);
			this.subscribeToSession(this.session, this.currentSessionId);

			this.respondSwitched(msgId, this.currentSessionId, this.currentSessionName, loadMessagesFromSession(sm));
			console.log(`[AgentHost] Session switched: ${this.currentSessionId} (${this.currentSessionName})`);
		} catch (err) {
			this.respondCrudError(msgId, ErrorCode.SWITCH_ERROR, err);
		}
	}

	async deleteSession(msgId: string, payload: { sessionId: string }): Promise<void> {
		try {
			const fs = await import("node:fs/promises");
			const isActive = this.currentSessionId === payload.sessionId;
			if (isActive) await this.closeCurrentSession();

			const dir = await this.getSessionsDir();
			const all = await SessionManager.listAll(dir);
			const target = all.find((s) => s.id === payload.sessionId);
			if (!target) {
				if (isActive) await this.createDefaultSession();
				postMessageToHost({
					id: msgId,
					type: AgentMessageType.SessionError,
					payload: { code: ErrorCode.NOT_FOUND, message: `Session ${payload.sessionId} not found` },
				});
				return;
			}

			await fs.unlink(target.path);
			postMessageToHost({
				id: msgId,
				type: AgentMessageType.SessionDeleted,
				payload: { sessionId: payload.sessionId },
			});
			console.log(`[AgentHost] Session deleted: ${payload.sessionId}`);

			if (isActive) {
				await this.createDefaultSession();
				const messages = this.currentSessionManager ? loadMessagesFromSession(this.currentSessionManager) : [];
				postMessageToHost({
					id: uid(),
					type: AgentMessageType.SessionCreated,
					payload: {
						sessionId: this.currentSessionId ?? "",
						name: this.currentSessionName ?? DEFAULT_SESSION_NAME,
						createdAt: Date.now(),
					},
				});
				postMessageToHost({
					id: uid(),
					type: AgentMessageType.SessionSwitched,
					payload: {
						sessionId: this.currentSessionId ?? "",
						name: this.currentSessionName ?? DEFAULT_SESSION_NAME,
						messages,
						model: this.getCurrentModel(),
					},
				});
			}
		} catch (err) {
			this.respondCrudError(msgId, ErrorCode.DELETE_ERROR, err);
		}
	}

	async renameSession(msgId: string, payload: { sessionId: string; name: string }): Promise<void> {
		try {
			const trimmedName = payload.name.trim();
			if (!trimmedName) {
				postMessageToHost({
					id: msgId,
					type: AgentMessageType.SessionError,
					payload: { code: ErrorCode.INVALID_NAME, message: "Name cannot be empty" },
				});
				return;
			}

			const dir = await this.getSessionsDir();
			const all = await SessionManager.listAll(dir);
			const target = all.find((s) => s.id === payload.sessionId);
			if (!target) {
				postMessageToHost({
					id: msgId,
					type: AgentMessageType.SessionError,
					payload: { code: ErrorCode.NOT_FOUND, message: `Session ${payload.sessionId} not found` },
				});
				return;
			}

			const sm = SessionManager.open(target.path);
			sm.appendSessionInfo(trimmedName);
			if (this.currentSessionId === payload.sessionId) this.currentSessionName = trimmedName;

			postMessageToHost({
				id: msgId,
				type: AgentMessageType.SessionRenamed,
				payload: { sessionId: payload.sessionId, name: trimmedName },
			});
			console.log(`[AgentHost] Session renamed: ${payload.sessionId} → "${trimmedName}"`);
		} catch (err) {
			this.respondCrudError(msgId, ErrorCode.RENAME_ERROR, err);
		}
	}

	async history(msgId: string, payload: { sessionId: string }): Promise<void> {
		try {
			if (this.currentSessionId === payload.sessionId && this.currentSessionManager) {
				postMessageToHost({
					id: msgId,
					type: AgentMessageType.SessionHistoryResult,
					payload: {
						sessionId: payload.sessionId,
						messages: loadMessagesFromSession(this.currentSessionManager),
					},
				});
				return;
			}

			const dir = await this.getSessionsDir();
			const all = await SessionManager.listAll(dir);
			const target = all.find((s) => s.id === payload.sessionId);
			if (!target) {
				postMessageToHost({
					id: msgId,
					type: AgentMessageType.SessionError,
					payload: { code: ErrorCode.NOT_FOUND, message: `Session ${payload.sessionId} not found` },
				});
				return;
			}

			postMessageToHost({
				id: msgId,
				type: AgentMessageType.SessionHistoryResult,
				payload: { sessionId: payload.sessionId, messages: loadMessagesFromSession(SessionManager.open(target.path)) },
			});
		} catch (err) {
			this.respondCrudError(msgId, ErrorCode.HISTORY_ERROR, err);
		}
	}

	// ---- Private helpers ----

	private respondSwitched(msgId: string, sessionId: string, name: string, messages: SessionMessagePayload[]): void {
		postMessageToHost({
			id: msgId,
			type: AgentMessageType.SessionSwitched,
			payload: { sessionId, name, messages, model: this.getCurrentModel() },
		});
	}

	private respondCrudError(msgId: string, code: string, err: unknown): void {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`[AgentHost] ${code}:`, message);
		postMessageToHost({
			id: msgId,
			type: AgentMessageType.SessionError,
			payload: { code, message },
		});
	}

	private moveToBackground(): void {
		if (this.currentSessionId && this.session && this.unsubscribe) {
			this.backgroundSessions.set(this.currentSessionId, {
				session: this.session,
				manager: this.currentSessionManager!,
				name: this.currentSessionName ?? DEFAULT_SESSION_NAME,
				unsubscribe: this.unsubscribe,
			});
			console.log(`[AgentHost] Moved to background: ${this.currentSessionId}`);
			this.session = null;
			this.currentSessionManager = null;
			this.currentSessionId = null;
			this.unsubscribe = null;
		}
	}

	private async getSessionsDir(): Promise<string> {
		if (this.sessionsDir) return this.sessionsDir;
		const fs = await import("node:fs/promises");
		const dir = getSessionsDir();
		await fs.mkdir(dir, { recursive: true });
		this.sessionsDir = dir;
		return dir;
	}

	private async listAllSessions(): Promise<SessionInfoPayload[]> {
		const dir = await this.getSessionsDir();
		const sessions = await SessionManager.listAll(dir);
		return sessions.map((s) => {
			let lastMessage: string | undefined;
			try {
				const sm = SessionManager.open(s.path);
				const entries = sm.getBranch();
				for (let i = entries.length - 1; i >= 0; i--) {
					const entry = entries[i] as {
						type: string;
						message?: { role: string; content: unknown };
					};
					if (entry.type === "message" && entry.message?.role === "user") {
						lastMessage = extractLastUserText([entry.message]);
						break;
					}
				}
			} catch {
				lastMessage = s.firstMessage;
			}
			return {
				file: s.path,
				id: s.id,
				name: s.name ?? DEFAULT_SESSION_NAME,
				createdAt: s.created.getTime(),
				lastMessage: lastMessage?.slice(0, 80),
				lastActiveAt: s.modified.getTime(),
			};
		});
	}

	private async createAgentSessionFor(sm: ReturnType<typeof SessionManager.open>): Promise<AgentSession> {
		if (!this.modelRuntime) throw new Error("ModelRuntime not initialized");

		const level = (process.env.PI_THINKING_LEVEL as ThinkingLevel) ?? "medium";

		const result = await createAgentSession({
			modelRuntime: this.modelRuntime,
			sessionManager: sm,
			settingsManager: this.settingsManager ?? undefined,
			tools: ["read", "bash", "edit", "write"],
			thinkingLevel: level,
		});

		if (this.agentModelRef) this.agentModelRef.value = result.session.model?.id;
		if (this.thinkingLevelRef) this.thinkingLevelRef.value = process.env.PI_THINKING_LEVEL ?? "medium";

		return result.session;
	}

	private async createDefaultSession(): Promise<void> {
		try {
			const dir = await this.getSessionsDir();
			const sm = SessionManager.create(process.cwd(), dir);
			this.currentSessionManager = sm;
			this.currentSessionId = sm.getSessionId();
			this.currentSessionName = DEFAULT_SESSION_NAME;
			this.session = await this.createAgentSessionFor(sm);
			this.subscribeToSession(this.session, this.currentSessionId ?? "");
		} catch (err) {
			console.error("[AgentHost] Failed to create default session, falling back to in-memory:", err);
			const sm = SessionManager.inMemory(process.cwd());
			this.currentSessionManager = sm;
			this.currentSessionId = sm.getSessionId();
			this.currentSessionName = DEFAULT_SESSION_NAME;
			this.session = await this.createAgentSessionFor(sm);
			this.subscribeToSession(this.session, this.currentSessionId ?? "");
		}
	}

	private async closeCurrentSession(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		const sid = this.currentSessionId;
		if (this.session) {
			try {
				this.session.dispose();
			} catch (err) {
				console.error("[AgentHost] Error disposing session:", err);
			}
			this.session = null;
		}
		this.currentSessionManager = null;
		this.currentSessionId = null;
		this.currentSessionName = null;
		if (sid) this.backgroundSessions.delete(sid);
	}

	// ---- Event subscription ----

	private subscribeToSession(s: AgentSession, sid: string): void {
		this.unsubscribe = s.subscribe((event) => {
			switch (event.type) {
				case "message_update":
					this.handleMessageUpdate(event, sid);
					break;
				case "tool_execution_start":
					this.handleToolExecutionStart(event);
					break;
				case "tool_execution_end":
					this.handleToolExecutionEnd(event);
					break;
				case "agent_end":
					this.handleAgentEnd(event, sid);
					break;
			}
		});
	}

	private handleMessageUpdate(event: Extract<AgentSessionEvent, { type: "message_update" }>, sessionId: string): void {
		if (this.titleGenerator.isGenerating) return;
		const { assistantMessageEvent } = event;
		if (assistantMessageEvent.type === "text_delta") {
			postMessageToHost({
				id: uid(),
				type: AgentMessageType.ChatChunk,
				payload: { sessionId, delta: assistantMessageEvent.delta, kind: "content" },
			});
		}
		if (assistantMessageEvent.type === "thinking_delta") {
			postMessageToHost({
				id: uid(),
				type: AgentMessageType.ThinkingUpdate,
				payload: { sessionId, text: assistantMessageEvent.delta },
			});
		}
	}

	private handleToolExecutionStart(event: Extract<AgentSessionEvent, { type: "tool_execution_start" }>): void {
		console.log(`[AgentHost] Tool: ${event.toolName}`);
	}

	private handleToolExecutionEnd(event: Extract<AgentSessionEvent, { type: "tool_execution_end" }>): void {
		console.log(`[AgentHost] Tool result: ${event.isError ? "error" : "ok"}`);
	}

	private handleAgentEnd(event: Extract<AgentSessionEvent, { type: "agent_end" }>, sessionId: string): void {
		const newMessages = event.messages;
		const lastAssistant = [...newMessages].reverse().find((m) => m.role === "assistant");
		let content = "";
		let thinking = "";
		if (lastAssistant) {
			for (const block of lastAssistant.content) {
				if (block.type === "text") content += block.text;
				else if (block.type === "thinking") thinking += block.thinking;
			}
		}

		// Title generation mode: finalize title, skip chat:done
		if (this.titleGenerator.isGenerating) {
			this.titleGenerator.finalize(content);
			return;
		}

		postMessageToHost({
			id: uid(),
			type: AgentMessageType.ChatDone,
			payload: {
				sessionId,
				content,
				thinking: thinking || undefined,
				usage: lastAssistant?.usage
					? { promptTokens: lastAssistant.usage.input, completionTokens: lastAssistant.usage.output }
					: undefined,
			},
		});

		// Clean up finished background sessions
		if (this.backgroundSessions.has(sessionId)) {
			const bg = this.backgroundSessions.get(sessionId)!;
			bg.unsubscribe();
			try {
				bg.session.dispose();
			} catch {
				/* ignore */
			}
			this.backgroundSessions.delete(sessionId);
			return;
		}

		// Auto-generate title for a new session's first reply
		if (this.titleGenerator.consumeIfNeeded() && this.session) {
			this.titleGenerator.trigger(extractLastUserText(newMessages as Array<{ role: string; content: unknown }>));
		}
	}
}
