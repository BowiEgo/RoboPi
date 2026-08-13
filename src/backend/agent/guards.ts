/**
 * Runtime payload type guards.
 *
 * All IPC payloads are `unknown` at the boundary. These guards validate the
 * shape before any `as` cast is used, so a malformed message fails with a
 * typed error instead of crashing or silently corrupting state.
 */

// ── Primitives ──

import { THINKING_LEVELS, type ThinkingLevel } from "./constants.ts";

export function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isString(v: unknown): v is string {
	return typeof v === "string";
}

// ── Message payloads ──

export interface ChatSendPayload {
	content: string;
	sessionId: string;
}

export function isChatSendPayload(v: unknown): v is ChatSendPayload {
	return (
		isRecord(v) &&
		isString(v.content) &&
		v.content.length > 0 &&
		(isString(v.sessionId) || v.sessionId === undefined)
	);
}

export interface SessionIdPayload {
	sessionId: string;
}

export function isSessionIdPayload(v: unknown): v is SessionIdPayload {
	return isRecord(v) && isString(v.sessionId);
}

export interface SessionCreatePayload {
	name?: string;
}

export function isSessionCreatePayload(v: unknown): v is SessionCreatePayload {
	if (v === undefined || v === null || (isRecord(v) && Object.keys(v).length === 0)) return true;
	return isRecord(v) && (v.name === undefined || isString(v.name));
}

export interface SessionRenamePayload {
	sessionId: string;
	name: string;
}

export function isSessionRenamePayload(v: unknown): v is SessionRenamePayload {
	return isRecord(v) && isString(v.sessionId) && isString(v.name);
}

export interface ModelConfigPayload {
	model?: string;
	thinkingLevel?: string;
}

export function isModelConfigPayload(v: unknown): v is ModelConfigPayload {
	if (v === undefined || v === null) return true;
	return (
		isRecord(v) &&
		(v.model === undefined || isString(v.model)) &&
		(v.thinkingLevel === undefined || isString(v.thinkingLevel))
	);
}

export interface ModelSetApiKeyPayload {
	provider: string;
	apiKey: string;
}

export function isModelSetApiKeyPayload(v: unknown): v is ModelSetApiKeyPayload {
	return isRecord(v) && isString(v.provider) && v.provider.length > 0 && isString(v.apiKey) && v.apiKey.length > 0;
}

export function isThinkingLevel(v: unknown): v is ThinkingLevel {
	return typeof v === "string" && THINKING_LEVELS.includes(v as ThinkingLevel);
}

export interface ModelRefreshPayload {
	force?: boolean;
}

export function isModelRefreshPayload(v: unknown): v is ModelRefreshPayload {
	if (v === undefined || v === null) return true;
	return isRecord(v) && (v.force === undefined || typeof v.force === "boolean");
}
