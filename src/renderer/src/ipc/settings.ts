/**
 * Settings IPC bridge.
 *
 * Electron: window.api.invoke (main process handlers).
 * Web: HTTP fetch against the RoboPi web server (/api/settings/*).
 */

export interface SettingsInfo {
	configDir: string;
	sessionsDir: string;
	hasAnthropic: boolean;
	hasOpenAI: boolean;
	availableModels: string[];
	providerList: { id: string; name: string }[];
	configuredProviders: { id: string; name: string }[];
}

export async function getSettings(): Promise<SettingsInfo> {
	if (window.api) {
		return (await window.api.invoke("settings:get")) as SettingsInfo;
	}
	const res = await fetch("/api/settings");
	return (await res.json()) as SettingsInfo;
}

export async function setApiKey(provider: string, apiKey: string): Promise<{ success: boolean }> {
	if (window.api) {
		return (await window.api.invoke("settings:setApiKey", { provider, apiKey })) as {
			success: boolean;
		};
	}
	const res = await fetch("/api/settings/api-key", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ provider, apiKey }),
	});
	return (await res.json()) as { success: boolean };
}

export async function refreshModels(): Promise<string[]> {
	if (window.api) {
		return (await window.api.invoke("settings:refreshModels")) as string[];
	}
	const res = await fetch("/api/settings/refresh-models", { method: "POST" });
	return (await res.json()) as string[];
}
