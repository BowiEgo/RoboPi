/**
 * Pure message (de)serialization helpers.
 *
 * These convert between Pi SDK's SessionManager entries and the
 * SessionMessagePayload shape sent to the renderer. No side effects, no IPC.
 */

import type { SessionManager } from "@earendil-works/pi-coding-agent";

import type { SessionMessagePayload } from "../../../shared/agent-types.ts";

function fmtTimestamp(ms: number): string {
	return new Date(ms).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function loadMessagesFromSession(sm: ReturnType<typeof SessionManager.open>): SessionMessagePayload[] {
	const entries = sm.getBranch();
	const messages: SessionMessagePayload[] = [];

	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const msg = (
			entry as {
				message: {
					role: string;
					content: unknown;
					timestamp: number;
				};
			}
		).message;

		if (msg.role === "user") {
			messages.push({
				id: (entry as { id: string }).id,
				role: "user",
				content: extractText(msg.content),
				timestamp: fmtTimestamp(msg.timestamp),
			});
		} else if (msg.role === "assistant") {
			messages.push({
				id: (entry as { id: string }).id,
				role: "agent",
				content: extractText(msg.content),
				thinking: extractThinking(msg.content) || undefined,
				timestamp: fmtTimestamp(msg.timestamp),
			});
		}
	}

	return messages;
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
