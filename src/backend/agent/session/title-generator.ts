/**
 * Automatic session title generation.
 *
 * After a new session's first agent reply, a follow-up prompt asks the model
 * for a short title. The title replaces the default "Untitled" name via a
 * branch rollback + session_info append.
 */

import type { AgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

import { AgentMessageType } from "../../../shared/agent-types.ts";
import { postMessageToHost, uid } from "../ipc.ts";

export interface TitleGeneratorDeps {
	getSession: () => AgentSession | null;
	getManager: () => ReturnType<typeof SessionManager.open> | null;
	getSessionId: () => string | null;
	/** Called when the title is finalized (e.g. update SessionHost.currentSessionName). */
	onTitle: (title: string) => void;
}

export class TitleGenerator {
	private deps: TitleGeneratorDeps;
	private generating = false;
	private leafBeforeTitle: string | null = null;
	private needsTitle = false;

	constructor(deps: TitleGeneratorDeps) {
		this.deps = deps;
	}

	get isGenerating(): boolean {
		return this.generating;
	}

	/** Mark that the next agent reply should trigger title generation. */
	arm(): void {
		this.needsTitle = true;
	}

	/** Returns true if title generation was armed and consumed. */
	consumeIfNeeded(): boolean {
		if (!this.needsTitle) return false;
		this.needsTitle = false;
		return true;
	}

	trigger(userText: string): void {
		this.needsTitle = false;
		const prompt = userText
			? `Generate a short title (5 words or fewer) for a conversation that starts with: "${userText.slice(0, 200)}". Reply with ONLY the title, no quotes, no explanation.`
			: "Generate a short title for this conversation. Reply with ONLY the title.";

		this.generating = true;
		this.leafBeforeTitle = this.deps.getManager()?.getLeafId() ?? null;

		this.deps
			.getSession()
			?.followUp(prompt)
			.catch((err) => {
				this.generating = false;
				console.error("[AgentHost] Title generation failed:", err);
			});
	}

	/** Called from handleAgentEnd when a title reply completes. */
	finalize(content: string): void {
		if (!this.generating) return;
		this.generating = false;

		const title = content.trim().replace(/^"|"$/g, "").slice(0, 50);
		const manager = this.deps.getManager();
		if (title && manager && this.leafBeforeTitle) {
			manager.branch(this.leafBeforeTitle);
			this.leafBeforeTitle = null;
			manager.appendSessionInfo(title);
			this.deps.onTitle(title);
			postMessageToHost({
				id: uid(),
				type: AgentMessageType.SessionRenamed,
				payload: {
					sessionId: this.deps.getSessionId() ?? "",
					name: title,
				},
			});
			console.log(`[AgentHost] Auto-titled session: "${title}"`);
		}
	}
}
