/**
 * Pure message (de)serialization helpers.
 *
 * These convert between Pi SDK's SessionManager entries and the
 * SessionMessagePayload shape sent to the renderer. No side effects, no IPC.
 */

import type { SessionManager } from "@earendil-works/pi-coding-agent";

import type { SessionMessagePayload, SessionOutlineItem } from "../../../shared/agent-types.ts";

function fmtTimestamp(ms: number): string {
	return new Date(ms).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export interface LoadMessagesOptions {
	/** Only load the most recent N messages (from the end). */
	limit?: number;
	/** Load messages strictly before this entry id (older history). */
	beforeId?: string;
}

export interface LoadedMessages {
	messages: SessionMessagePayload[];
	/** True when there are messages older than the returned window. */
	hasMore: boolean;
}

export function loadMessagesFromSession(
	sm: ReturnType<typeof SessionManager.open>,
	options: LoadMessagesOptions = {},
): LoadedMessages {
	const entries = sm.getBranch();
	const { limit, beforeId } = options;
	const messages: SessionMessagePayload[] = [];

	// Determine the starting index: the entry before `beforeId`, or the tail.
	let startIdx = entries.length - 1;
	if (beforeId) {
		let found = -1;
		for (let i = entries.length - 1; i >= 0; i--) {
			if ((entries[i] as { id: string }).id === beforeId) {
				found = i;
				break;
			}
		}
		if (found < 0) return { messages: [], hasMore: false };
		startIdx = found - 1;
	}

	// Walk backwards so we can stop early once `limit` messages are collected.
	let stopIdx = -1;
	for (let i = startIdx; i >= 0; i--) {
		const entry = entries[i] as {
			type: string;
			id?: string;
			message?: {
				role: string;
				content: unknown;
				timestamp: number;
			};
		};
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (!msg) continue;

		if (msg.role === "user") {
			messages.unshift({
				id: entry.id ?? "",
				role: "user",
				content: extractText(msg.content),
				timestamp: fmtTimestamp(msg.timestamp),
			});
		} else if (msg.role === "assistant") {
			messages.unshift({
				id: entry.id ?? "",
				role: "agent",
				content: extractText(msg.content),
				thinking: extractThinking(msg.content) || undefined,
				timestamp: fmtTimestamp(msg.timestamp),
			});
		}
		if (limit && messages.length >= limit) {
			stopIdx = i;
			break;
		}
	}

	// hasMore: any message entry strictly before the window we stopped at.
	let hasMore = false;
	for (let i = stopIdx - 1; i >= 0; i--) {
		if ((entries[i] as { type: string }).type === "message") {
			hasMore = true;
			break;
		}
	}

	return { messages, hasMore };
}

/** Build a lightweight outline of every user message (id + short text). */
export function loadSessionOutline(sm: ReturnType<typeof SessionManager.open>): SessionOutlineItem[] {
	const entries = sm.getBranch();
	const outline: SessionOutlineItem[] = [];
	for (const entry of entries) {
		const e = entry as {
			type: string;
			id?: string;
			message?: { role: string; content: unknown };
		};
		if (e.type !== "message") continue;
		if (e.message?.role !== "user") continue;
		outline.push({
			id: e.id ?? "",
			text: extractText(e.message.content).slice(0, 50),
		});
	}
	return outline;
}

/** Extract concatenated text blocks from a message content. */
function extractText(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return (content as Array<{ type: string; text?: string }>)
			.filter((b) => b.type === "text")
			.map((b) => b.text ?? "")
			.join("");
	}
	return "";
}

/** Extract concatenated thinking blocks from a message content. */
function extractThinking(content: unknown): string {
	if (!Array.isArray(content)) return "";
	return (content as Array<{ type: string; thinking?: string }>)
		.filter((b) => b.type === "thinking")
		.map((b) => b.thinking ?? "")
		.join("");
}

/** Extract the text content from the last user message in a message list. */
export function extractLastUserText(messages: Array<{ role: string; content: unknown }>): string {
	const lastUser = [...messages].reverse().find((m) => m.role === "user");
	if (!lastUser) return "";
	const c = lastUser.content;
	if (typeof c === "string") return c;
	if (Array.isArray(c)) {
		// Space-joined for title generation readability
		return (c as Array<{ text?: string }>)
			.filter((b) => "text" in b)
			.map((b) => b.text ?? "")
			.join(" ");
	}
	return "";
}
