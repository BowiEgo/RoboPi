/**
 * Tests for session.ts — SessionHost class and pure utility functions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentMessageType } from "../../../shared/agent-types.ts";
import { postMessageToHost, uid } from "../ipc.ts";
import { extractLastUserText, loadMessagesFromSession } from "./message-loader.ts";

// ============================================================================
// uid()
// ============================================================================

describe("uid", () => {
	it("returns a non-empty string", () => {
		expect(uid()).toBeTruthy();
		expect(typeof uid()).toBe("string");
	});

	it("returns a string containing a timestamp prefix and a random suffix", () => {
		const id = uid();
		const parts = id.split("-");
		expect(parts).toHaveLength(2);
		// first part should be a numeric timestamp
		expect(Number.isFinite(Number(parts[0]))).toBe(true);
		// second part should be base-36 random
		expect(parts[1].length).toBeGreaterThan(0);
	});

	it("returns unique values on successive calls", () => {
		const ids = new Set(Array.from({ length: 100 }, () => uid()));
		expect(ids.size).toBe(100);
	});
});

// ============================================================================
// postMessageToHost()
// ============================================================================

describe("postMessageToHost", () => {
	const originalSend = process.send;

	beforeEach(() => {
		process.send = vi.fn() as unknown as typeof process.send;
	});

	afterEach(() => {
		process.send = originalSend;
	});

	it("calls process.send with the provided message", () => {
		const msg = {
			id: "test-1",
			type: AgentMessageType.ChatSend,
			payload: { content: "hello", sessionId: "s1" },
		};

		postMessageToHost(msg);
		expect(process.send).toHaveBeenCalledTimes(1);
		expect(process.send).toHaveBeenCalledWith(msg);
	});

	it("does not throw when process.send is not available", () => {
		process.send = undefined as unknown as typeof process.send;
		expect(() =>
			postMessageToHost({
				id: "test",
				type: AgentMessageType.AgentReady,
				payload: { pid: 1, version: "1.0" },
			}),
		).not.toThrow();
	});
});

// ============================================================================
// extractLastUserText()
// ============================================================================

describe("extractLastUserText", () => {
	it("returns empty string for an empty array", () => {
		expect(extractLastUserText([])).toBe("");
	});

	it("returns the content of the last user message (string content)", () => {
		const messages = [
			{ role: "user", content: "first message" },
			{ role: "assistant", content: "reply" },
			{ role: "user", content: "second message" },
		];
		expect(extractLastUserText(messages)).toBe("second message");
	});

	it("extracts text from array-style content", () => {
		const messages = [
			{
				role: "user",
				content: [
					{ type: "text", text: "hello" },
					{ type: "text", text: "world" },
				],
			},
		];
		expect(extractLastUserText(messages)).toBe("hello world");
	});

	it("skips non-text blocks inside array content", () => {
		const messages = [
			{
				role: "user",
				content: [
					{ type: "image", url: "x.png" },
					{ type: "text", text: "caption" },
				],
			},
		];
		expect(extractLastUserText(messages)).toBe("caption");
	});

	it("returns empty string when no user message exists", () => {
		const messages = [
			{ role: "assistant", content: "only assistant" },
			{ role: "assistant", content: "another" },
		];
		expect(extractLastUserText(messages)).toBe("");
	});

	it("returns empty string for user message with empty array content", () => {
		const messages = [{ role: "user", content: [] }];
		expect(extractLastUserText(messages)).toBe("");
	});

	it("returns empty string for unrecognized content type", () => {
		const messages = [{ role: "user", content: 42 }];
		expect(extractLastUserText(messages)).toBe("");
	});
});

// ============================================================================
// loadMessagesFromSession()
// ============================================================================

function createMockEntry(id: string, role: "user" | "assistant", content: unknown, timestamp = 1700000000000) {
	return {
		id,
		type: "message" as const,
		message: { role, content, timestamp },
	};
}

describe("loadMessagesFromSession", () => {
	it("returns an empty array for a session with no message entries", () => {
		const sm = {
			getBranch: () => [],
		};
		expect(
			// biome-ignore lint/suspicious/noExplicitAny: test mock
			loadMessagesFromSession(sm as any),
		).toEqual([]);
	});

	it("converts a user message entry", () => {
		const sm = {
			getBranch: () => [createMockEntry("1", "user", "hello")],
		};
		const result = // biome-ignore lint/suspicious/noExplicitAny: test mock
			loadMessagesFromSession(sm as any);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: "1",
			role: "user",
			content: "hello",
		});
		expect(result[0].timestamp).toBeTruthy();
	});

	it("converts an assistant message entry", () => {
		const sm = {
			getBranch: () => [
				createMockEntry("2", "assistant", [
					{ type: "text", text: "Hi!" },
					{ type: "thinking", thinking: "..." },
				]),
			],
		};
		const result = // biome-ignore lint/suspicious/noExplicitAny: test mock
			loadMessagesFromSession(sm as any);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: "2",
			role: "agent",
			content: "Hi!",
			thinking: "...",
		});
	});

	it("skips non-message entries (e.g. session_info, branch)", () => {
		const sm = {
			getBranch: () => [
				{ id: "info", type: "session_info", name: "test" },
				createMockEntry("1", "user", "hello"),
				{ id: "branch", type: "branch", leafId: "x" },
			],
		};
		const result = // biome-ignore lint/suspicious/noExplicitAny: test mock
			loadMessagesFromSession(sm as any);
		expect(result).toHaveLength(1);
	});

	it("handles array-style user content (text blocks)", () => {
		const sm = {
			getBranch: () => [
				createMockEntry("1", "user", [
					{ type: "text", text: "part1" },
					{ type: "text", text: "part2" },
				]),
			],
		};
		const result = // biome-ignore lint/suspicious/noExplicitAny: test mock
			loadMessagesFromSession(sm as any);
		expect(result[0].content).toBe("part1part2");
	});

	it("preserves message order from getBranch()", () => {
		const sm = {
			getBranch: () => [
				createMockEntry("1", "user", "first"),
				createMockEntry("2", "assistant", "reply1"),
				createMockEntry("3", "user", "second"),
				createMockEntry("4", "assistant", "reply2"),
			],
		};
		const result = // biome-ignore lint/suspicious/noExplicitAny: test mock
			loadMessagesFromSession(sm as any);
		expect(result).toHaveLength(4);
		expect(result.map((m) => m.role)).toEqual(["user", "agent", "user", "agent"]);
	});
});
