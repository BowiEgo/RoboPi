/**
 * Agent host constants — magic strings centralized in one place.
 */

export const AGENT_VERSION = "0.4.0";

export const AGENT_READY_ID = "agent-ready";

export const DEFAULT_SESSION_NAME = "Untitled";

// ── Error codes ──

export const ErrorCode = {
	INIT_ERROR: "INIT_ERROR",
	NOT_READY: "NOT_READY",
	INVALID_PAYLOAD: "INVALID_PAYLOAD",
	AGENT_ERROR: "AGENT_ERROR",
	REFRESH_ERROR: "REFRESH_ERROR",
	CREATE_ERROR: "CREATE_ERROR",
	LIST_ERROR: "LIST_ERROR",
	SWITCH_ERROR: "SWITCH_ERROR",
	DELETE_ERROR: "DELETE_ERROR",
	RENAME_ERROR: "RENAME_ERROR",
	HISTORY_ERROR: "HISTORY_ERROR",
	NOT_FOUND: "NOT_FOUND",
	INVALID_NAME: "INVALID_NAME",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── Thinking levels ──

export const THINKING_LEVELS = [
	"off",
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
] as const;

export type ThinkingLevel = (typeof THINKING_LEVELS)[number];
