/**
 * Agent Host 通信协议类型定义
 *
 * 渲染进程 ↔ 主进程 ↔ Agent Host 之间的消息格式
 */

// ── 基础消息信封 ──

export interface AgentMessage {
	/** 消息唯一 ID，用于关联请求/响应 */
	id: string;
	/** 消息类型 */
	type: AgentMessageType;
	/** 消息负载 */
	payload: AgentPayload;
}

export type AgentMessageType =
	// Chat
	| "chat:send"
	| "chat:cancel"
	| "chat:chunk"
	| "chat:done"
	| "chat:error"
	| "tool:call"
	| "tool:result"
	| "thinking:update"
	// Agent lifecycle
	| "agent:status"
	| "agent:ready"
	| "agent:config"
	| "agent:shutdown"
	// Session management
	| "session:create"
	| "session:list"
	| "session:switch"
	| "session:delete"
	| "session:rename"
	| "session:history"
	| "session:created"
	| "session:list_result"
	| "session:switched"
	| "session:deleted"
	| "session:renamed"
	| "session:history_result"
	| "session:error";

// ── 负载类型 ──

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
	| SessionErrorPayload
	| Record<string, never>;

/** 发送对话消息 */
export interface ChatSendPayload {
	/** 用户消息内容 */
	content: string;
	/** 会话 ID */
	sessionId: string;
	/** 附加上下文（可选） */
	context?: {
		files?: FileContext[];
		/** 系统提示词 */
		systemPrompt?: string;
	};
}

export interface FileContext {
	name: string;
	path: string;
	mimeType?: string;
}

/** 流式回复片段 */
export interface ChatChunkPayload {
	/** 会话 ID */
	sessionId: string;
	/** 本次追加的文本片段 */
	delta: string;
	/** 片段类型：content | thinking */
	kind: "content" | "thinking";
}

/** 对话完成 */
export interface ChatDonePayload {
	sessionId: string;
	/** 完整回复内容 */
	content: string;
	/** 完整思考过程 */
	thinking?: string;
	/** 使用的 token 数 */
	usage?: {
		promptTokens: number;
		completionTokens: number;
	};
}

/** 错误 */
export interface ChatErrorPayload {
	sessionId: string;
	code: string;
	message: string;
}

/** 工具调用请求 */
export interface ToolCallPayload {
	sessionId: string;
	toolName: string;
	args: Record<string, unknown>;
}

/** 工具调用结果 */
export interface ToolResultPayload {
	sessionId: string;
	toolName: string;
	result: unknown;
	error?: string;
}

/** 思考过程更新 */
export interface ThinkingUpdatePayload {
	sessionId: string;
	text: string;
}

/** Agent 状态 */
export interface AgentStatusPayload {
	status: "idle" | "thinking" | "responding" | "error";
	sessionId?: string;
}

/** Agent 就绪 */
export interface AgentReadyPayload {
	pid: number;
	version: string;
	/** 当前使用的模型 ID */
	model?: string;
	/** 思考等级 */
	thinkingLevel?: string;
	/** 可用模型列表 */
	availableModels?: string[];
}

/** Agent 配置（查询/响应） */
export interface AgentConfigPayload {
	model?: string;
	thinkingLevel?: string;
	/** 可用模型列表 */
	availableModels?: string[];
	status?: "idle" | "thinking" | "responding" | "error";
}

// ── Session 管理 ──

/** 创建新会话 */
export interface SessionCreatePayload {
	name?: string;
}

/** 请求会话列表 */
export type SessionListPayload = Record<string, never>;

/** 切换到指定会话 */
export interface SessionSwitchPayload {
	sessionId: string;
}

/** 删除会话 */
export interface SessionDeletePayload {
	sessionId: string;
}

/** 重命名会话 */
export interface SessionRenamePayload {
	sessionId: string;
	name: string;
}

/** 加载会话历史消息 */
export interface SessionHistoryPayload {
	sessionId: string;
}

/** 会话创建成功 */
export interface SessionCreatedPayload {
	sessionId: string;
	name: string;
	createdAt: number;
	file: string;
}

/** 会话列表结果 */
export interface SessionListResultPayload {
	sessions: SessionInfoPayload[];
}

/** 会话切换成功 */
export interface SessionSwitchedPayload {
	sessionId: string;
	name: string;
	messages: SessionMessagePayload[];
}

/** 会话删除成功 */
export interface SessionDeletedPayload {
	sessionId: string;
}

/** 会话重命名成功 */
export interface SessionRenamedPayload {
	sessionId: string;
	name: string;
}

/** 历史消息结果 */
export interface SessionHistoryResultPayload {
	sessionId: string;
	messages: SessionMessagePayload[];
}

/** 会话操作错误 */
export interface SessionErrorPayload {
	code: string;
	message: string;
}

// ── 会话数据模型 ──

/** 会话列表项（从 Agent Host 传回 UI） */
export interface SessionInfoPayload {
	file: string;
	id: string;
	name: string;
	createdAt: number;
	lastMessage?: string;
	lastActiveAt: number;
}

export interface SessionInfo {
	/** 会话文件路径（file: URI 或文件路径） */
	file: string;
	/** 会话 UUID */
	id: string;
	/** 会话显示名称 */
	name: string;
	/** 创建时间戳 (ms) */
	createdAt: number;
	/** 最后一条消息文本（用于侧边栏预览） */
	lastMessage?: string;
	/** 最后活动时间 */
	lastActiveAt: number;
}

/** 单条消息（供 UI 渲染） */
export interface SessionMessagePayload {
	id: string;
	role: "user" | "agent";
	content: string;
	thinking?: string;
	timestamp: string;
	streaming?: boolean;
}

// ── Agent 会话（运行时） ──

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
