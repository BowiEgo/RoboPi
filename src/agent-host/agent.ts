/**
 * Agent management module.
 *   - Agent configuration (model, thinkingLevel).
 *   - Agent initialization.
 *
 * Encapsulated in the AgentHost class.
 */

import { ModelRuntime } from "@earendil-works/pi-coding-agent";

import { SessionHost } from "./session.ts";

// ============================================================================
// AgentHost
// ============================================================================

export class AgentHost {
	/** Mutable reference to the currently active model ID. */
	readonly modelRef = { value: undefined as string | undefined };

	/** Mutable reference to the current thinking level. */
	readonly thinkingLevelRef = {
		value: undefined as string | undefined,
	};

	/** The session host, available after initialize(). */
	sessionHost: SessionHost | null = null;

	private availableModels: string[] = [];

	getAvailableModels(): string[] {
		return this.availableModels;
	}

	// ---- Initialization ----

	async initialize(): Promise<void> {
		console.log("[AgentHost] Initializing Pi Agent SDK...");

		const modelRuntime = await ModelRuntime.create();

		if (process.env.ANTHROPIC_API_KEY) {
			modelRuntime.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API_KEY);
		}
		if (process.env.OPENAI_API_KEY) {
			modelRuntime.setRuntimeApiKey("openai", process.env.OPENAI_API_KEY);
		}

		const available = await modelRuntime.getAvailable();
		if (available.length === 0) {
			console.warn(
				"[AgentHost] No authenticated models available. " +
					"Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
			);
		} else {
			console.log(
				`[AgentHost] Available models: ${available.map((m) => m.id).join(", ")}`,
			);
		}

		this.availableModels = available.map((m) => m.id);

		const sessionHost = new SessionHost({
			modelRuntime,
			agentModelRef: this.modelRef,
			thinkingLevelRef: this.thinkingLevelRef,
		});
		await sessionHost.init();

		this.sessionHost = sessionHost;
	}
}
