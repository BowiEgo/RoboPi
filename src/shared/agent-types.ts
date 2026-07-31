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
	| "chat:send"
	| "chat:cancel"
	| "chat:chunk"
	| "chat:done"
	| "chat:error"
	| "tool:call"
	| "tool:result"
	| "thinking:update"
	| "agent:status"
	| "agent:ready"
	| "agent:config"
	| "agent:shutdown";

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

// ── 会话 ──

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
