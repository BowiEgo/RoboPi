/**
 * Agent management module.
 *   - Agent configuration (model, thinkingLevel).
 *   - Agent initialization.
 *
 * Encapsulated in the AgentHost class.
 */

import { ModelRuntime, SettingsManager } from "@earendil-works/pi-coding-agent";

import { getAuthPath, getModelsPath, getSettingsDir } from "./config.ts";
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
	private configuredModels: string[] = [];
	private providerList: { id: string; name: string }[] = [];
	private modelRuntime: Awaited<ReturnType<typeof ModelRuntime.create>> | null = null;

	getAvailableModels(): string[] {
		return this.availableModels;
	}

	getConfiguredModels(): string[] {
		return this.configuredModels;
	}

	getProviderList(): { id: string; name: string }[] {
		return this.providerList;
	}

	private async updateModelLists(): Promise<void> {
		if (!this.modelRuntime) return;
		const all = this.modelRuntime.getModels().map((m) => m.id);

		// Filter to only providers with API keys in credentials.json
		const fs = await import("node:fs/promises");
		const configuredProviders = new Set<string>();
		try {
			const { getAuthPath } = await import("./config.ts");
			const raw = await fs.readFile(getAuthPath(), "utf-8");
			const creds = JSON.parse(raw);
			for (const [provider, val] of Object.entries(creds)) {
				const c = val as any;
				if (c?.type === "api_key" && c?.key) configuredProviders.add(provider);
			}
		} catch {
			/* no credentials file yet */
		}

		this.configuredModels = all.filter((id) => {
			const provider = id.split("/")[0];
			return configuredProviders.has(provider);
		});
	}

	async refreshModels(force = false): Promise<void> {
		if (!this.modelRuntime) return;
		await this.modelRuntime.refresh({ allowNetwork: true, force });
		await this.updateModelLists();
	}

	async setApiKey(provider: string, apiKey: string): Promise<void> {
		if (!this.modelRuntime) return;
		await this.modelRuntime.setRuntimeApiKey(provider, apiKey);
		await this.refreshModels(true);
	}

	// ---- Initialization ----

	async initialize(): Promise<void> {
		console.log("[AgentHost] Initializing Pi Agent SDK...");

		const modelRuntime = await ModelRuntime.create({
			authPath: getAuthPath(),
			modelsPath: getModelsPath(),
			allowModelNetwork: true,
		});
		this.modelRuntime = modelRuntime;

		if (process.env.ANTHROPIC_API_KEY) {
			modelRuntime.setRuntimeApiKey("anthropic", process.env.ANTHROPIC_API_KEY);
		}
		if (process.env.OPENAI_API_KEY) {
			modelRuntime.setRuntimeApiKey("openai", process.env.OPENAI_API_KEY);
		}

		const available = await modelRuntime.getAvailable();
		this.configuredModels = available.map((m) => m.id);
		if (available.length === 0) {
			console.warn("[AgentHost] No authenticated models available. " + "Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
		} else {
			console.log(`[AgentHost] Available models: ${available.map((m) => m.id).join(", ")}`);
		}

		// Build canonical provider list from ModelRuntime (deduplicated by provider ID)
		const seenProviders = new Set<string>();
		this.providerList = [];
		for (const m of modelRuntime.getModels()) {
			if (!seenProviders.has(m.provider)) {
				seenProviders.add(m.provider);
				this.providerList.push({ id: m.provider, name: m.provider });
			}
		}

		const snapshotAll = modelRuntime.getModels().map((m) => m.id);
		const authenticated = available.map((m) => m.id);
		this.availableModels = [...new Set([...authenticated, ...snapshotAll])];
		await this.updateModelLists();

		// Shared SettingsManager — created once, used by all sessions
		const settingsManager = SettingsManager.create(process.cwd(), getSettingsDir(), {
			projectTrusted: true,
		});

		// Restore persisted model & thinking level from settings.json
		const savedModel = settingsManager.getDefaultModel();
		const savedProvider = settingsManager.getDefaultProvider();
		if (savedModel && savedProvider) {
			this.modelRef.value = `${savedProvider}/${savedModel}`;
		} else if (savedModel) {
			this.modelRef.value = savedModel;
		}
		const savedThinking = settingsManager.getDefaultThinkingLevel();
		if (savedThinking) this.thinkingLevelRef.value = savedThinking;

		const sessionHost = new SessionHost({
			modelRuntime,
			agentModelRef: this.modelRef,
			thinkingLevelRef: this.thinkingLevelRef,
			settingsManager,
		});
		await sessionHost.init();

		this.sessionHost = sessionHost;
	}
}
