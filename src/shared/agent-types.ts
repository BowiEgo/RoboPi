/**
 * Agent Host IPC type definitions.
 *
 * Message format used across: renderer ↔ main process ↔ Agent Host.
 */

// ============================================================================
// Message envelope
// ============================================================================

import type { UIExtension, UIExtensionDescriptor } from "./ui-types.ts";
export type { UIExtensionDescriptor } from "./ui-types.ts";
import type { SerializableSchema } from "./plugin/schema.ts";
export type { SerializableSchema } from "./plugin/schema.ts";

export interface AgentMessage {
	/** Unique message ID for request/response correlation. */
	id: string;
	/** Message type. */
	type: AgentMessageType;
	/** Message payload. */
	payload: AgentPayload;
}

/** Validate whether a value is a legal AgentMessageType. */
export function isValidMessageType(value: unknown): value is AgentMessageType {
	return (
		typeof value === "string" &&
		Object.values(AgentMessageType).includes(value as AgentMessageType)
	);
}

export const AgentMessageType = {
	// Chat
	ChatSend: "chat:send",
	ChatCancel: "chat:cancel",
	ChatChunk: "chat:chunk",
	ChatDone: "chat:done",
	ChatError: "chat:error",
	ToolCall: "tool:call",
	ToolResult: "tool:result",
	ThinkingUpdate: "thinking:update",
	// Agent lifecycle
	AgentStatus: "agent:status",
	AgentReady: "agent:ready",
	AgentConfig: "agent:config",
	AgentShutdown: "agent:shutdown",
	AgentError: "agent:error",
	// Model management
	ModelRefresh: "model:refresh",
	ModelRefreshed: "model:refreshed",
	ModelSetApiKey: "model:set_api_key",
	// Session management
	SessionCreate: "session:create",
	SessionList: "session:list",
	SessionSwitch: "session:switch",
	SessionDelete: "session:delete",
	SessionRename: "session:rename",
	SessionHistory: "session:history",
	SessionCreated: "session:created",
	SessionListResult: "session:list_result",
	SessionSwitched: "session:switched",
	SessionDeleted: "session:deleted",
	SessionRenamed: "session:renamed",
	SessionHistoryResult: "session:history_result",
	SessionStats: "session:stats",
	SessionError: "session:error",
	// UI plugins
	UIManifest: "ui:manifest",
	PluginConfig: "plugin:config",
	PluginUnload: "plugin:unload",
	PluginLoad: "plugin:load",
	PluginList: "plugin:list",
} as const;

export type AgentMessageType =
	(typeof AgentMessageType)[keyof typeof AgentMessageType];

// ============================================================================
// Payload types
// ============================================================================

export type AgentPayload =
	| ChatSendPayload
	| ChatChunkPayload
	| ChatDonePayload
	| ChatErrorPayload
	| ToolCallPayload
	| ToolResultPayload
	| ThinkingUpdatePayload
	| AgentStatusPayload
	| AgentReadyPayload
	| AgentConfigPayload
	| AgentErrorPayload
	| ModelRefreshPayload
	| ModelRefreshedPayload
	| ModelSetApiKeyPayload
	// Session
	| SessionCreatePayload
	| SessionListPayload
	| SessionSwitchPayload
	| SessionDeletePayload
	| SessionRenamePayload
	| SessionHistoryPayload
	| SessionCreatedPayload
	| SessionListResultPayload
	| SessionSwitchedPayload
	| SessionDeletedPayload
	| SessionRenamedPayload
	| SessionHistoryResultPayload
	| SessionStatsPayload
	| SessionErrorPayload
	| UIManifestPayload
	| PluginConfigPayload
	| PluginUnloadPayload
	| PluginLoadPayload
	| PluginListPayload
	| Record<string, never>;

/** Send a chat message. */
export interface ChatSendPayload {
	/** User message content. */
	content: string;
	/** Session ID. */
	sessionId: string;
	/** Optional additional context. */
	context?: {
		files?: FileContext[];
		/** System prompt override. */
		systemPrompt?: string;
	};
}

export interface FileContext {
	name: string;
	path: string;
	mimeType?: string;
}

/** Streaming reply chunk. */
export interface ChatChunkPayload {
	/** Session ID. */
	sessionId: string;
	/** Text delta for this chunk. */
	delta: string;
	/** Chunk kind: content | thinking. */
	kind: "content" | "thinking";
}

/** Chat completion. */
export interface ChatDonePayload {
	sessionId: string;
	/** Full reply content. */
	content: string;
	/** Full thinking process. */
	thinking?: string;
	/** Token usage stats. */
	usage?: {
		promptTokens: number;
		completionTokens: number;
	};
}

/** Chat error. */
export interface ChatErrorPayload {
	sessionId: string;
	code: string;
	message: string;
}

/** Tool call request. */
export interface ToolCallPayload {
	sessionId: string;
	toolName: string;
	args: Record<string, unknown>;
}

/** Tool call result. */
export interface ToolResultPayload {
	sessionId: string;
	toolName: string;
	result: unknown;
	error?: string;
}

/** Thinking process update. */
export interface ThinkingUpdatePayload {
	sessionId: string;
	text: string;
}

/** Agent status. */
export interface AgentStatusPayload {
	status: "idle" | "thinking" | "responding" | "error";
	sessionId?: string;
}

/** A model available for selection (its provider has a configured API key). */
export interface ConfiguredModel {
	id: string;
	provider: string;
}

/** Agent ready signal. */
export interface AgentReadyPayload {
	pid: number;
	version: string;
	model?: string;
	thinkingLevel?: string;
	availableThinkingLevels?: string[];
	availableModels?: string[];
	configuredModels?: ConfiguredModel[];
	providerList?: { id: string; name: string }[];
}

/** Agent configuration (query / response). */
export interface AgentConfigPayload {
	model?: string;
	thinkingLevel?: string;
	availableThinkingLevels?: string[];
	/** Available model list. */
	availableModels?: string[];
	configuredModels?: ConfiguredModel[];
	providerList?: { id: string; name: string }[];
	status?: "idle" | "thinking" | "responding" | "error";
}

/** Agent lifecycle / protocol error (init, not-ready, invalid payload). */
export interface AgentErrorPayload {
	code: string;
	message: string;
}

// ============================================================================
// Model management
// ============================================================================

/** Request model catalog refresh from network. */
export interface ModelRefreshPayload {
	force?: boolean;
}

/** Updated model list after refresh. */
export interface ModelRefreshedPayload {
	models: ConfiguredModel[];
}

export interface ModelSetApiKeyPayload {
	provider: string;
	apiKey: string;
}

// ============================================================================
// Session management
// ============================================================================

/** Create a new session. */
export interface SessionCreatePayload {
	name?: string;
}

/** Request session list. */
export type SessionListPayload = Record<string, never>;

/** Switch to the specified session. */
export interface SessionSwitchPayload {
	sessionId: string;
}

/** Delete a session. */
export interface SessionDeletePayload {
	sessionId: string;
}

/** Rename a session. */
export interface SessionRenamePayload {
	sessionId: string;
	name: string;
}

/** Load session message history. */
export interface SessionHistoryPayload {
	sessionId: string;
	/** Load messages strictly before this message id (older history). */
	beforeId?: string;
}

/** Session created successfully. */
export interface SessionCreatedPayload {
	sessionId: string;
	name: string;
	createdAt: number;
	file: string;
}

/** Session list result. */
export interface SessionListResultPayload {
	sessions: SessionInfoPayload[];
}

/** Session switched successfully. */
export interface SessionSwitchedPayload {
	sessionId: string;
	name: string;
	messages: SessionMessagePayload[];
	/** True when there are messages older than the returned window. */
	hasMore?: boolean;
	/** Lightweight outline of every user message (for the timeline navigator). */
	outline?: SessionOutlineItem[];
	model?: string;
	thinkingLevel?: string;
	availableThinkingLevels?: string[];
}

/** Session deleted successfully. */
export interface SessionDeletedPayload {
	sessionId: string;
}

/** Session renamed successfully. */
export interface SessionRenamedPayload {
	sessionId: string;
	name: string;
}

/** Message history result. */
export interface SessionHistoryResultPayload {
	sessionId: string;
	messages: SessionMessagePayload[];
	/** True when there are messages older than the returned window. */
	hasMore?: boolean;
}

/** Session usage statistics (cumulative tokens, cache, cost, context usage). */
export interface SessionStatsPayload {
	sessionId: string;
	tokens: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		total: number;
	};
	cost: number;
	contextUsage?: {
		tokens: number | null;
		contextWindow: number;
		percent: number | null;
	};
}

/** Session operation error. */
export interface SessionErrorPayload {
	code: string;
	message: string;
}

/** UI plugin manifest sent to the renderer. */
export interface UIManifestPayload {
	extensions: UIExtensionDescriptor[];
}

/** Update a plugin's config (renderer → Agent Host). */
export interface PluginConfigPayload {
	pluginId: string;
	config: unknown;
}

/** Unload a plugin (renderer → Agent Host). */
export interface PluginUnloadPayload {
	pluginId: string;
}

/** Load (re-enable) a previously unloaded plugin. */
export interface PluginLoadPayload {
	pluginId: string;
}

/** A plugin's full descriptor, for the management UI. */
export interface PluginDescriptor {
	id: string;
	name: string;
	enabled: boolean;
	/** Derived: true when the id has the core: prefix (locked). */
	core: boolean;
	ui?: UIExtension;
	settingsSchema?: SerializableSchema;
	settingsValue?: unknown;
}

/** Full plugin inventory sent to the renderer. */
export interface PluginListPayload {
	plugins: PluginDescriptor[];
}

// ============================================================================
// Session data models
// ============================================================================

/** Session list item (transferred from Agent Host to UI). */
export interface SessionInfoPayload {
	file: string;
	id: string;
	name: string;
	createdAt: number;
	lastMessage?: string;
	lastActiveAt: number;
}

export interface SessionInfo {
	/** Session file path (file: URI or file path). */
	file: string;
	/** Session UUID. */
	id: string;
	/** Session display name. */
	name: string;
	/** Creation timestamp (ms). */
	createdAt: number;
	/** Last message text (for sidebar preview). */
	lastMessage?: string;
	/** Last activity time. */
	lastActiveAt: number;
}

/** Single message (for UI rendering). */
export interface SessionMessagePayload {
	id: string;
	role: "user" | "agent";
	content: string;
	thinking?: string;
	timestamp: string;
	streaming?: boolean;
}

/** Lightweight user-message marker for the outline navigator. */
export interface SessionOutlineItem {
	id: string;
	text: string;
}

// ============================================================================
// Agent session (runtime)
// ============================================================================

export interface AgentSession {
	id: string;
	messages: SessionMessage[];
	createdAt: number;
}

export interface SessionMessage {
	role: "user" | "agent";
	content: string;
	thinking?: string;
	timestamp: number;
}
