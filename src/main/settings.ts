/**
 * Settings IPC handlers.
 *
 * Exposes config paths, API-key status, and model refresh to the renderer.
 * Credentials are stored in the SDK's auth.json format:
 *   { "<provider>": { "type": "api_key", "key": "..." } }
 */

import { readFile, writeFile } from "node:fs/promises";

import type { IpcMain } from "electron";

import { getAuthPath, getConfigDir, getSessionsDir } from "../backend/agent/config.ts";
import { type AgentMessage, AgentMessageType } from "../shared/agent-types.ts";
import { agentHostManager } from "./agent-host-manager";

interface Credential {
	type?: string;
	key?: string;
}

async function readCredentials(): Promise<Record<string, Credential>> {
	try {
		const raw = await readFile(getAuthPath(), "utf-8");
		return JSON.parse(raw) as Record<string, Credential>;
	} catch {
		return {};
	}
}

async function writeCredential(provider: string, apiKey: string): Promise<void> {
	const creds = await readCredentials();
	creds[provider] = { type: "api_key", key: apiKey };
	await writeFile(getAuthPath(), JSON.stringify(creds, null, 2), "utf-8");
}

function hasApiKey(cred?: Credential): boolean {
	return cred?.type === "api_key" && !!cred.key;
}

export function setupSettings(ipcMain: IpcMain): void {
	ipcMain.handle("settings:get", async () => {
		const creds = await readCredentials();
		const configuredProviders = Object.entries(creds)
			.filter(([, cred]) => hasApiKey(cred))
			.map(([id]) => ({ id, name: id }));
		return {
			configDir: getConfigDir(),
			sessionsDir: getSessionsDir(),
			hasAnthropic: hasApiKey(creds.anthropic),
			hasOpenAI: hasApiKey(creds.openai),
			availableModels: agentHostManager.getAvailableModels(),
			providerList: agentHostManager.getProviderList(),
			configuredProviders,
		};
	});

	ipcMain.handle(
		"settings:setApiKey",
		async (_e, { provider, apiKey }: { provider: string; apiKey: string }) => {
			await writeCredential(provider, apiKey);

			// Notify the agent host to set the key in-memory and refresh models.
			agentHostManager.send({
				id: `key-${Date.now()}`,
				type: AgentMessageType.ModelSetApiKey,
				payload: { provider, apiKey },
			} as AgentMessage);

			return { success: true };
		},
	);

	ipcMain.handle("settings:refreshModels", async () => {
		return new Promise<string[]>((resolve) => {
			const id = `refresh-${Date.now()}`;
			const handler = (msg: AgentMessage) => {
				if (msg.id === id && msg.type === AgentMessageType.ModelRefreshed) {
					agentHostManager.onMessage(handler);
					const payload = msg.payload as { models: string[] };
					resolve(payload.models ?? []);
				}
			};
			agentHostManager.onMessage(handler);
			agentHostManager.send({
				id,
				type: AgentMessageType.ModelRefresh,
				payload: { force: false },
			} as AgentMessage);
			setTimeout(() => resolve([]), 10000);
		});
	});
}
